using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HexoraIT.Tests.Integration;

public sealed class TaskStatusEndpointTests
{
    [Fact]
    public async Task StatusEndpointRequiresAuthenticationValidatesBodyAndOnlyUpdatesStatus()
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User { Email = "task-status@test.local", PasswordHash = [1], PasswordSalt = [1] };
        var org = new Organization { Name = "Tasks" };
        var task = new WorkTask { OrganizationId = org.Id, Title = "Keep title", Description = "Keep details", SortIndex = 30 };
        string jwt;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync(); db.AddRange(user, org, task);
            db.UserOrganizations.Add(new() { UserId = user.Id, OrganizationId = org.Id, Role = OrgRole.Owner });
            await db.SaveChangesAsync();
            jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>().CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }
        using var client = factory.CreateClient();
        var path = $"/api/tasks/{task.Id}/status";
        (await client.PatchAsJsonAsync(path, new { status = "done" })).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        foreach (var invalid in new object[] { new { status = "invalid" }, new { status = 999 }, new { unrelated = "done" } })
            (await client.PatchAsJsonAsync(path, invalid)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var response = await client.PatchAsJsonAsync(path, new { status = "done", title = "Must be ignored", description = "Must be ignored", sortIndex = 1 });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await client.GetFromJsonAsync<System.Text.Json.JsonElement>($"/api/tasks/{task.Id}");
        saved.GetProperty("status").GetString().Should().Be("done"); saved.GetProperty("title").GetString().Should().Be("Keep title"); saved.GetProperty("description").GetString().Should().Be("Keep details"); saved.GetProperty("sortIndex").GetInt32().Should().Be(30);
    }
}
