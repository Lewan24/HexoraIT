using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class NetworkAssetSyncTests : IDisposable
{
    private readonly TestFixture fixture = new();
    private NetworkAssetSyncService Service() => new(fixture.Db, fixture.UserContext);
    private Subnet Network(Guid org, string cidr, string name = "Network") => new() { OrganizationId = org, Name = name, Cidr = cidr };
    private Asset Asset(Guid org, string ip, string name = "Server") => new() { OrganizationId = org, Name = name, Ip = ip };

    [Theory]
    [InlineData("192.168.1.7/24", "192.168.1.99", true)]
    [InlineData("192.168.1.0/24", "192.168.2.1", false)]
    [InlineData("0.0.0.0/0", "8.8.8.8", true)]
    [InlineData("10.0.0.1/32", "10.0.0.2", false)]
    [InlineData("2001:db8::/64", "2001:db8::a", true)]
    [InlineData("2001:db8::/64", "2001:db8:1::a", false)]
    [InlineData("2001:db8::/64", "192.168.1.99", false)]
    public void CidrMatchingHandlesIPv4IPv6AndHostBits(string cidr, string ip, bool expected)
    {
        IpSubnetRange.TryParse(cidr, out var range).Should().BeTrue();
        IpSubnetRange.TryAddress(ip, out var address).Should().BeTrue();
        range.Contains(address).Should().Be(expected);
    }

    [Theory]
    [InlineData("10.0.0.0/33")]
    [InlineData("2001:db8::/129")]
    [InlineData("not-a-network")]
    public void InvalidRangesAreRejected(string cidr) => IpSubnetRange.TryParse(cidr, out _).Should().BeFalse();

    [Fact]
    public async Task SyncPopulatesMostSpecificSubnetAndIsIdempotent()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var broad = Network(org.Id, "10.0.0.0/8"); var narrow = Network(org.Id, "10.1.2.0/24");
        var v6 = Network(org.Id, "2001:db8::/64");
        var a = Asset(org.Id, "10.1.2.9"); var b = Asset(org.Id, "2001:DB8:0:0::9", "IPv6 server");
        fixture.Db.AddRange(broad, narrow, v6, a, b); await fixture.Db.SaveChangesAsync();
        var first = (NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!;
        first.Added.Should().Be(2);
        (await fixture.Db.IPEntries.SingleAsync(entry => entry.AssetId == a.Id)).SubnetId.Should().Be(narrow.Id);
        (await fixture.Db.IPEntries.SingleAsync(entry => entry.AssetId == b.Id)).Ip.Should().Be("2001:db8::9");
        var ids = await fixture.Db.IPEntries.Select(entry => entry.Id).ToListAsync();
        var again = (NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!;
        again.Added.Should().Be(0); again.Updated.Should().Be(0); again.Unchanged.Should().Be(2);
        (await fixture.Db.IPEntries.Select(entry => entry.Id).ToListAsync()).Should().BeEquivalentTo(ids);
    }

    [Fact]
    public async Task AssetAddressAndNameChangesMoveOnlyAutomaticRowPreservingIdentityAndIndex()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var a = Network(org.Id, "10.0.1.0/24"); var b = Network(org.Id, "10.0.2.0/24"); var asset = Asset(org.Id, "10.0.1.8");
        fixture.Db.AddRange(a, b, asset); await fixture.Db.SaveChangesAsync(); await Service().SyncAsync(org.Id);
        var row = await fixture.Db.IPEntries.SingleAsync(); row.SortIndex = 30;
        asset.Ip = "10.0.2.9"; asset.Name = "Renamed"; await fixture.Db.SaveChangesAsync();
        var result = (NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!;
        result.Updated.Should().Be(1); result.Added.Should().Be(0);
        var updated = await fixture.Db.IPEntries.SingleAsync(); updated.Id.Should().Be(row.Id); updated.SubnetId.Should().Be(b.Id);
        updated.Ip.Should().Be("10.0.2.9"); updated.Label.Should().Be("Renamed"); updated.SortIndex.Should().Be(30);
    }

    [Fact]
    public async Task ManualDevicesNotesReservationsAndAssetAssignmentsRemainUnchanged()
    {
        var (_, org) = fixture.SeedUserWithOrg(); var subnet = Network(org.Id, "10.0.1.0/24");
        var asset = Asset(org.Id, "10.0.1.8"); var conflicting = Asset(org.Id, "10.0.1.9", "Collision");
        var assigned = new IPEntry { SubnetId = subnet.Id, AssetId = asset.Id, Ip = "10.0.1.5", Label = "My label", Notes = "Keep notes", PlainText = "Keep details", Status = IPEntryStatus.Reserved };
        var custom = new IPEntry { SubnetId = subnet.Id, Ip = conflicting.Ip, Label = "Printer", Notes = "Do not change", Status = IPEntryStatus.Reserved };
        fixture.Db.AddRange(subnet, asset, conflicting, assigned, custom); await fixture.Db.SaveChangesAsync();
        var result = (NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!;
        result.Added.Should().Be(0); result.Skipped.Should().Be(1);
        result.Issues.Should().Contain(issue => issue.Reason == "manual-address-conflict");
        assigned.Ip.Should().Be("10.0.1.5"); assigned.Label.Should().Be("My label"); assigned.Notes.Should().Be("Keep notes"); assigned.PlainText.Should().Be("Keep details");
        custom.Label.Should().Be("Printer"); custom.Notes.Should().Be("Do not change"); custom.Status.Should().Be(IPEntryStatus.Reserved);
        (await fixture.Db.IPEntries.CountAsync()).Should().Be(2);
    }

    [Fact]
    public async Task EditingAutomaticEntryTransfersItToManualManagement()
    {
        var (_, org) = fixture.SeedUserWithOrg(); var subnet = Network(org.Id, "10.0.1.0/24"); var asset = Asset(org.Id, "10.0.1.8");
        fixture.Db.AddRange(subnet, asset); await fixture.Db.SaveChangesAsync(); await Service().SyncAsync(org.Id);
        var row = await fixture.Db.IPEntries.SingleAsync();
        var subnetService = new SubnetService(fixture.Db, fixture.Mapper, fixture.UserContext);
        (await subnetService.UpdateIpAsync(subnet.Id, row.Id, new(row.Ip, "Manual label", IPEntryStatus.Reserved, asset.Id, "Manual details", "Manual notes"))).StatusCode.Should().Be(204);
        row.IsAutoManaged.Should().BeFalse(); asset.Name = "New asset name"; await fixture.Db.SaveChangesAsync();
        await Service().SyncAsync(org.Id);
        row.Label.Should().Be("Manual label"); row.Status.Should().Be(IPEntryStatus.Reserved); row.Notes.Should().Be("Manual notes");
    }

    [Fact]
    public async Task DuplicateAddressesAndAmbiguousSubnetsAreReportedWithoutGuessing()
    {
        var (_, org) = fixture.SeedUserWithOrg(); var a = Network(org.Id, "10.0.1.0/24"); var duplicate = Network(org.Id, "10.0.1.0/24");
        var b = Network(org.Id, "10.0.2.0/24");
        fixture.Db.AddRange(a, duplicate, b, Asset(org.Id, "10.0.1.8"), Asset(org.Id, "10.0.2.8", "Same IP A"), Asset(org.Id, "10.0.2.8", "Same IP B")); await fixture.Db.SaveChangesAsync();
        var result = (NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!;
        result.Added.Should().Be(0); result.Skipped.Should().Be(3);
        result.Issues.Should().Contain(issue => issue.Reason == "ambiguous-subnet").And.Contain(issue => issue.Reason == "duplicate-asset-address");
        (await fixture.Db.IPEntries.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task AutomaticAddressSwapsDoNotProduceDuplicates()
    {
        var (_, org) = fixture.SeedUserWithOrg(); var subnet = Network(org.Id, "10.0.1.0/24"); var a = Asset(org.Id, "10.0.1.8"); var b = Asset(org.Id, "10.0.1.9");
        fixture.Db.AddRange(subnet, a, b); await fixture.Db.SaveChangesAsync(); await Service().SyncAsync(org.Id);
        (a.Ip, b.Ip) = (b.Ip, a.Ip); await fixture.Db.SaveChangesAsync();
        ((NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!).Updated.Should().Be(2);
        (await fixture.Db.IPEntries.SingleAsync(row => row.AssetId == a.Id)).Ip.Should().Be(a.Ip);
        (await fixture.Db.IPEntries.SingleAsync(row => row.AssetId == b.Id)).Ip.Should().Be(b.Ip);
    }

    [Fact]
    public async Task ReadOnlyAndForeignOrganizationsCannotSynchronize()
    {
        var (_, org) = fixture.SeedUserWithOrg(OrgRole.ReadOnly);
        fixture.Db.Subnets.Add(Network(org.Id, "10.0.1.0/24")); await fixture.Db.SaveChangesAsync();
        (await Service().SyncAsync(org.Id)).StatusCode.Should().Be(403);
        (await Service().SyncAsync(Guid.NewGuid())).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task SyncRespectsIndividualSubnetWriteDeniesAndDoesNotLeakHiddenOrForeignAssets()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var allowed = Network(org.Id, "10.0.1.0/24"); var denied = Network(org.Id, "10.0.2.0/24");
        var visible = Asset(org.Id, "10.0.1.8", "Visible"); var hidden = Asset(org.Id, "10.0.1.9", "HIDDEN");
        var restricted = Asset(org.Id, "10.0.2.8", "Restricted");
        var foreignOrg = new Organization { Name = "Other" }; var foreign = Asset(foreignOrg.Id, "10.0.1.10", "FOREIGN");
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Custom", Permissions = [
            new() { Resource = "assets", CanRead = true },
            new() { Resource = "assets", ResourceId = hidden.Id, CanRead = false },
            new() { Resource = "networks", CanRead = true, CanWrite = true },
            new() { Resource = "networks", ResourceId = denied.Id, CanRead = true, CanWrite = false }] };
        fixture.Db.AddRange(allowed, denied, visible, hidden, restricted, foreignOrg, foreign, role);
        (await fixture.Db.UserOrganizations.SingleAsync()).CustomRoleId = role.Id;
        await fixture.Db.SaveChangesAsync();
        var result = (NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!;
        result.Added.Should().Be(1); result.Skipped.Should().Be(1);
        result.Issues.Should().ContainSingle(x => x.AssetId == restricted.Id && x.Reason == "write-denied");
        result.Issues.Should().NotContain(x => x.Name == "HIDDEN" || x.Name == "FOREIGN");
        (await fixture.Db.IPEntries.SingleAsync()).AssetId.Should().Be(visible.Id);
    }

    [Theory]
    [InlineData("127.1")]
    [InlineData("010.0.0.1")]
    [InlineData("0x10.0.0.1")]
    [InlineData("fe80::1%3")]
    public void NonCanonicalOrScopedAddressesAreRejected(string address) => IpSubnetRange.TryAddress(address, out _).Should().BeFalse();

    [Fact]
    public async Task StaleAutomaticStateCannotOverwriteAConcurrentManualEdit()
    {
        var (_, org) = fixture.SeedUserWithOrg(); var subnet = Network(org.Id, "10.0.1.0/24"); var asset = Asset(org.Id, "10.0.1.9");
        var entry = new IPEntry { SubnetId = subnet.Id, AssetId = asset.Id, Ip = "10.0.1.8", Label = "Old", IsAutoManaged = true };
        fixture.Db.AddRange(subnet, asset, entry, Asset(org.Id, "10.0.1.10", "New server")); await fixture.Db.SaveChangesAsync();
        await fixture.Db.Database.ExecuteSqlInterpolatedAsync($"UPDATE IPEntries SET IsAutoManaged = 0, Label = 'Manual edit', Notes = 'Preserve' WHERE Id = {entry.Id}");
        (await Service().SyncAsync(org.Id)).StatusCode.Should().Be(409);
        fixture.Db.ChangeTracker.Clear();
        (await fixture.Db.IPEntries.CountAsync()).Should().Be(1, "all synchronization changes must roll back together");
        var saved = await fixture.Db.IPEntries.SingleAsync(); saved.Label.Should().Be("Manual edit"); saved.Notes.Should().Be("Preserve"); saved.IsAutoManaged.Should().BeFalse();
    }

    [Fact]
    public async Task InvalidAddressesAndRangesNeverDeleteExistingRows()
    {
        var (_, org) = fixture.SeedUserWithOrg(); var subnet = Network(org.Id, "not-cidr"); var asset = Asset(org.Id, "not-ip");
        var manual = new IPEntry { SubnetId = subnet.Id, Label = "Keep", Ip = "10.0.1.1" };
        fixture.Db.AddRange(subnet, asset, manual); await fixture.Db.SaveChangesAsync();
        var result = (NetworkSyncResultDto)(await Service().SyncAsync(org.Id)).Value!;
        result.IssueCount.Should().Be(2); (await fixture.Db.IPEntries.SingleAsync()).Id.Should().Be(manual.Id);
    }

    public void Dispose() => fixture.Dispose();
}
