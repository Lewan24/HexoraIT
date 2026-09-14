using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using HexoraIT.Tests.Fakes;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Controllers;

public class PrivateNotesControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();
    private PrivateNotesController Controller() => new(_fx.Db, _fx.UserContext);

    [Fact]
    public async Task Notes_ArePrivateEvenFromOrganizationOwnerAndCannotCrossOrganizations()
    {
        var (owner, org) = _fx.SeedUserWithOrg();
        var (member, otherOrg) = _fx.SeedUserWithOrg();
        _fx.Db.UserOrganizations.Add(new UserOrganization
        {
            UserId = member.Id, OrganizationId = org.Id, Role = OrgRole.ReadOnly
        });
        await _fx.Db.SaveChangesAsync();
        var note = (await Controller().Create(org.Id, new("My note", "Private content")))
            .As<OkObjectResult>().Value.As<PrivateNote>();
        note.UserId.Should().Be(member.Id);
        (await Controller().Update(org.Id, note.Id, new("Updated", "New content"))).Should().BeOfType<OkObjectResult>();
        (await Controller().Update(otherOrg.Id, note.Id, new("Wrong org", ""))).Should().BeOfType<NotFoundResult>();
        (await Controller().Delete(otherOrg.Id, note.Id)).Should().BeOfType<NotFoundResult>();

        _fx.ActAs(owner.Id);
        _fx.Db.ChangeTracker.Clear();
        (await Controller().GetAll(org.Id)).As<OkObjectResult>().Value.As<List<PrivateNote>>().Should().BeEmpty();
        (await Controller().Update(org.Id, note.Id, new("Stolen", ""))).Should().BeOfType<NotFoundResult>();
        (await Controller().Delete(org.Id, note.Id)).Should().BeOfType<NotFoundResult>();
        (await _fx.Db.PrivateNotes.ToListAsync()).Should().BeEmpty();

        _fx.ActAs(member.Id);
        (await Controller().Delete(org.Id, note.Id)).Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public async Task MembershipRevocation_ImmediatelyBlocksPrivateNotes()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var note = (await Controller().Create(org.Id, new("Private", "Text")))
            .As<OkObjectResult>().Value.As<PrivateNote>();
        _fx.Db.UserOrganizations.Remove(await _fx.Db.UserOrganizations.SingleAsync());
        await _fx.Db.SaveChangesAsync();

        (await Controller().GetAll(org.Id)).Should().BeOfType<ForbidResult>();
        (await Controller().Create(org.Id, new("New", ""))).Should().BeOfType<ForbidResult>();
        (await Controller().Update(org.Id, note.Id, new("Edit", ""))).Should().BeOfType<ForbidResult>();
        (await Controller().Delete(org.Id, note.Id)).Should().BeOfType<ForbidResult>();
        (await _fx.Db.PrivateNotes.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CachedModel_UsesCurrentRequestUserForResourceAndNoteFilters()
    {
        var (owner, org) = _fx.SeedUserWithOrg();
        var (other, _) = _fx.SeedUserWithOrg();
        _fx.ActAs(owner.Id);
        _fx.Db.Assets.Add(new Asset { OrganizationId = org.Id, Name = "Owner only" });
        await _fx.Db.SaveChangesAsync();
        await Controller().Create(org.Id, new("Owner note", "Private"));
        (await _fx.Db.Assets.CountAsync()).Should().Be(1);
        (await _fx.Db.PrivateNotes.CountAsync()).Should().Be(1);

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_fx.Db.Database.GetDbConnection()).Options;
        await using var requestDb = new AppDbContext(options, new FakeCurrentUserIdProvider { UserId = other.Id });
        (await requestDb.Assets.CountAsync()).Should().Be(0);
        (await requestDb.PrivateNotes.CountAsync()).Should().Be(0);
    }

    public void Dispose() => _fx.Dispose();
}
