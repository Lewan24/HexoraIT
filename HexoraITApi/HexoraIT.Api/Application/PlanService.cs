using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IPlanService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreatePlanDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdatePlanDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class PlanService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : IPlanService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "plans"))
            return new(StatusCodes.Status403Forbidden);
        var query = db.Plans.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<PlanDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(totalCount, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Plans.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<PlanDto>(item));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreatePlanDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "plans", write: true))
            return new(StatusCodes.Status403Forbidden);
        if (!await AssetsAreAvailableAsync(organizationId, dto.AssetIds, cancellationToken))
            return new(StatusCodes.Status400BadRequest, "Plan references an unavailable asset.");
        var item = mapper.Map<Plan>(dto);
        item.OrganizationId = organizationId;
        item.CreatedAt = DateTime.UtcNow;
        db.Plans.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<PlanDto>(item), $"/api/plans/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdatePlanDto dto, CancellationToken cancellationToken = default)
    {
        var item = await db.Plans.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "plans", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        if (!await AssetsAreAvailableAsync(item.OrganizationId, dto.AssetIds, cancellationToken))
            return new(StatusCodes.Status400BadRequest, "Plan references an unavailable asset.");
        mapper.Map(dto, item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Plans.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "plans", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        db.Plans.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    private async Task<bool> AssetsAreAvailableAsync(Guid organizationId, IEnumerable<Guid> assetIds, CancellationToken cancellationToken)
    {
        var ids = assetIds.Distinct().ToList();
        return ids.Count == 0 || await db.Assets.CountAsync(
            asset => asset.OrganizationId == organizationId && ids.Contains(asset.Id), cancellationToken) == ids.Count;
    }
}
