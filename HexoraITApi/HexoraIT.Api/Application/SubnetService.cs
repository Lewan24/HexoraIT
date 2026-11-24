using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface ISubnetService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateSubnetDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateSubnetDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> AddIpAsync(Guid subnetId, CreateIPEntryDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ReserveIpsAsync(Guid subnetId, ReserveIpEntriesDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateIpAsync(Guid subnetId, Guid entryId, UpdateIPEntryDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteIpAsync(Guid subnetId, Guid entryId, CancellationToken cancellationToken = default);
}

public sealed class SubnetService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : ISubnetService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "networks")) return new(StatusCodes.Status403Forbidden);
        var query = db.Subnets.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(item => item.SortIndex ?? int.MaxValue).ThenBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<SubnetDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Subnets.Include(subnet => subnet.Ips).FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<SubnetDto>(item));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateSubnetDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "networks", write: true)) return new(StatusCodes.Status403Forbidden);
        if (!IpSubnetRange.TryParse(dto.Cidr, out _)) return new(StatusCodes.Status400BadRequest, "Enter a valid IPv4 or IPv6 CIDR.");
        if (!IpSubnetRange.TryDhcpRange(dto.Cidr, dto.DhcpStart, dto.DhcpEnd, out var first, out var last)) return InvalidDhcp();
        var item = mapper.Map<Subnet>(dto);
        item.DhcpStart = first;
        item.DhcpEnd = last;
        item.OrganizationId = organizationId;
        db.Subnets.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<SubnetDto>(item), $"/api/subnets/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateSubnetDto dto, CancellationToken cancellationToken = default)
    {
        var item = await db.Subnets.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "networks", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        if (dto.Cidr != item.Cidr && !IpSubnetRange.TryParse(dto.Cidr, out _))
            return new(StatusCodes.Status400BadRequest, "Enter a valid IPv4 or IPv6 CIDR.");
        // Older clients omit both fields. Empty strings explicitly clear a configured range.
        var start = dto.DhcpStart is null && dto.DhcpEnd is null ? item.DhcpStart : dto.DhcpStart;
        var end = dto.DhcpStart is null && dto.DhcpEnd is null ? item.DhcpEnd : dto.DhcpEnd;
        if (!IpSubnetRange.TryDhcpRange(dto.Cidr, start, end, out var first, out var last)) return InvalidDhcp();
        mapper.Map(dto, item);
        item.DhcpStart = first;
        item.DhcpEnd = last;
        item.SyncRevision++;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Subnets.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "networks", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        db.Subnets.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> AddIpAsync(Guid subnetId, CreateIPEntryDto dto, CancellationToken cancellationToken = default)
    {
        var subnet = await db.Subnets.FirstOrDefaultAsync(item => item.Id == subnetId, cancellationToken);
        if (subnet is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(subnet.OrganizationId, "networks", true, subnet.Id)) return new(StatusCodes.Status403Forbidden);
        if (!await AssetIsAvailableAsync(subnet.OrganizationId, dto.AssetId, cancellationToken)) return new(StatusCodes.Status400BadRequest, "IP entry references an unavailable asset.");
        var (ip, error) = await ResolveEntryAddressAsync(subnet, dto.Ip, null, cancellationToken);
        if (error is not null) return error;
        var entry = mapper.Map<IPEntry>(dto);
        entry.Ip = ip;
        entry.SubnetId = subnetId;
        db.IPEntries.Add(entry);
        subnet.SyncRevision++;
        if (!await SaveIpChangesAsync(cancellationToken)) return ConcurrentIpChange();
        return new(StatusCodes.Status200OK, mapper.Map<IPEntryDto>(entry));
    }

    public async Task<ApiOperationResult> ReserveIpsAsync(Guid subnetId, ReserveIpEntriesDto dto, CancellationToken cancellationToken = default)
    {
        var subnet = await db.Subnets.FirstOrDefaultAsync(item => item.Id == subnetId, cancellationToken);
        if (subnet is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(subnet.OrganizationId, "networks", true, subnet.Id)) return new(StatusCodes.Status403Forbidden);
        if (dto.Targets is not { Count: >= 1 and <= 256 }) return new(StatusCodes.Status400BadRequest, "Select between 1 and 256 IP addresses.");

        const int maxNotesLength = 100_000;
        var description = dto.Description?.Trim() ?? "";
        if (description.Length > maxNotesLength) return new(StatusCodes.Status400BadRequest, "The reservation description is too long.");
        if (!IpSubnetRange.TryParse(subnet.Cidr, out var range)) return new(StatusCodes.Status400BadRequest, "Enter a valid IPv4 or IPv6 CIDR.");

        var targets = new Dictionary<System.Net.IPAddress, Guid?>();
        foreach (var target in dto.Targets)
        {
            if (target is null || !IpSubnetRange.TryAddress(target.Ip, out var address) || !range.ContainsHost(address))
                return new(StatusCodes.Status400BadRequest, "Select host addresses within this subnet.");
            if (!targets.TryAdd(address, target.EntryId))
                return new(StatusCodes.Status400BadRequest, "Each IP address may be selected only once.");
        }

        var entries = await db.IPEntries.Where(ip => ip.SubnetId == subnet.Id).ToListAsync(cancellationToken);
        var existing = entries
            .Select(entry => (Entry: entry, Address: IpSubnetRange.TryAddress(entry.Ip, out var address) ? address : null))
            .ToLookup(item => item.Address, item => item.Entry);
        var reservations = new List<(IPEntry Entry, bool IsNew, string Notes)>();
        foreach (var (address, expectedId) in targets)
        {
            var matches = existing[address].Take(2).ToList();
            var entry = matches.FirstOrDefault();
            if (matches.Count > 1 || entry?.Id != expectedId ||
                (entry is not null && (entry.Status != IPEntryStatus.Free || entry.AssetId.HasValue || entry.IsAutoManaged)))
                return new(StatusCodes.Status409Conflict, "A selected address is no longer available. No addresses were reserved.");

            var notes = entry?.Notes ?? "";
            if (description.Length > 0)
                notes = string.IsNullOrWhiteSpace(notes) ? description : notes.TrimEnd() + "\n\n" + description;
            if (notes.Length > maxNotesLength)
                return new(StatusCodes.Status400BadRequest, "The reservation description and existing notes are too long.");
            reservations.Add((entry ?? new IPEntry { SubnetId = subnet.Id, Ip = address.ToString() }, entry is null, notes));
        }

        foreach (var (entry, isNew, notes) in reservations)
        {
            entry.Status = IPEntryStatus.Reserved;
            entry.Notes = notes;
            if (isNew) db.IPEntries.Add(entry);
        }
        subnet.SyncRevision++;
        if (!await SaveIpChangesAsync(cancellationToken)) return ConcurrentIpChange();
        return new(StatusCodes.Status200OK, reservations.Select(item => mapper.Map<IPEntryDto>(item.Entry)).ToList());
    }

    public async Task<ApiOperationResult> UpdateIpAsync(Guid subnetId, Guid entryId, UpdateIPEntryDto dto, CancellationToken cancellationToken = default)
    {
        var subnet = await db.Subnets.FirstOrDefaultAsync(item => item.Id == subnetId, cancellationToken);
        if (subnet is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(subnet.OrganizationId, "networks", true, subnet.Id)) return new(StatusCodes.Status403Forbidden);
        var entry = await db.IPEntries.FirstOrDefaultAsync(ip => ip.Id == entryId && ip.SubnetId == subnetId, cancellationToken);
        if (entry is null) return new(StatusCodes.Status404NotFound);
        if (!await AssetIsAvailableAsync(subnet.OrganizationId, dto.AssetId, cancellationToken)) return new(StatusCodes.Status400BadRequest, "IP entry references an unavailable asset.");
        var (ip, error) = await ResolveEntryAddressAsync(subnet, dto.Ip, entry, cancellationToken);
        if (error is not null) return error;
        mapper.Map(dto, entry);
        entry.Ip = ip;
        entry.IsAutoManaged = false;
        subnet.SyncRevision++;
        if (!await SaveIpChangesAsync(cancellationToken)) return ConcurrentIpChange();
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteIpAsync(Guid subnetId, Guid entryId, CancellationToken cancellationToken = default)
    {
        var subnet = await db.Subnets.FirstOrDefaultAsync(item => item.Id == subnetId, cancellationToken);
        if (subnet is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(subnet.OrganizationId, "networks", true, subnet.Id)) return new(StatusCodes.Status403Forbidden);
        var entry = await db.IPEntries.FirstOrDefaultAsync(ip => ip.Id == entryId && ip.SubnetId == subnetId, cancellationToken);
        if (entry is null) return new(StatusCodes.Status404NotFound);
        db.IPEntries.Remove(entry);
        subnet.SyncRevision++;
        if (!await SaveIpChangesAsync(cancellationToken)) return ConcurrentIpChange();
        return new(StatusCodes.Status204NoContent);
    }

    private async Task<(string Ip, ApiOperationResult? Error)> ResolveEntryAddressAsync(
        Subnet subnet, string submitted, IPEntry? existing, CancellationToken token)
    {
        // Existing entries can still be maintained after a CIDR change or a legacy import.
        if (existing?.Ip == submitted.Trim()) return (existing.Ip, null);
        if (!IpSubnetRange.TryAddress(submitted, out var address) ||
            (IpSubnetRange.TryParse(subnet.Cidr, out var range) && !range.Contains(address)))
            return ("", new(StatusCodes.Status400BadRequest, "Enter an address in this subnet."));
        var existingId = existing?.Id;
        var assignedAddresses = await db.IPEntries.Where(ip => ip.SubnetId == subnet.Id && ip.Id != existingId)
            .Select(ip => ip.Ip).ToListAsync(token);
        if (assignedAddresses.Any(ip => IpSubnetRange.TryAddress(ip, out var assigned) && assigned.Equals(address)))
            return ("", new(StatusCodes.Status409Conflict, "This IP address already has an entry."));
        return (address.ToString(), null);
    }

    private async Task<bool> SaveIpChangesAsync(CancellationToken token)
    {
        try { await db.SaveChangesAsync(token); return true; }
        catch (DbUpdateConcurrencyException) { return false; }
    }

    private static ApiOperationResult InvalidDhcp() =>
        new(StatusCodes.Status400BadRequest, "Enter an ordered DHCP range of host addresses within the subnet.");

    private static ApiOperationResult ConcurrentIpChange() =>
        new(StatusCodes.Status409Conflict, "Network entries changed. Refresh and try again.");

    private async Task<bool> AssetIsAvailableAsync(Guid organizationId, Guid? assetId, CancellationToken cancellationToken) =>
        assetId is null || await db.Assets.AnyAsync(asset => asset.Id == assetId && asset.OrganizationId == organizationId, cancellationToken);
}
