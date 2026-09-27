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
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
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
        var item = mapper.Map<Subnet>(dto);
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
        mapper.Map(dto, item);
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
        var entry = mapper.Map<IPEntry>(dto);
        entry.SubnetId = subnetId;
        db.IPEntries.Add(entry);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status200OK, mapper.Map<IPEntryDto>(entry));
    }

    public async Task<ApiOperationResult> UpdateIpAsync(Guid subnetId, Guid entryId, UpdateIPEntryDto dto, CancellationToken cancellationToken = default)
    {
        var subnet = await db.Subnets.FirstOrDefaultAsync(item => item.Id == subnetId, cancellationToken);
        if (subnet is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(subnet.OrganizationId, "networks", true, subnet.Id)) return new(StatusCodes.Status403Forbidden);
        var entry = await db.IPEntries.FirstOrDefaultAsync(ip => ip.Id == entryId && ip.SubnetId == subnetId, cancellationToken);
        if (entry is null) return new(StatusCodes.Status404NotFound);
        if (!await AssetIsAvailableAsync(subnet.OrganizationId, dto.AssetId, cancellationToken)) return new(StatusCodes.Status400BadRequest, "IP entry references an unavailable asset.");
        mapper.Map(dto, entry);
        await db.SaveChangesAsync(cancellationToken);
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
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    private async Task<bool> AssetIsAvailableAsync(Guid organizationId, Guid? assetId, CancellationToken cancellationToken) =>
        assetId is null || await db.Assets.AnyAsync(asset => asset.Id == assetId && asset.OrganizationId == organizationId, cancellationToken);
}
