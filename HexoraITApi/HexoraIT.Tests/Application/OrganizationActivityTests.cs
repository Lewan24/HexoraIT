using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexoraIT.Tests.Application;

public sealed class OrganizationActivityTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    [Fact]
    public async Task CommittedFileChangesAndNetworkEntriesRecordActorAndAction()
    {
        var (actor, organization) = _fixture.SeedUserWithOrg();
        var files = new FileExplorerService(_fixture.Db, _fixture.Mapper, _fixture.UserContext, _fixture.Storage,
            NullLogger<FileExplorerService>.Instance);
        var folder = (FileFolderDto)(await files.CreateFolderAsync(organization.Id, new("Network plans", null))).Value!;
        var file = new StoredFile { OrganizationId = organization.Id, Name = "draft.txt", MimeType = "text/plain", BlobPath = "initial.txt" };
        var subnet = new Subnet { OrganizationId = organization.Id, Name = "Office", Cidr = "192.168.0.0/24" };
        _fixture.Db.AddRange(file, subnet);
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.IPEntries.Should().BeEmpty();

        (await files.RenameFileAsync(file.Id, new("plan.txt"))).StatusCode.Should().Be(204);
        (await files.MoveFileAsync(file.Id, new(folder.Id))).StatusCode.Should().Be(204);
        file.BlobPath = "edited.txt";
        await _fixture.Db.SaveChangesAsync();
        var networks = new SubnetService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var entry = (IPEntryDto)(await networks.AddIpAsync(subnet.Id, new("192.168.0.10", "Planned", IPEntryStatus.Reserved, null, null, ""))).Value!;
        (await networks.AddIpAsync(subnet.Id, new("192.168.0.10", "", IPEntryStatus.Used, null, null, ""))).StatusCode.Should().Be(409);
        (await networks.AddIpAsync(subnet.Id, new("192.168.1.10", "", IPEntryStatus.Used, null, null, ""))).StatusCode.Should().Be(400);
        _fixture.Db.IPEntries.Should().ContainSingle();

        _fixture.Db.Assets.Add(new Asset { OrganizationId = organization.Id, Name = "Switch", Ip = "192.168.0.11" });
        await _fixture.Db.SaveChangesAsync();
        var synchronization = await new NetworkAssetSyncService(_fixture.Db, _fixture.UserContext).SyncAsync(organization.Id);
        synchronization.StatusCode.Should().Be(200);
        var automaticEntry = await _fixture.Db.IPEntries.SingleAsync(ip => ip.IsAutoManaged);
        automaticEntry.Ip.Should().Be("192.168.0.11");

        var items = await new OrganizationActivityService(_fixture.Db, _fixture.UserContext).Read(organization).ToListAsync();
        items.Should().OnlyContain(item => item.ActorId == actor.Id && item.ActorName == actor.DisplayName);
        items.Where(item => item.ResourceId == file.Id).Select(item => item.Action)
            .Should().BeEquivalentTo(["created", "renamed", "moved", "content-updated"]);
        items.Should().ContainSingle(item => item.ResourceId == file.Id && item.Action == "renamed" &&
            item.PreviousName == "draft.txt" && item.ResourceName == "plan.txt");
        items.Should().ContainSingle(item => item.ResourceId == entry.Id && item.ResourceName == "192.168.0.10" && item.Action == "created");
        items.Should().ContainSingle(item => item.ResourceId == subnet.Id && item.Action == "created");
        items.Should().ContainSingle(item => item.ResourceId == automaticEntry.Id && item.Action == "created");
    }

    [Fact]
    public async Task RollbackLeavesNoActivityAndAFailedSaveCanBeRetried()
    {
        var (_, org) = _fixture.SeedUserWithOrg();
        var asset = new Asset { OrganizationId = org.Id, Name = "Router" };
        await using (var transaction = await _fixture.Db.Database.BeginTransactionAsync())
        {
            _fixture.Db.Assets.Add(asset);
            await _fixture.Db.SaveChangesAsync();
            await transaction.RollbackAsync();
        }
        _fixture.Db.ChangeTracker.Clear();
        _fixture.Db.OrganizationActivities.Should().BeEmpty();

        await _fixture.Db.Database.ExecuteSqlRawAsync("CREATE TRIGGER reject_asset BEFORE INSERT ON Assets BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
        asset = new Asset { OrganizationId = org.Id, Name = "Router" };
        _fixture.Db.Assets.Add(asset);
        await Assert.ThrowsAsync<DbUpdateException>(() => _fixture.Db.SaveChangesAsync());
        _fixture.Db.ChangeTracker.Entries<OrganizationActivity>().Should().BeEmpty();
        await _fixture.Db.Database.ExecuteSqlRawAsync("DROP TRIGGER reject_asset");
        await _fixture.Db.SaveChangesAsync();
        _fixture.Db.OrganizationActivities.Should().ContainSingle(item => item.ResourceId == asset.Id);
    }

    [Fact]
    public async Task RetentionFiltersAndPurgesEachOrganizationIndependently()
    {
        var (owner, organization) = _fixture.SeedUserWithOrg();
        var (_, other) = _fixture.SeedUserWithOrg();
        var now = DateTime.UtcNow;
        other.ActivityRetentionDays = 14;
        var expired = new OrganizationActivity { OrganizationId = organization.Id, ActorId = owner.Id, OccurredAt = now.AddDays(-8) };
        var preserved = new OrganizationActivity { OrganizationId = other.Id, ActorId = owner.Id, OccurredAt = expired.OccurredAt };
        var current = new OrganizationActivity { OrganizationId = organization.Id, ActorId = owner.Id, OccurredAt = now.AddDays(-6) };
        _fixture.Db.OrganizationActivities.AddRange(expired, preserved, current);
        await _fixture.Db.SaveChangesAsync();
        _fixture.ActAs(owner.Id);
        var service = new OrganizationActivityService(_fixture.Db, _fixture.UserContext);
        (await service.GetAuthorizedOrganizationAsync(organization.Id, default)).Should().NotBeNull();
        (await service.GetAuthorizedOrganizationAsync(other.Id, default)).Should().BeNull();
        var page = await service.GetPageAsync(organization, 1, default);
        page.RetentionDays.Should().Be(7);
        page.Items.Should().ContainSingle(item => item.Id == current.Id);
        await OrganizationActivityCleanup.PurgeExpiredAsync(_fixture.Db, now);
        _fixture.Db.OrganizationActivities.Should().Contain(item => item.Id == preserved.Id).And.NotContain(item => item.Id == expired.Id);
    }

    public void Dispose() => _fixture.Dispose();
}
