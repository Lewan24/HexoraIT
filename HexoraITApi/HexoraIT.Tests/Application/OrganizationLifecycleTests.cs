using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class OrganizationLifecycleTests : IDisposable
{
    private readonly TestFixture fixture = new();
    private OrganizationService Service() => new(fixture.Db, fixture.Mapper, fixture.UserContext);

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Creation_UsesCorrectTypeAndDefaultModules(bool temporary)
    {
        fixture.SeedUserWithOrg();
        var result = await Service().CreateAsync(new("New workspace", "#2563eb", "NW", "", temporary));
        result.StatusCode.Should().Be(201);
        var dto = result.Value.Should().BeOfType<OrganizationDto>().Subject;
        dto.IsTemporary.Should().Be(temporary);
        dto.IsArchived.Should().BeFalse();
        dto.ArchivedAt.Should().BeNull();
        var org = await fixture.Db.Organizations.SingleAsync(item => item.Id == dto.Id);
        org.HiddenModules.Should().BeEquivalentTo(OrganizationCustomizationService.DefaultHiddenModules(temporary));
        if (temporary)
            OrganizationCustomizationService.CustomizableModules.Except(org.HiddenModules)
                .Should().BeEquivalentTo("assets", "passwords", "contacts", "contracts", "knowledge", "files");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Creation_PersistsExplicitModulesAtomically(bool temporary)
    {
        fixture.SeedUserWithOrg();
        var dto = (OrganizationDto)(await Service().CreateAsync(new("Custom", "#000", "C", "", temporary, ["groups", "diagram"]))).Value!;
        (await fixture.Db.Organizations.SingleAsync(org => org.Id == dto.Id)).HiddenModules.Should().BeEquivalentTo("groups", "diagram");
        (await fixture.Db.UserOrganizations.SingleAsync(member => member.OrganizationId == dto.Id)).Role.Should().Be(OrgRole.Owner);
        var allEnabled = (OrganizationDto)(await Service().CreateAsync(new("All modules", "#000", "AM", "", temporary, []))).Value!;
        (await fixture.Db.Organizations.SingleAsync(org => org.Id == allEnabled.Id)).HiddenModules.Should().BeEmpty();
    }

    [Theory]
    [InlineData("dashboard")]
    [InlineData("settings")]
    [InlineData("nonexistent")]
    public async Task Creation_RejectsInvalidModulesBeforeWriting(string module)
    {
        fixture.SeedUserWithOrg();
        (await Service().CreateAsync(new("Invalid", "#000", "I", "", true, [module]))).StatusCode.Should().Be(400);
        (await fixture.Db.Organizations.CountAsync()).Should().Be(1);
        (await fixture.Db.UserOrganizations.CountAsync()).Should().Be(1);
    }

    [Theory]
    [InlineData(OrgRole.Owner, 204)]
    [InlineData(OrgRole.Admin, 204)]
    [InlineData(OrgRole.Member, 403)]
    [InlineData(OrgRole.ReadOnly, 403)]
    public async Task ArchiveAndReactivation_RequireOwnerOrAdmin(OrgRole role, int expected)
    {
        var (_, org) = fixture.SeedUserWithOrg(role);
        (await Service().SetArchivedAsync(org.Id, true)).StatusCode.Should().Be(expected);
        org.IsArchived.Should().Be(expected == 204);
        (await Service().SetArchivedAsync(org.Id, false)).StatusCode.Should().Be(expected);
        org.IsArchived.Should().BeFalse();
    }

    [Fact]
    public async Task Archive_KeepsDataMembershipAndModuleSettings_AndCanBeReactivated()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        org.IsTemporary = true;
        org.HiddenModules = ["diagram", "groups"];
        fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "Contact" });
        await fixture.Db.SaveChangesAsync();
        (await Service().SetArchivedAsync(org.Id, true)).StatusCode.Should().Be(204);
        var archivedAt = org.ArchivedAt;
        archivedAt.Should().NotBeNull();
        org.IsDeleted.Should().BeFalse();
        var dto = (OrganizationDto)(await Service().GetByIdAsync(org.Id)).Value!;
        dto.IsArchived.Should().BeTrue();
        ((List<OrganizationSummaryDto>)(await Service().GetAllAsync(null)).Value!).Should().Contain(item => item.Id == org.Id);
        ((List<OrganizationSummaryDto>)(await Service().GetDeletedAsync(null)).Value!).Should().BeEmpty();
        await Service().SetArchivedAsync(org.Id, true);
        org.ArchivedAt.Should().Be(archivedAt);
        (await Service().SetArchivedAsync(org.Id, false)).StatusCode.Should().Be(204);
        org.ArchivedAt.Should().BeNull();
        org.HiddenModules.Should().Equal("diagram", "groups");
        org.IsTemporary.Should().BeTrue();
        (await fixture.Db.Contacts.CountAsync()).Should().Be(1);
        (await fixture.Db.UserOrganizations.CountAsync()).Should().Be(1);
    }

    [Fact]
    public async Task Archive_IsSharedAcrossMembersAndRejectsForeignUsers()
    {
        var (owner, org) = fixture.SeedUserWithOrg();
        var (other, _) = fixture.SeedUserWithOrg();
        (await Service().SetArchivedAsync(org.Id, true)).StatusCode.Should().Be(403);
        fixture.ActAs(owner.Id);
        await Service().SetArchivedAsync(org.Id, true);
        fixture.Db.UserOrganizations.Add(new UserOrganization { UserId = other.Id, OrganizationId = org.Id, Role = OrgRole.Member });
        await fixture.Db.SaveChangesAsync();
        fixture.ActAs(other.Id);
        ((OrganizationDto)(await Service().GetByIdAsync(org.Id)).Value!).IsArchived.Should().BeTrue();
        (await Service().SetArchivedAsync(org.Id, false)).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task NormalEditsDoNotResetLifecycleOrModuleSettings()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        org.IsTemporary = true;
        org.HiddenModules = ["groups"];
        await fixture.Db.SaveChangesAsync();
        await Service().SetArchivedAsync(org.Id, true);
        await Service().UpdateAsync(org.Id, new("Changed name", "#fff", "CN", "Changed description"));
        org.IsArchived.Should().BeTrue();
        org.IsTemporary.Should().BeTrue();
        org.HiddenModules.Should().Equal("groups");
    }

    [Fact]
    public async Task DeletedOrganizationsCannotBeReactivatedThroughArchiveEndpoint()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        await Service().DeleteAsync(org.Id);
        (await Service().SetArchivedAsync(org.Id, false)).StatusCode.Should().Be(403);
        org.IsDeleted.Should().BeTrue();
    }

    public void Dispose() => fixture.Dispose();
}
