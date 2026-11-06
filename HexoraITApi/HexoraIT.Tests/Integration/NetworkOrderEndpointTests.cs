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

public sealed class NetworkOrderEndpointTests
{
    [Theory]
    [InlineData(OrgRole.Owner, HttpStatusCode.OK)]
    [InlineData(OrgRole.ReadOnly, HttpStatusCode.Forbidden)]
    public async Task AuthenticatedEndpointsValidateOrderingAndProtectNetworkUpdates(OrgRole role, HttpStatusCode expected)
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User { Email = "ordering@test.local", PasswordHash = [1], PasswordSalt = [1] };
        var org = new Organization { Name = "Ordering" };
        var contact = new Contact { OrganizationId = org.Id, Name = "Contact" };
        string jwt;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await db.Database.EnsureCreatedAsync();
            db.AddRange(user, org, contact, new Subnet { OrganizationId = org.Id, Name = "LAN", Cidr = "10.0.0.0/24" }, new Asset { OrganizationId = org.Id, Name = "Server", Ip = "10.0.0.5" });
            db.UserOrganizations.Add(new() { UserId = user.Id, OrganizationId = org.Id, Role = role });
            await db.SaveChangesAsync();
            jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>().CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }
        using var client = factory.CreateClient();
        var orderPath = $"/api/organizations/{org.Id}/record-order/contacts";
        (await client.GetAsync(orderPath)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        (await client.GetAsync(orderPath + "?page=1&pageSize=200")).StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await client.PatchAsJsonAsync(orderPath, new SaveRecordOrderDto([new(contact.Id, 15)]));
        saved.StatusCode.Should().Be(expected);
        (await client.PostAsync($"/api/subnets/sync-assets?organizationId={org.Id}", null)).StatusCode.Should().Be(expected);
        if (expected == HttpStatusCode.OK)
        {
            var list = await client.GetFromJsonAsync<List<RecordOrderItemDto>>(orderPath);
            list!.Single().SortIndex.Should().Be(15);
            (await client.PatchAsJsonAsync(orderPath, new SaveRecordOrderDto([new(contact.Id, 0)]))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await client.PatchAsJsonAsync(orderPath, new { changes = new object?[] { null } })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
            (await client.GetAsync($"/api/organizations/{Guid.NewGuid()}/record-order/contacts")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }
}
