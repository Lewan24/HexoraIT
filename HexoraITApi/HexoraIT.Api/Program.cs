using System.Text;
using System.Text.Json.Serialization;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Application;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddAutoMapper(cfg => cfg.AddProfile<AppMappingProfile>());

builder.Services.AddScoped<AppInitializer>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IPasswordCipher, DataProtectionPasswordCipher>();
builder.Services.AddDataProtection(); // required by the cipher above
builder.Services.AddScoped<IFileStorage, LocalFileStorage>();
builder.Services.AddScoped<IPasswordHasher, Pbkdf2PasswordHasher>();
builder.Services.AddScoped<IJwtTokenService, JwtTokenService>();
builder.Services.AddScoped<ICurrentUserIdProvider, HttpCurrentUserIdProvider>();
builder.Services.AddScoped<ICurrentUserContext, DbCurrentUserContext>();

builder.Services.Configure<AppSettings>(
    builder.Configuration.GetSection("AppSettings"));

var jwt = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.MapInboundClaims = false;

        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["SigningKey"]!))
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
        .AllowCredentials());
});

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var initializer = scope.ServiceProvider.GetRequiredService<AppInitializer>();
    await initializer.InitializeAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("Frontend");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();