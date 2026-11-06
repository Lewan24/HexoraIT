using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class OrganizationCustomizationTests
{
    [Theory]
    [InlineData(OrgRole.Owner, 204)]
    [InlineData(OrgRole.Admin, 204)]
    [InlineData(OrgRole.Member, 403)]
    [InlineData(OrgRole.ReadOnly, 403)]
    public async Task OnlyOwnerAndAdminCanSave(OrgRole role, int expected)
    {
        using var fixture = new TestFixture();
        var (_, org) = fixture.SeedUserWithOrg(role);
        var service = new OrganizationCustomizationService(fixture.Db, fixture.UserContext);
        (await service.SaveAsync(org.Id, new(["diagram", "groups", "warranty"]))).StatusCode.Should().Be(expected);
        var saved = (OrganizationCustomizationDto)(await service.GetAsync(org.Id)).Value!;
        saved.HiddenModules.Should().HaveCount(expected == 204 ? 3 : 0);
    }

    [Fact]
    public async Task SettingsAreSharedWithMembersButIsolatedAcrossOrganizations()
    {
        using var fixture = new TestFixture();
        var (_, org) = fixture.SeedUserWithOrg();
        var service = new OrganizationCustomizationService(fixture.Db, fixture.UserContext);
        (await service.SaveAsync(org.Id, new(["diagram"]))).StatusCode.Should().Be(204);
        var (other, otherOrg) = fixture.SeedUserWithOrg();
        (await service.GetAsync(org.Id)).StatusCode.Should().Be(403);
        fixture.Db.UserOrganizations.Add(new UserOrganization { UserId = other.Id, OrganizationId = org.Id, Role = OrgRole.ReadOnly });
        await fixture.Db.SaveChangesAsync();
        ((OrganizationCustomizationDto)(await service.GetAsync(org.Id)).Value!).HiddenModules.Should().Equal("diagram");
        ((OrganizationCustomizationDto)(await service.GetAsync(otherOrg.Id)).Value!).HiddenModules.Should().BeEmpty();
    }

    [Theory]
    [InlineData("settings")]
    [InlineData("dashboard")]
    [InlineData("unknown")]
    public async Task InvalidOrRequiredModulesCannotBeHidden(string module)
    {
        using var fixture = new TestFixture();
        var (_, org) = fixture.SeedUserWithOrg();
        var service = new OrganizationCustomizationService(fixture.Db, fixture.UserContext);
        (await service.SaveAsync(org.Id, new([module]))).StatusCode.Should().Be(400);
        (await fixture.Db.Organizations.SingleAsync()).HiddenModules.Should().BeEmpty();
    }

    [Fact]
    public async Task CustomRoleCannotEscalateToCustomizeOrganization()
    {
        using var fixture = new TestFixture();
        var (user, org) = fixture.SeedUserWithOrg();
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Custom" };
        fixture.Db.OrganizationRoles.Add(role);
        (await fixture.Db.UserOrganizations.SingleAsync(m => m.UserId == user.Id)).CustomRoleId = role.Id;
        await fixture.Db.SaveChangesAsync();
        (await new OrganizationCustomizationService(fixture.Db, fixture.UserContext).SaveAsync(org.Id, new(["files"]))).StatusCode.Should().Be(403);
    }
}
