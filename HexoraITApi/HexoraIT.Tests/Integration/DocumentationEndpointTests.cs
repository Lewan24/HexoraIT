using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Integration;

public sealed class DocumentationEndpointTests
{
    [Theory]
    [InlineData(OrgRole.Owner, HttpStatusCode.OK)]
    [InlineData(OrgRole.Admin, HttpStatusCode.OK)]
    [InlineData(OrgRole.Member, HttpStatusCode.Forbidden)]
    [InlineData(OrgRole.ReadOnly, HttpStatusCode.Forbidden)]
    public async Task PdfEndpointEnforcesRoleAndReturnsDownloadWithNoStore(OrgRole role, HttpStatusCode expected)
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User { Email = "pdf@test.local", DisplayName = "PDF user", PasswordHash = [1], PasswordSalt = [1] };
        var organization = new Organization { Name = "Documentation client" };
        string jwt;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.AddRange(user, organization, new Contact { OrganizationId = organization.Id, Name = "Test contact" });
            db.UserOrganizations.Add(new UserOrganization { UserId = user.Id, OrganizationId = organization.Id, Role = role });
            await db.SaveChangesAsync();
            jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>().CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }
        using var client = factory.CreateClient();
        var path = $"/api/organizations/{organization.Id}/documentation";
        (await client.GetAsync(path + "/options")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        (await client.GetAsync(path + "/options")).StatusCode.Should().Be(expected);
        var response = await client.PostAsJsonAsync(path + "/pdf", new DocumentationRequestDto([new("contacts")]));
        response.StatusCode.Should().Be(expected);
        if (expected == HttpStatusCode.OK)
        {
            response.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
            response.Content.Headers.ContentDisposition!.DispositionType.Should().Be("attachment");
            response.Headers.CacheControl!.NoStore.Should().BeTrue();
            (await response.Content.ReadAsByteArrayAsync()).Take(5).Should().Equal("%PDF-"u8.ToArray());
            var rejected = await client.PostAsJsonAsync(path + "/pdf", new DocumentationRequestDto([new("passwords")], IncludeSecrets: true));
            rejected.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        }
    }
}
