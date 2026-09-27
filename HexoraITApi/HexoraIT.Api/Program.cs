using System.Diagnostics;
using System.Net;
using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using HexoraITApi.Api.App;
using HexoraITApi.Api.Administrator;
using HexoraITApi.Api.Auth;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Application;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.DataProtection.AuthenticatedEncryption;
using Microsoft.AspNetCore.DataProtection.AuthenticatedEncryption.ConfigurationModel;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAutoMapper(cfg => cfg.AddProfile<AppMappingProfile>());

builder.Services.AddScoped<IAppInitializer, AppInitializer>();
builder.Services.AddHttpContextAccessor();

builder.Services.AddSingleton<IPasswordCipher, DataProtectionPasswordCipher>();
var dataProtectionKeysPath = builder.Configuration["FileStorage:DataProtectionKeysPath"] ?? 
                             throw new InvalidOperationException("FileStorage:DataProtectionKeysPath is not configured.");
builder.Services.AddDataProtection()
    .SetApplicationName("HexoraITApi")
    .PersistKeysToFileSystem(new DirectoryInfo(dataProtectionKeysPath))
    .UnprotectKeysWithAnyCertificate()
    .UseCryptographicAlgorithms(new AuthenticatedEncryptorConfiguration
    {
        EncryptionAlgorithm = EncryptionAlgorithm.AES_256_CBC,
        ValidationAlgorithm = ValidationAlgorithm.HMACSHA256
    });;

builder.Services.AddScoped<IFileStorage, LocalFileStorage>();
builder.Services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAssetService, AssetService>();
builder.Services.AddScoped<IContactService, ContactService>();
builder.Services.AddScoped<IGroupService, GroupService>();
builder.Services.AddScoped<IIncidentService, IncidentService>();
builder.Services.AddScoped<IKnowledgeService, KnowledgeService>();
builder.Services.AddScoped<ILicenseService, LicenseService>();
builder.Services.AddScoped<IPlanService, PlanService>();
builder.Services.AddScoped<IProjectService, ProjectService>();
builder.Services.AddScoped<IWorkTaskService, WorkTaskService>();
builder.Services.AddScoped<ISubnetService, SubnetService>();
builder.Services.AddScoped<IPrivateNoteService, PrivateNoteService>();
builder.Services.AddScoped<IDashboardLayoutService, DashboardLayoutService>();
builder.Services.AddScoped<IDiagramService, DiagramService>();
builder.Services.AddScoped<IPasswordVaultService, PasswordVaultService>();
builder.Services.AddScoped<IContractService, ContractService>();
builder.Services.AddScoped<IWarrantyService, WarrantyService>();
builder.Services.AddScoped<IFileExplorerService, FileExplorerService>();
builder.Services.AddScoped<IClientReportService, ClientReportService>();
builder.Services.AddScoped<IAdminUserService, AdminUserService>();
builder.Services.AddScoped<IOrganizationService, OrganizationService>();
builder.Services.AddScoped<IOrganizationRoleService, OrganizationRoleService>();
builder.Services.AddSingleton<ISecurityAuditLogger, SecurityAuditLogger>();
builder.Services.AddScoped<ICurrentUserIdProvider, HttpCurrentUserIdProvider>();
builder.Services.AddScoped<ICurrentUserContext, DbCurrentUserContext>();

builder.Services.Configure<AppSettings>(
    builder.Configuration.GetSection("AppSettings"));

builder.Services.AddScoped<GitHubVersionService>();
builder.Services.AddHttpClient<GitHubVersionService>(client =>
{
    client.DefaultRequestHeaders.UserAgent.ParseAdd("HexoraIT");
});

builder.Services.AddMemoryCache();
builder.Services.AddProblemDetails(options =>
{
    options.CustomizeProblemDetails = context =>
    {
        context.ProblemDetails.Extensions["traceId"] =
            Activity.Current?.Id ?? context.HttpContext.TraceIdentifier;
    };
});
var trustedProxyAddresses = builder.Configuration
    .GetSection("ReverseProxy:KnownProxies")
    .Get<string[]>() ?? [];
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
    foreach (var configuredAddress in trustedProxyAddresses)
    {
        if (!IPAddress.TryParse(configuredAddress, out var address))
            throw new InvalidOperationException($"ReverseProxy:KnownProxies contains invalid IP address '{configuredAddress}'.");

        options.KnownProxies.Add(address);
    }
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("authentication", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.MapInboundClaims = false;
        var jwt = builder.Configuration.GetSection("Jwt");
        var jwtSigningKey = jwt["SigningKey"]!;

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey))
        };
        opt.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var subject = context.Principal?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
                var stampValue = context.Principal?.FindFirst("security_stamp")?.Value;
                var roleValue = context.Principal?.FindFirst("sys_role")?.Value;
                if (!Guid.TryParse(subject, out var userId) || !Guid.TryParse(stampValue, out var securityStamp))
                {
                    context.Fail("The access token is missing required session claims.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var currentUser = await db.Users.AsNoTracking()
                    .Where(user => user.Id == userId)
                    .Select(user => new { user.IsActive, user.IsBlocked, user.SystemRole, user.SecurityStamp })
                    .SingleOrDefaultAsync(context.HttpContext.RequestAborted);

                if (currentUser is null || !currentUser.IsActive || currentUser.IsBlocked ||
                    currentUser.SecurityStamp != securityStamp ||
                    !string.Equals(currentUser.SystemRole.ToString(), roleValue, StringComparison.Ordinal))
                {
                    context.Fail("The access token is no longer valid.");
                }
            }
        };
    });
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireClaim("sys_role", nameof(SystemRole.Admin)));
});

var appSettings =
    builder.Configuration
        .GetSection("AppSettings")
        .Get<AppSettings>();

if (appSettings?.AllowOrigins is null || appSettings.AllowOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "No CORS origins configured.");
}

builder.Services.AddCors(opt =>
{
    opt.AddPolicy("Frontend", p => p
        .WithOrigins(appSettings.AllowOrigins)
        .AllowAnyHeader()
        .AllowAnyMethod()
        .WithExposedHeaders("X-Total-Count", "X-Page", "X-Page-Size", "X-Result-Capped")
        .AllowCredentials());
});

builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();
ValidateStartupConfiguration(app.Configuration);

app.UseForwardedHeaders();

using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<IAppInitializer>();
    await initializer.InitializeAsync();
}

if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing"))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseExceptionHandler();
app.UseStatusCodePages();

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Correlation-ID"] = context.TraceIdentifier;
    context.Response.OnStarting(() =>
    {
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["X-Frame-Options"] = "DENY";
        context.Response.Headers["Cache-Control"] = "no-store";
        if (!app.Environment.IsDevelopment())
        {
            context.Response.Headers["Content-Security-Policy"] =
                "default-src 'none'; frame-ancestors 'none'; base-uri 'none'";
        }

        return Task.CompletedTask;
    });
    await next();
});

if (!app.Environment.IsDevelopment())
    app.UseHsts();

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.Use(async (context, next) =>
{
    await next();
    if (context.Response.StatusCode is StatusCodes.Status401Unauthorized or
        StatusCodes.Status403Forbidden or StatusCodes.Status429TooManyRequests)
    {
        var subject = context.User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        var userId = Guid.TryParse(subject, out var parsedUserId) ? parsedUserId : (Guid?)null;
        context.RequestServices.GetRequiredService<ISecurityAuditLogger>().RequestRejected(
            context.Response.StatusCode,
            context.Request.Method,
            context.Request.Path.Value ?? "/",
            userId,
            context.TraceIdentifier,
            context.Connection.RemoteIpAddress?.ToString());
    }
});
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapVersionEndpoints();
app.MapAuthEndpoints();
app.MapAssetEndpoints();
app.MapContactEndpoints();
app.MapGroupEndpoints();
app.MapIncidentEndpoints();
app.MapKnowledgeEndpoints();
app.MapLicenseEndpoints();
app.MapPlanEndpoints();
app.MapProjectEndpoints();
app.MapWorkTaskEndpoints();
app.MapSubnetEndpoints();
app.MapPrivateNoteEndpoints();
app.MapDashboardLayoutEndpoints();
app.MapDiagramEndpoints();
app.MapPasswordEndpoints();
app.MapContractEndpoints();
app.MapWarrantyEndpoints();
app.MapFileExplorerEndpoints();
app.MapClientReportEndpoints();
app.MapAdminEndpoints();
app.MapOrganizationEndpoints();
app.MapOrganizationRoleEndpoints();

app.Run();

static void ValidateStartupConfiguration(IConfiguration configuration)
{
    if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Default")))
        throw new InvalidOperationException("ConnectionStrings:Default is not configured.");

    var jwt = configuration.GetSection("Jwt");
    if (string.IsNullOrWhiteSpace(jwt["Issuer"]) || string.IsNullOrWhiteSpace(jwt["Audience"]))
        throw new InvalidOperationException("Jwt:Issuer and Jwt:Audience must be configured.");

    var signingKey = jwt["SigningKey"];
    if (string.IsNullOrWhiteSpace(signingKey) || Encoding.UTF8.GetByteCount(signingKey) < 32)
        throw new InvalidOperationException("Jwt:SigningKey must be configured with at least 32 bytes of secret material.");
}

public partial class Program;
