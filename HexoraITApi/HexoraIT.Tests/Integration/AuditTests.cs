using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace HexoraIT.Tests.Integration;

public sealed class AuditTests
{
    private static async Task<string> Initialize(SecurityWebApplicationFactory factory, SystemRole role = SystemRole.Admin)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var (hash, salt) = hasher.Hash("a-secure-test-password");
        var user = new User { Email = "audit@example.test", DisplayName = "Auditor", SystemRole = role, PasswordHash = hash, PasswordSalt = salt };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return scope.ServiceProvider.GetRequiredService<IJwtTokenService>().CreateToken(user.Id, user.Email, role, user.SecurityStamp);
    }
    private static HttpClient Client(WebApplicationFactory<Program> factory) => factory.CreateClient(new() { BaseAddress = new Uri("https://localhost"), AllowAutoRedirect = false });

    [Fact]
    public async Task Records404WithoutSecretsAndRestrictsAuditToAdmins()
    {
        using var factory = new SecurityWebApplicationFactory();
        var token = await Initialize(factory, SystemRole.User);
        using var client = Client(factory);
        var response = await client.GetAsync("/api/missing?password=secret&token=secret");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.GetAsync("/api/admin/audit")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        (await client.GetAsync("/api/admin/audit")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        using var scope = factory.Services.CreateScope();
        var events = await scope.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents.AsNoTracking().ToListAsync();
        events.Should().Contain(a => a.Path == "/api/missing" && a.EventType == "route_not_found" && a.StatusCode == 404);
        System.Text.Json.JsonSerializer.Serialize(events).Should().NotContain("secret");
    }

    [Fact]
    public async Task FailedLoginLinksTargetAccountAndAdminCanFilterAndReadDetails()
    {
        using var factory = new SecurityWebApplicationFactory();
        var token = await Initialize(factory);
        using var client = Client(factory);
        (await client.PostAsJsonAsync("/api/auth/login", new { email = "audit@example.test", password = "incorrect-password" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var result = await client.GetFromJsonAsync<Page>("/api/admin/audit?eventType=authentication_failed&account=audit%40example.test&page=1&pageSize=1");
        result!.Total.Should().Be(1);
        result.Items.Single().TargetUserId.Should().NotBeNull();
        result.Items.Single().UserId.Should().BeNull();
        (await client.GetAsync($"/api/admin/audit/{result.Items[0].Id}")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetAsync("/api/admin/audit?page=0")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetAsync("/api/admin/audit?ip=invalid")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetAsync("/api/admin/audit?pageSize=1000")).StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task ResolvesOnlyTrustedProxyAndPreservesPeer(bool trusted)
    {
        using var root = new SecurityWebApplicationFactory();
        using var factory = root.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.AddSingleton<IStartupFilter, PeerFilter>();
            services.PostConfigure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
                options.KnownProxies.Add(IPAddress.Parse(trusted ? "10.20.0.2" : "10.20.0.9"));
            });
        }));
        using (var scope = factory.Services.CreateScope()) await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreatedAsync();
        using var client = Client(factory);
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.100.45");
        await client.GetAsync("/api/proxy-check");
        using var read = factory.Services.CreateScope();
        var entry = await read.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents.SingleAsync(a => a.Path == "/api/proxy-check");
        entry.ClientIp.Should().Be(trusted ? "198.51.100.45" : "10.20.0.2");
        entry.PeerIp.Should().Be("10.20.0.2");
    }

    [Fact]
    public async Task BrowserReportsAreUnverifiedAndCannotSupplyIdentity()
    {
        using var factory = new SecurityWebApplicationFactory();
        await Initialize(factory);
        using var client = Client(factory);
        (await client.PostAsJsonAsync("/api/audit/client", new { eventType = "client_not_found", path = "/missing?token=secret", clientIp = "1.2.3.4", userId = Guid.NewGuid() })).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await client.PostAsJsonAsync("/api/audit/client", new { eventType = "authentication_succeeded", path = "/" })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var scope = factory.Services.CreateScope();
        var entry = await scope.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents.SingleAsync(a => a.Source == "client");
        entry.UserId.Should().BeNull(); entry.ClientIp.Should().NotBe("1.2.3.4");
        entry.Path.Should().Be("/missing"); entry.Signal.Should().Be("unverified_client_report");
    }
    [Fact]
    public async Task TrustedNetworkResolvesTwoHopsAndIgnoresSpoofedLeftmostAddress()
    {
        using var root = new SecurityWebApplicationFactory();
        using var factory = root.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.AddSingleton<IStartupFilter, PeerFilter>();
            services.PostConfigure<ForwardedHeadersOptions>(options =>
            {
                options.ForwardedHeaders = ForwardedHeaders.XForwardedFor;
                options.ForwardLimit = 2;
                options.KnownIPNetworks.Add(System.Net.IPNetwork.Parse("10.20.0.0/29"));
            });
        }));
        using (var scope = factory.Services.CreateScope()) await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreatedAsync();
        using var client = Client(factory);
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "1.2.3.4, 198.51.100.45, 10.20.0.3");
        await client.GetAsync("/api/multi-hop");
        using var read = factory.Services.CreateScope();
        var entry = await read.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents.SingleAsync(a => a.Path == "/api/multi-hop");
        entry.ClientIp.Should().Be("198.51.100.45");
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task FrontendProxyChain_RestoresHttpsAndClientOnlyForTrustedNpm(bool trustNpm)
    {
        using var root = new SecurityWebApplicationFactory();
        using var factory = root.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, configuration) => configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ReverseProxy:ForwardLimit"] = "2",
                ["ReverseProxy:KnownProxies:0"] = "10.20.0.2",
                ["ReverseProxy:KnownProxies:1"] = trustNpm ? "10.20.0.3" : "10.20.0.9"
            }));
            builder.ConfigureServices(services =>
            {
                services.AddSingleton<IStartupFilter, PeerFilter>();
                services.Configure<Microsoft.AspNetCore.HttpsPolicy.HttpsRedirectionOptions>(options => options.HttpsPort = 443);
            });
        });
        using (var scope = factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreatedAsync();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("http://localhost"), AllowAutoRedirect = false });
        // NPM appends the real browser address; frontend appends the NPM address
        // and its HTTP hop. A browser-supplied leftmost IP must never be used.
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "1.2.3.4, 198.51.100.45, 10.20.0.3");
        client.DefaultRequestHeaders.Add("X-Forwarded-Proto", "https, http");
        var response = await client.GetAsync("/api/frontend-proxy-check");
        response.StatusCode.Should().Be(trustNpm ? HttpStatusCode.NotFound : HttpStatusCode.TemporaryRedirect);
        using var read = factory.Services.CreateScope();
        var entry = await read.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents.SingleAsync(a => a.Path == "/api/frontend-proxy-check");
        entry.ClientIp.Should().Be(trustNpm ? "198.51.100.45" : "10.20.0.3");
        entry.PeerIp.Should().Be("10.20.0.2");
    }

    [Fact]
    public async Task RateLimitsArePersisted()
    {
        using var factory = new SecurityWebApplicationFactory();
        await Initialize(factory);
        using var client = Client(factory);
        for (var i = 0; i < 11; i++) await client.PostAsJsonAsync("/api/auth/login", new { email = "missing@example.test", password = "incorrect-password" });
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.AuditEvents.AnyAsync(a => a.StatusCode == 429 && a.EventType == "rate_limited")).Should().BeTrue();
    }

    [Fact]
    public async Task HttpsRedirectIsRecordedWithoutQuerySecrets()
    {
        using var root = new SecurityWebApplicationFactory();
        using var factory = root.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.Configure<Microsoft.AspNetCore.HttpsPolicy.HttpsRedirectionOptions>(options => options.HttpsPort = 443)));
        using (var scope = factory.Services.CreateScope()) await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreatedAsync();
        using var client = factory.CreateClient(new() { BaseAddress = new Uri("http://localhost"), AllowAutoRedirect = false });
        (await client.GetAsync("/api/redirect-test?token=secret")).StatusCode.Should().Be(HttpStatusCode.TemporaryRedirect);
        using var read = factory.Services.CreateScope();
        var entry = await read.ServiceProvider.GetRequiredService<AppDbContext>().AuditEvents.SingleAsync();
        entry.EventType.Should().Be("redirect"); entry.RedirectPath.Should().Be("/api/redirect-test");
        System.Text.Json.JsonSerializer.Serialize(entry).Should().NotContain("secret");
    }

    private sealed record Page(List<AuditEvent> Items, int Total);
    private sealed class PeerFilter : IStartupFilter
    {
        public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next) => app =>
        {
            app.Use(async (context, continuation) => { context.Connection.RemoteIpAddress = IPAddress.Parse("10.20.0.2"); await continuation(); });
            next(app);
        };
    }
}
