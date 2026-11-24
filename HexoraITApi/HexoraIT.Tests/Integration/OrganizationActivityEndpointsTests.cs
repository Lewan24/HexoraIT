using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HexoraIT.Tests.Integration;

public sealed class OrganizationActivityEndpointsTests
{
    [Fact]
    public async Task OwnersAndAdminsCanReadSetRetentionAndExportOnlyTheirOrganizations()
    {
        using var factory = new SecurityWebApplicationFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var org = new Organization { Name = "Activity test" };
        var other = new Organization { Name = "Other organization" };
        var tokens = new Dictionary<OrgRole, string>();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.AddRange(org, other);
            var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
            foreach (var role in new[] { OrgRole.Owner, OrgRole.Admin, OrgRole.Member })
            {
                var user = new User { Email = $"{role}@test.invalid", DisplayName = $"Test {role}", PasswordHash = [1], PasswordSalt = [1] };
                db.AddRange(user, new UserOrganization { OrganizationId = org.Id, UserId = user.Id, Role = role });
                tokens.Add(role, jwt.CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp));
            }
            db.OrganizationActivities.Add(new OrganizationActivity
            {
                OrganizationId = other.Id, ActorId = Guid.NewGuid(), OccurredAt = DateTime.UtcNow,
                Action = "created", Resource = "Asset", ResourceName = "Other organization event"
            });
            await db.SaveChangesAsync();
        }
        void ActAs(OrgRole role) => client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens[role]);
        var endpoint = $"/api/organizations/{org.Id}/activity";
        ActAs(OrgRole.Member);
        (await client.GetAsync(endpoint)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await client.GetAsync(endpoint + "/export")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await client.PutAsJsonAsync(endpoint + "/settings", new OrganizationActivitySettings(10))).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        ActAs(OrgRole.Admin);
        (await client.GetAsync($"/api/organizations/{other.Id}/activity")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await client.PutAsJsonAsync(endpoint + "/settings", new OrganizationActivitySettings(366))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.PutAsJsonAsync(endpoint + "/settings", new OrganizationActivitySettings(10))).StatusCode.Should().Be(HttpStatusCode.OK);

        ActAs(OrgRole.Owner);
        var page = await client.GetFromJsonAsync<OrganizationActivityPage>(endpoint);
        page!.RetentionDays.Should().Be(10);
        page.Items.Should().ContainSingle(item => item.Action == "retention-updated" && item.ActorName == "Test Admin");
        using var export = await client.GetAsync(endpoint + "/export");
        export.StatusCode.Should().Be(HttpStatusCode.OK);
        export.Content.Headers.ContentDisposition!.DispositionType.Should().Be("attachment");
        var items = await export.Content.ReadFromJsonAsync<List<OrganizationActivityItem>>();
        items.Should().BeEquivalentTo(page.Items);
    }
}
