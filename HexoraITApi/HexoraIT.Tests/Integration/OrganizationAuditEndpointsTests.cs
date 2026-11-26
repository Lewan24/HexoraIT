using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HexoraIT.Tests.Integration;

public sealed class OrganizationAuditEndpointsTests
{
    [Fact]
    public async Task AuditsRetainUpdatesAndFilesWithOrganizationPermissions()
    {
        using var factory = new SecurityWebApplicationFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });
        var organization = new Organization { Name = "Audit organization" };
        var other = new Organization { Name = "Other organization" };
        var tokens = new Dictionary<OrgRole, string>();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
            db.AddRange(organization, other);
            foreach (var role in new[] { OrgRole.Member, OrgRole.ReadOnly })
            {
                var user = new User { Email = $"audit-{role}@test.invalid", DisplayName = $"Audit {role}" };
                db.AddRange(user, new UserOrganization { OrganizationId = organization.Id, UserId = user.Id, Role = role },
                    new UserOrganization { OrganizationId = other.Id, UserId = user.Id, Role = role });
                tokens[role] = jwt.CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
            }
            await db.SaveChangesAsync();
        }

        var endpoint = $"/api/organizations/{organization.Id}/audit-history";
        var otherEndpoint = $"/api/organizations/{other.Id}/audit-history";
        var audit = Guid.NewGuid();
        var initialUpdate = Guid.NewGuid();
        var initialPath = $"{endpoint}/{audit}/updates/{initialUpdate}";
        const string json = """{"schema":2}""";
        const string pdf = "%PDF-1.7\n";
        void ActAs(OrgRole role) => client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", tokens[role]);

        ActAs(OrgRole.Member);
        using (var invalid = Form("in-progress", "Audit sample", "invalid.json", "not JSON"))
            (await client.PostAsync(initialPath, invalid)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await client.GetFromJsonAsync<JsonElement>(endpoint)).GetProperty("items").GetArrayLength().Should().Be(0);

        using (var initial = Form("in-progress", "Audit sample", "draft.json", json))
            (await client.PostAsync(initialPath, initial)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        using (var retry = Form("in-progress", "Audit sample", "draft.json", json))
            (await client.PostAsync(initialPath, retry)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        using (var update = Form("completed", null, "final.pdf", pdf))
            (await client.PostAsync($"{endpoint}/{audit}/updates/{Guid.NewGuid()}", update)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        ActAs(OrgRole.ReadOnly);
        var index = (await client.GetFromJsonAsync<JsonElement>(endpoint)).GetProperty("items");
        index.GetArrayLength().Should().Be(1);
        index[0].GetProperty("status").GetString().Should().Be("completed");

        var history = (await client.GetFromJsonAsync<JsonElement>($"{endpoint}/{audit}/updates")).GetProperty("items");
        history.GetArrayLength().Should().Be(2);
        history[0].GetProperty("author").GetString().Should().Be("Audit Member");
        history[1].GetProperty("status").GetString().Should().Be("in-progress");
        var attachmentId = history[1].GetProperty("attachments")[0].GetProperty("id").GetGuid();
        using var download = await client.GetAsync($"{endpoint}/{audit}/attachments/{attachmentId}");
        download.StatusCode.Should().Be(HttpStatusCode.OK);
        download.Content.Headers.ContentDisposition!.DispositionType.Should().Be("attachment");
        (await download.Content.ReadAsStringAsync()).Should().Be(json);
        (await client.GetAsync($"{otherEndpoint}/{audit}/attachments/{attachmentId}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await client.GetAsync($"{otherEndpoint}/{audit}/updates")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        using var denied = Form("planned");
        (await client.PostAsync($"{endpoint}/{audit}/updates/{Guid.NewGuid()}", denied)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private static MultipartFormDataContent Form(string status, string? title = null, string? fileName = null, string? content = null)
    {
        var form = new MultipartFormDataContent { { new StringContent(status), "status" } };
        if (title is not null)
        {
            form.Add(new StringContent(title), "title");
            form.Add(new StringContent("2026-11-24"), "auditDate");
        }
        if (fileName is not null) form.Add(new StringContent(content!), "files", fileName);
        return form;
    }
}
