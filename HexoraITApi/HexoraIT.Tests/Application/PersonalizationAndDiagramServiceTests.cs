using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class PersonalizationAndDiagramServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    [Fact]
    public async Task PrivateNotes_ArePrivateAcrossUsersAndOrganizations()
    {
        var (owner, organization) = _fixture.SeedUserWithOrg();
        var (member, otherOrganization) = _fixture.SeedUserWithOrg();
        _fixture.Db.UserOrganizations.Add(new UserOrganization { UserId = member.Id, OrganizationId = organization.Id, Role = OrgRole.ReadOnly });
        await _fixture.Db.SaveChangesAsync();
        var service = Notes();
        var note = (await service.CreateAsync(organization.Id, new("My note", "Private"))).Value.Should().BeOfType<PrivateNote>().Subject;
        (await service.UpdateAsync(otherOrganization.Id, note.Id, new("Wrong", ""))).StatusCode.Should().Be(StatusCodes.Status404NotFound);

        _fixture.ActAs(owner.Id);
        _fixture.Db.ChangeTracker.Clear();
        (await service.GetAllAsync(organization.Id, null)).Value.Should().BeOfType<List<PrivateNote>>().Subject.Should().BeEmpty();
        (await service.UpdateAsync(organization.Id, note.Id, new("Stolen", ""))).StatusCode.Should().Be(StatusCodes.Status404NotFound);

        _fixture.ActAs(member.Id);
        (await service.DeleteAsync(organization.Id, note.Id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task MembershipRevocation_ImmediatelyBlocksPrivateNotes()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Notes();
        var note = (await service.CreateAsync(organization.Id, new("Private", "Text"))).Value.Should().BeOfType<PrivateNote>().Subject;
        _fixture.Db.UserOrganizations.Remove(await _fixture.Db.UserOrganizations.SingleAsync());
        await _fixture.Db.SaveChangesAsync();

        (await service.GetAllAsync(organization.Id, null)).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await service.UpdateAsync(organization.Id, note.Id, new("Edit", ""))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await service.DeleteAsync(organization.Id, note.Id)).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task CachedModel_UsesCurrentRequestUserForPrivateFilters()
    {
        var (owner, organization) = _fixture.SeedUserWithOrg();
        var (other, _) = _fixture.SeedUserWithOrg();
        _fixture.ActAs(owner.Id);
        await Notes().CreateAsync(organization.Id, new("Owner", "Private"));
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_fixture.Db.Database.GetDbConnection()).Options;
        await using var requestDb = new AppDbContext(options, new FakeCurrentUserIdProvider { UserId = other.Id });
        (await requestDb.PrivateNotes.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task DashboardLayout_IsSavedAndResetForCurrentUser()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new DashboardLayoutService(_fixture.Db, _fixture.UserContext);
        await service.SaveAsync(organization.Id, new(["a", "b"], ["c"]));
        (await service.GetAsync(organization.Id)).Value.Should().BeOfType<DashboardLayoutDto>().Subject.SectionOrder.Should().Equal("a", "b");
        (await service.ResetAsync(organization.Id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.GetAsync(organization.Id)).Value.Should().BeNull();
    }

    [Fact]
    public async Task Diagram_RejectsForeignAssetsAndInvalidEdgesWithoutReplacingData()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Other" };
        var foreignAsset = new Asset { OrganizationId = other.Id, Name = "Foreign" };
        var existing = new DiagramNode { OrganizationId = organization.Id, Label = "Existing" };
        _fixture.Db.AddRange(other, foreignAsset, existing);
        await _fixture.Db.SaveChangesAsync();
        var service = new DiagramService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var nodeId = Guid.NewGuid();

        var foreign = await service.SaveAsync(organization.Id, new([new(nodeId, DiagramDeviceType.Server, "Node", null, foreignAsset.Id, 0, 0, null)], []));
        var invalidEdge = await service.SaveAsync(organization.Id, new([new(nodeId, DiagramDeviceType.Server, "Node", null, null, 0, 0, null)],
            [new(Guid.NewGuid(), nodeId, Guid.NewGuid(), null, DiagramConnectionType.Ethernet)]));

        foreign.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        invalidEdge.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await _fixture.Db.DiagramNodes.SingleAsync()).Id.Should().Be(existing.Id);
    }

    public void Dispose() => _fixture.Dispose();
    private PrivateNoteService Notes() => new(_fixture.Db, _fixture.UserContext);
}
