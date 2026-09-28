using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace HexoraIT.Tests.Integration;

public sealed class SecurityPipelineTests
{
    [Theory]
    [InlineData("/api/incidents", 5)]
    [InlineData("/api/knowledge", 6)]
    [InlineData("/api/licenses", 6)]
    [InlineData("/api/plans", 5)]
    public void ContentMinimalApis_RegisterEveryOperationAsAuthorizedEndpoint(string routePrefix, int expectedCount)
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith(routePrefix, StringComparison.Ordinal) == true)
            .ToList();

        endpoints.Should().HaveCount(expectedCount);
        endpoints.Should().AllSatisfy(endpoint =>
            endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Theory]
    [InlineData("/api/projects", 5)]
    [InlineData("/api/tasks", 5)]
    [InlineData("/api/subnets", 8)]
    public void ProjectTaskAndSubnetMinimalApis_AuthorizeEveryOperation(string routePrefix, int expectedCount)
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith(routePrefix, StringComparison.Ordinal) == true)
            .ToList();
        endpoints.Should().HaveCount(expectedCount);
        endpoints.Should().AllSatisfy(endpoint => endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Theory]
    [InlineData("/api/organizations/{organizationId:guid}/private-notes", 4)]
    [InlineData("/api/dashboard-layout", 3)]
    [InlineData("/api/diagram", 2)]
    public void PersonalizationAndDiagramMinimalApis_AuthorizeEveryOperation(string routePrefix, int expectedCount)
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith(routePrefix, StringComparison.Ordinal) == true)
            .ToList();
        endpoints.Should().HaveCount(expectedCount);
        endpoints.Should().AllSatisfy(endpoint => endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Theory]
    [InlineData("/api/passwords", 6)]
    [InlineData("/api/contracts", 8)]
    [InlineData("/api/warranties", 8)]
    public void SensitiveAndDocumentMinimalApis_AuthorizeEveryOperation(string routePrefix, int expectedCount)
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith(routePrefix, StringComparison.Ordinal) == true).ToList();
        endpoints.Should().HaveCount(expectedCount);
        endpoints.Should().AllSatisfy(endpoint => endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Fact]
    public void FileExplorerMinimalApi_AuthorizesAllOperationsAndKeepsUploadLimit()
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith("/api/files", StringComparison.Ordinal) == true).ToList();
        endpoints.Should().HaveCount(12);
        endpoints.Should().AllSatisfy(endpoint => endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
        endpoints.Single(endpoint => endpoint.RoutePattern.RawText == "/api/files/upload")
            .Metadata.GetMetadata<Microsoft.AspNetCore.Http.Metadata.IRequestSizeLimitMetadata>()?.MaxRequestBodySize
            .Should().Be(100_000_000);
    }

    [Fact]
    public void AdminMinimalApi_RequiresAdminPolicyOnEveryOperation()
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith("/api/admin", StringComparison.Ordinal) == true).ToList();
        endpoints.Should().HaveCount(7);
        endpoints.Should().AllSatisfy(endpoint =>
            endpoint.Metadata.GetOrderedMetadata<IAuthorizeData>().Should().Contain(item => item.Policy == "AdminOnly"));
    }

    [Fact]
    public void ClientReportMinimalApi_RequiresAuthorization()
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoint = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Single(item => item.RoutePattern.RawText == "/api/organizations/{organizationId:guid}/reports");
        endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull();
    }

    [Fact]
    public void OrganizationMinimalApi_AuthorizesEveryOperation()
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith("/api/organizations", StringComparison.Ordinal) == true &&
                endpoint.RoutePattern.RawText != "/api/organizations/{organizationId:guid}/reports" &&
                !endpoint.RoutePattern.RawText!.Contains("/private-notes") &&
                !endpoint.RoutePattern.RawText!.Contains("/roles") && !endpoint.RoutePattern.RawText.Contains("/permissions") &&
                !endpoint.RoutePattern.RawText.Contains("/clients") && !endpoint.RoutePattern.RawText.Contains("/role-resources") &&
                !endpoint.RoutePattern.RawText.EndsWith("/role", StringComparison.Ordinal))
            .ToList();
        endpoints.Should().HaveCount(10);
        endpoints.Should().AllSatisfy(endpoint => endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Fact]
    public void OrganizationRoleMinimalApi_AuthorizesEveryOperation()
    {
        using var factory = new SecurityWebApplicationFactory();
        var prefix = "/api/organizations/{organizationId:guid}";
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints.OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText is { } route && route.StartsWith(prefix, StringComparison.Ordinal) &&
                (route == $"{prefix}/permissions" || route.Contains("/roles", StringComparison.Ordinal) ||
                 route.Contains("/role-resources/", StringComparison.Ordinal) || route.Contains("/clients", StringComparison.Ordinal) ||
                 route.EndsWith("/role", StringComparison.Ordinal)))
            .ToList();
        endpoints.Should().HaveCount(12);
        endpoints.Should().AllSatisfy(endpoint => endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Fact]
    public void GroupMinimalApi_RegistersAllOperationsAsAuthorizedEndpoints()
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints
            .OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith("/api/groups", StringComparison.Ordinal) == true)
            .ToList();

        endpoints.Should().HaveCount(5);
        endpoints.SelectMany(endpoint =>
                endpoint.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods ?? [])
            .Should().BeEquivalentTo(new[] { "GET", "GET", "POST", "PUT", "DELETE" });
        endpoints.Should().AllSatisfy(endpoint =>
            endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Fact]
    public void ContactMinimalApi_RegistersAllOperationsAsAuthorizedEndpoints()
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints
            .OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith("/api/contacts", StringComparison.Ordinal) == true)
            .ToList();

        endpoints.Should().HaveCount(6);
        endpoints.SelectMany(endpoint =>
                endpoint.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods ?? [])
            .Should().BeEquivalentTo(new[] { "GET", "GET", "POST", "PUT", "DELETE", "PATCH" });
        endpoints.Should().AllSatisfy(endpoint =>
            endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Fact]
    public void AssetMinimalApi_RegistersAllOperationsAsAuthorizedEndpoints()
    {
        using var factory = new SecurityWebApplicationFactory();
        var endpoints = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints
            .OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith("/api/assets", StringComparison.Ordinal) == true)
            .ToList();

        endpoints.Should().HaveCount(6);
        endpoints.SelectMany(endpoint =>
                endpoint.Metadata.GetMetadata<Microsoft.AspNetCore.Routing.HttpMethodMetadata>()?.HttpMethods ?? [])
            .Should().BeEquivalentTo(new[] { "GET", "GET", "POST", "PUT", "DELETE", "PATCH" });
        endpoints.Should().AllSatisfy(endpoint =>
            endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Fact]
    public void AuthMinimalApi_RegistersEveryRouteWithRequiredSecurityMetadata()
    {
        using var factory = new SecurityWebApplicationFactory();
        var routes = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints
            .OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Where(endpoint => endpoint.RoutePattern.RawText?.StartsWith("/api/auth", StringComparison.Ordinal) == true)
            .ToList();

        routes.Should().HaveCount(6);
        routes.Select(endpoint => endpoint.RoutePattern.RawText).Distinct().Should().BeEquivalentTo(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/switch-org",
            "/api/auth/me",
            "/api/auth/change-password");
        routes.Single(endpoint => endpoint.RoutePattern.RawText == "/api/auth/register")
            .Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName
            .Should().Be("authentication");
        routes.Single(endpoint => endpoint.RoutePattern.RawText == "/api/auth/login")
            .Metadata.GetMetadata<EnableRateLimitingAttribute>()?.PolicyName
            .Should().Be("authentication");
        routes.Where(endpoint => endpoint.RoutePattern.RawText is
                "/api/auth/me" or "/api/auth/switch-org" or "/api/auth/change-password")
            .Should().AllSatisfy(endpoint =>
                endpoint.Metadata.GetMetadata<IAuthorizeData>().Should().NotBeNull());
    }

    [Fact]
    public async Task VersionMinimalApi_PreservesThePublicContract()
    {
        using var factory = new SecurityWebApplicationFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var response = await client.GetAsync("/api/version");
        var configuredVersion = factory.Services.GetRequiredService<IOptions<HexoraITApi.Domain.AppSettings>>()
            .Value.CurrentVersion;

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
        (await response.Content.ReadFromJsonAsync<string>()).Should().Be(configuredVersion);

        var routes = factory.Services.GetRequiredService<Microsoft.AspNetCore.Routing.EndpointDataSource>()
            .Endpoints
            .OfType<Microsoft.AspNetCore.Routing.RouteEndpoint>()
            .Select(endpoint => endpoint.RoutePattern.RawText);
        routes.Should().Contain("/api/version/latest");
    }

    [Fact]
    public void ForwardedHeaders_DoNotTrustAnyProxyByDefault()
    {
        using var factory = new SecurityWebApplicationFactory();

        var options = factory.Services.GetRequiredService<IOptions<ForwardedHeadersOptions>>().Value;

        options.ForwardLimit.Should().Be(1);
        options.ForwardedHeaders.Should().Be(ForwardedHeaders.None);
        options.KnownProxies.Should().BeEmpty();
        options.KnownIPNetworks.Should().BeEmpty();
    }

    [Fact]
    public async Task AuthenticationEndpoints_RejectInvalidLengthsBeforeActionExecution()
    {
        using var factory = new SecurityWebApplicationFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        var login = await client.PostAsJsonAsync("/api/auth/login", new
        {
            email = "person@example.test",
            password = new string('x', 201)
        });
        var registration = await client.PostAsJsonAsync("/api/auth/register", new
        {
            email = "person@example.test",
            password = new string('x', 14),
            displayName = "Person"
        });

        login.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        registration.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        login.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
        using var problem = JsonDocument.Parse(await login.Content.ReadAsStringAsync());
        problem.RootElement.GetProperty("errors").TryGetProperty("Password", out _).Should().BeTrue();
    }

    [Fact]
    public async Task DiagramEndpoint_RejectsOversizedNodeCollection()
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User
        {
            Email = "diagram-limit@test.local",
            DisplayName = "Diagram Limit",
            PasswordHash = [1],
            PasswordSalt = [1]
        };
        var organization = new Organization { Name = "Limits" };
        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.AddRange(user, organization);
            db.UserOrganizations.Add(new UserOrganization
            {
                UserId = user.Id,
                OrganizationId = organization.Id,
                Role = OrgRole.Owner
            });
            await db.SaveChangesAsync();
            token = scope.ServiceProvider.GetRequiredService<IJwtTokenService>()
                .CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var nodes = Enumerable.Range(0, 2001).Select(index => new
        {
            id = Guid.NewGuid(),
            deviceType = "server",
            label = $"Node {index}",
            assetId = (Guid?)null,
            x = 0,
            y = 0,
            color = (string?)null,
            ip = (string?)null
        });

        var response = await client.PutAsJsonAsync(
            $"/api/diagram?organizationId={organization.Id}", new { nodes, edges = Array.Empty<object>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
    }

    [Fact]
    public async Task AssetEndpoint_RejectsOversizedTagsBeforeDatabaseWrite()
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User
        {
            Email = "asset-limit@test.local",
            DisplayName = "Asset Limit",
            PasswordHash = [1],
            PasswordSalt = [1]
        };
        var organization = new Organization { Name = "Asset Limits" };
        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.AddRange(user, organization);
            db.UserOrganizations.Add(new UserOrganization
            {
                UserId = user.Id,
                OrganizationId = organization.Id,
                Role = OrgRole.Owner
            });
            await db.SaveChangesAsync();
            token = scope.ServiceProvider.GetRequiredService<IJwtTokenService>()
                .CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var response = await client.PostAsJsonAsync($"/api/assets?organizationId={organization.Id}", new
        {
            name = "Bounded asset",
            type = 0,
            status = 0,
            location = "",
            owner = "",
            ip = "",
            tags = Enumerable.Range(0, 101).Select(index => $"tag-{index}"),
            notes = "",
            serial = (string?)null
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
        using var verificationScope = factory.Services.CreateScope();
        (await verificationScope.ServiceProvider.GetRequiredService<AppDbContext>().Assets.CountAsync())
            .Should().Be(0);
    }

    [Fact]
    public async Task AssetEndpoint_ReturnsStableBoundedPagesWithMetadata()
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User
        {
            Email = "asset-pages@test.local",
            DisplayName = "Asset Pages",
            PasswordHash = [1],
            PasswordSalt = [1]
        };
        var organization = new Organization { Name = "Paged Assets" };
        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.AddRange(user, organization);
            db.UserOrganizations.Add(new UserOrganization
            {
                UserId = user.Id,
                OrganizationId = organization.Id,
                Role = OrgRole.Owner
            });
            db.Assets.AddRange(Enumerable.Range(1, 205).Select(index => new Asset
            {
                OrganizationId = organization.Id,
                Name = $"Asset {index:D3}",
                Type = AssetType.Server,
                Status = AssetStatus.Online
            }));
            await db.SaveChangesAsync();
            token = scope.ServiceProvider.GetRequiredService<IJwtTokenService>()
                .CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var legacyResponse = await client.GetAsync($"/api/assets?organizationId={organization.Id}");
        var firstResponse = await client.GetAsync(
            $"/api/assets?organizationId={organization.Id}&page=1&pageSize=200");
        var secondResponse = await client.GetAsync(
            $"/api/assets?organizationId={organization.Id}&page=2&pageSize=200");
        var incompleteResponse = await client.GetAsync(
            $"/api/assets?organizationId={organization.Id}&page=1");
        var oversizedResponse = await client.GetAsync(
            $"/api/assets?organizationId={organization.Id}&page=1&pageSize=201");
        var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        jsonOptions.Converters.Add(new JsonStringEnumConverter());
        var legacy = await legacyResponse.Content.ReadFromJsonAsync<List<AssetDto>>(jsonOptions);
        var first = await firstResponse.Content.ReadFromJsonAsync<List<AssetDto>>(jsonOptions);
        var second = await secondResponse.Content.ReadFromJsonAsync<List<AssetDto>>(jsonOptions);

        legacyResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        firstResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        secondResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        incompleteResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        oversizedResponse.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        oversizedResponse.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
        legacy.Should().HaveCount(205);
        first.Should().HaveCount(200);
        second.Should().HaveCount(5);
        first!.Select(asset => asset.Id).Intersect(second!.Select(asset => asset.Id)).Should().BeEmpty();
        firstResponse.Headers.GetValues("X-Total-Count").Single().Should().Be("205");
        firstResponse.Headers.GetValues("X-Page-Size").Single().Should().Be("200");
        legacyResponse.Headers.GetValues("X-Page-Size").Single().Should().Be("1000");
    }

    [Fact]
    public async Task IssuedToken_IsRejectedAfterSecurityStampChanges()
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User
        {
            Email = "pipeline@test.local",
            DisplayName = "Pipeline User",
            PasswordHash = [1],
            PasswordSalt = [1]
        };
        string token;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.Users.Add(user);
            await db.SaveChangesAsync();
            token = scope.ServiceProvider.GetRequiredService<IJwtTokenService>()
                .CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        (await client.GetAsync("/api/auth/me")).StatusCode.Should().Be(HttpStatusCode.OK);

        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var storedUser = await db.Users.FindAsync(user.Id);
            storedUser!.SecurityStamp = Guid.NewGuid();
            await db.SaveChangesAsync();
        }

        var rejected = await client.GetAsync("/api/auth/me");
        rejected.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        rejected.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
    }

    [Fact]
    public async Task LoginRateLimit_ReturnsProblemDetailsAndSecurityHeaders()
    {
        using var factory = new SecurityWebApplicationFactory();
        using (var scope = factory.Services.CreateScope())
            await scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.EnsureCreatedAsync();

        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost")
        });

        HttpResponseMessage? response = null;
        for (var attempt = 0; attempt < 11; attempt++)
            response = await client.PostAsJsonAsync("/api/auth/login", new { email = "missing@test.local", password = "wrong" });

        response!.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/problem+json");
        response.Headers.GetValues("X-Correlation-ID").Single().Should().NotBeNullOrWhiteSpace();
        response.Headers.GetValues("X-Content-Type-Options").Single().Should().Be("nosniff");
        response.Headers.GetValues("X-Frame-Options").Single().Should().Be("DENY");
        response.Headers.GetValues("Referrer-Policy").Single().Should().Be("no-referrer");
        response.Headers.GetValues("Content-Security-Policy").Single().Should().Contain("frame-ancestors 'none'");
    }
}
