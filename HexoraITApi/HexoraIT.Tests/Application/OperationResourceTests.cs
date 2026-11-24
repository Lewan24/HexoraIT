using System.Text.Json;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class OperationResourceTests
{
    [Fact]
    public async Task BasicDraftCanBecomeAnAdvancedOperationAndKeepsAuthorizedResourceLinks()
    {
        using var fixture = new TestFixture();
        var (_, organization) = fixture.SeedUserWithOrg();
        await OperationCatalog.SeedAsync(fixture.Db);
        var other = new Organization { Name = "Other" };
        var asset = new Asset { OrganizationId = organization.Id, Name = "Office router" };
        var credential = new PasswordEntry { OrganizationId = organization.Id, Name = "Operations account" };
        var foreign = new Asset { OrganizationId = other.Id, Name = "Foreign asset" };
        fixture.Db.AddRange(other, asset, credential, foreign);
        await fixture.Db.SaveChangesAsync();
        var service = new OperationService(fixture.Db, fixture.UserContext);
        var basic = await fixture.Db.OperationTemplates.SingleAsync(t => t.Key == "BASIC");
        var advanced = await fixture.Db.OperationTemplates.SingleAsync(t => t.Key == "A02");
        var values = JsonSerializer.SerializeToElement(new { content = "Basic procedure", evidence = "Change log" });
        var input = new OperationInput(basic.Id, "Network task", "", values);
        var foreignInput = input with { RelatedResources = [new("assets", foreign.Id)] };
        Assert.Equal(400, (await service.Create(organization.Id, foreignInput, default)).StatusCode);
        Assert.Equal(201, (await service.Create(organization.Id, input with
        {
            RelatedResources = [new("assets", asset.Id), new("passwords", credential.Id)]
        }, default)).StatusCode);

        var record = await fixture.Db.OperationRecords.SingleAsync();
        var original = record.RevisionToken;
        var number = record.Number;
        var originalRevision = await fixture.Db.OperationRevisions.SingleAsync();
        var edit = input with { TemplateVersionId = advanced.Id, RevisionToken = original, Description = "Basic procedure",
            Values = JsonSerializer.SerializeToElement(new { }) };
        Assert.Equal(200, (await service.Update(organization.Id, record.Id, edit, default)).StatusCode);
        Assert.Equal(409, (await service.Update(organization.Id, record.Id, edit, default)).StatusCode);
        Assert.Equal(400, (await service.Update(organization.Id, record.Id, input with { RevisionToken = record.RevisionToken }, default)).StatusCode);

        var detail = Assert.IsType<OperationDetail>((await service.Detail(organization.Id, record.Id, default)).Value);
        Assert.Equal(advanced.Id, detail.Record.TemplateVersionId);
        Assert.Equal(number, detail.Record.Number);
        Assert.Equal("Basic procedure", detail.Record.Description);
        Assert.Equal(new[] { asset.Name, credential.Name }, detail.RelatedResources!.Select(r => r.Name));
        Assert.Contains(detail.Activity, entry => entry.EventType == "TemplateChanged");
        Assert.Equal(200, (await service.Revision(organization.Id, record.Id, originalRevision.Id, default)).StatusCode);
        var related = Assert.IsType<OperationList>((await service.List(organization.Id, null, null, null, null,
            asset.Id, null, null, null, null, null, null, 1, 20, default)).Value);
        Assert.Equal(record.Id, Assert.Single(related.Items).Id);

        var reader = new User { Email = "reader@synthetic.invalid", DisplayName = "Reader" };
        var role = new OrganizationRole { OrganizationId = organization.Id, Name = "Operation reader" };
        role.Permissions.Add(new RolePermission { RoleId = role.Id, Resource = "operations", CanRead = true });
        fixture.Db.AddRange(reader, role, new UserOrganization { UserId = reader.Id, OrganizationId = organization.Id,
            CustomRoleId = role.Id, Role = OrgRole.Member });
        await fixture.Db.SaveChangesAsync();
        fixture.ActAs(reader.Id);
        var limited = Assert.IsType<OperationDetail>((await service.Detail(organization.Id, record.Id, default)).Value);
        Assert.Empty(limited.RelatedResources!);
        Assert.Equal(403, (await service.List(organization.Id, null, null, null, null, asset.Id,
            null, null, null, null, null, null, 1, 20, default)).StatusCode);
    }
}
