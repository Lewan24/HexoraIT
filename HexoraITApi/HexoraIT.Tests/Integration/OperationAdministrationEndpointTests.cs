using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using HexoraITApi.Application;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HexoraIT.Tests.Integration;

public sealed class OperationAdministrationEndpointTests
{
    [Theory]
    [InlineData(OrgRole.ReadOnly, false)]
    [InlineData(OrgRole.Member, false)]
    [InlineData(OrgRole.Admin, true)]
    [InlineData(OrgRole.Owner, true)]
    public async Task TemplateAndPolicyEndpointsEnforceOrganizationRoleAndValidateImports(OrgRole role, bool manage)
    {
        using var factory = new SecurityWebApplicationFactory();
        var user = new User { Email = "admin-tests@synthetic.invalid", DisplayName = "Synthetic member", PasswordHash = [1], PasswordSalt = [1] };
        var org = new Organization { Name = "Synthetic organization" };
        string jwt;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); await db.Database.EnsureCreatedAsync();
            db.AddRange(user, org, new UserOrganization { OrganizationId = org.Id, UserId = user.Id, Role = role }); await db.SaveChangesAsync(); await OperationCatalog.SeedAsync(db);
            jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>().CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        }
        using var client = factory.CreateClient(); var path = $"/api/operations/{org.Id}";
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path + "/settings")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        var templates = (await client.GetFromJsonAsync<List<OperationTemplateView>>(path + "/templates"))!; Assert.Equal(73, templates.Count);
        var source = templates.Single(t => t.Key == "D02");
        var configuration = (await client.GetFromJsonAsync<OperationSettingsView>(path + "/settings"))!; Assert.Equal(manage, configuration.CanManage);
        Assert.Equal(manage ? HttpStatusCode.Created : HttpStatusCode.Forbidden, (await client.PostAsync(path + $"/templates/{source.Id}/clone", null)).StatusCode);
        Assert.Equal(manage ? HttpStatusCode.OK : HttpStatusCode.Forbidden, (await client.PutAsJsonAsync(path + "/settings", new OperationPolicyInput(Guid.Empty, RetentionDays: 365))).StatusCode);
        Assert.Equal(manage ? HttpStatusCode.OK : HttpStatusCode.Forbidden, (await client.PostAsJsonAsync(path + "/templates/validate", new OperationTemplatePublish(null, source.SchemaJson))).StatusCode);
        Assert.Equal(manage ? HttpStatusCode.BadRequest : HttpStatusCode.Forbidden, (await client.PostAsJsonAsync(path + "/templates/import", new OperationTemplatePublish(null, "{\"eval\":\"execute()\"}"))).StatusCode);
        if (manage)
        {
            templates = (await client.GetFromJsonAsync<List<OperationTemplateView>>(path + "/templates"))!;
            var copy = templates.Single(t => t.OrganizationId == org.Id); var schema = OperationSchemas.Parse(copy.SchemaJson);
            Assert.Equal("RestoreTest", schema.ValidationProfile); Assert.Equal("Record", schema.Kind);
            Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync(path + $"/templates/{copy.Key}/activation", new OperationTemplateActivation(Guid.Empty, false))).StatusCode);
            Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync(path + "/records", new OperationInput(copy.Id, "Disabled", "", Application.OperationTests.Values(schema)))).StatusCode);
        }
    }
}
