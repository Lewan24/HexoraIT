using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class IpReservationTests
{
    [Fact]
    public async Task BulkReservationCreatesAndUpdatesFreeEntriesWithASharedDescription()
    {
        using var fixture = new TestFixture();
        var (_, org) = fixture.SeedUserWithOrg();
        var subnet = new Subnet { OrganizationId = org.Id, Cidr = "10.0.0.0/24" };
        var saved = new IPEntry { SubnetId = subnet.Id, Ip = "10.0.0.10", Label = "Printer", Status = IPEntryStatus.Free, Notes = "Existing note" };
        fixture.Db.AddRange(subnet, saved);
        await fixture.Db.SaveChangesAsync();
        var service = new SubnetService(fixture.Db, fixture.Mapper, fixture.UserContext);

        var result = await service.ReserveIpsAsync(subnet.Id, new([new("10.0.0.2"), new("10.0.0.10", saved.Id)], "  New office  "));

        result.StatusCode.Should().Be(200);
        var reserved = result.Value.Should().BeOfType<List<IPEntryDto>>().Subject;
        reserved.Should().OnlyContain(entry => entry.Status == IPEntryStatus.Reserved);
        reserved.Should().ContainSingle(entry => entry.Ip == "10.0.0.2" && entry.Notes == "New office");
        reserved.Should().ContainSingle(entry => entry.Id == saved.Id && entry.Label == "Printer" && entry.Notes == "Existing note\n\nNew office");
        (await fixture.Db.IPEntries.CountAsync()).Should().Be(2);
        (await fixture.Db.OrganizationActivities.CountAsync(item => item.Resource == nameof(IPEntry))).Should().Be(3);
    }

    [Fact]
    public async Task ConflictingOrInvalidSelectionLeavesTheEntireBatchUnchanged()
    {
        using var fixture = new TestFixture();
        var (_, org) = fixture.SeedUserWithOrg();
        var subnet = new Subnet { OrganizationId = org.Id, Cidr = "192.168.0.0/24" };
        var occupied = new IPEntry { SubnetId = subnet.Id, Ip = "192.168.0.20", Status = IPEntryStatus.Used };
        var free = new IPEntry { SubnetId = subnet.Id, Ip = "192.168.0.30", Status = IPEntryStatus.Free };
        fixture.Db.AddRange(subnet, occupied, free);
        await fixture.Db.SaveChangesAsync();
        var service = new SubnetService(fixture.Db, fixture.Mapper, fixture.UserContext);

        (await service.ReserveIpsAsync(subnet.Id, new([new("192.168.0.10"), new(occupied.Ip, occupied.Id)], "Conflict")))
            .StatusCode.Should().Be(409);
        (await service.ReserveIpsAsync(subnet.Id, new([new("192.168.0.10"), new(free.Ip)], "Stale virtual row")))
            .StatusCode.Should().Be(409);
        (await service.ReserveIpsAsync(subnet.Id, new([new("192.168.0.10"), new("::ffff:192.168.0.10")], "")))
            .StatusCode.Should().Be(400);
        (await service.ReserveIpsAsync(subnet.Id, new([new("192.168.0.255")], null)))
            .StatusCode.Should().Be(400);

        (await fixture.Db.IPEntries.CountAsync()).Should().Be(2);
        free.Status.Should().Be(IPEntryStatus.Free);
        occupied.Status.Should().Be(IPEntryStatus.Used);
    }

    [Fact]
    public async Task ReadOnlyMemberCannotReserveAddresses()
    {
        using var fixture = new TestFixture();
        var (_, org) = fixture.SeedUserWithOrg(OrgRole.ReadOnly);
        var subnet = new Subnet { OrganizationId = org.Id, Cidr = "2001:db8::/64" };
        fixture.Db.Subnets.Add(subnet);
        await fixture.Db.SaveChangesAsync();
        var service = new SubnetService(fixture.Db, fixture.Mapper, fixture.UserContext);

        (await service.ReserveIpsAsync(subnet.Id, new([new("2001:db8::1")], ""))).StatusCode.Should().Be(403);
        (await fixture.Db.IPEntries.CountAsync()).Should().Be(0);
    }
}
