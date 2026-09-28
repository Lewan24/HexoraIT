using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IAssetService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateAssetDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateAssetDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class AssetService(
    AppDbContext db,
    IMapper mapper,
    ICurrentUserContext userContext) : IAssetService
{
    public async Task<ApiOperationResult> GetAllAsync(
        Guid? organizationId,
        PaginationParameters? pagination,
        CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");

        if (organizationId is { } organization &&
            !await userContext.HasPermissionAsync(organization, "assets"))
            return new(StatusCodes.Status403Forbidden);

        var query = db.Assets.AsQueryable();
        if (organizationId is { } id) query = query.Where(asset => asset.OrganizationId == id);

        var totalCount = await query.CountAsync(cancellationToken);
        var assets = await query
            .OrderBy(asset => asset.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .ProjectTo<AssetDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);

        return new(
            StatusCodes.Status200OK,
            assets,
            Pagination: new PaginationMetadata(totalCount, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return asset is null
            ? new(StatusCodes.Status404NotFound)
            : new(StatusCodes.Status200OK, mapper.Map<AssetDto>(asset));
    }

    public async Task<ApiOperationResult> CreateAsync(
        Guid organizationId,
        CreateAssetDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "assets", write: true))
            return new(StatusCodes.Status403Forbidden);

        var asset = mapper.Map<Asset>(dto);
        asset.OrganizationId = organizationId;
        asset.UpdatedAt = DateTime.UtcNow;
        db.Assets.Add(asset);
        await db.SaveChangesAsync(cancellationToken);
        return new(
            StatusCodes.Status201Created,
            mapper.Map<AssetDto>(asset),
            $"/api/assets/{asset.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(
        Guid id,
        UpdateAssetDto dto,
        CancellationToken cancellationToken = default)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (asset is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(asset.OrganizationId, "assets", write: true, asset.Id))
            return new(StatusCodes.Status403Forbidden);

        mapper.Map(dto, asset);
        asset.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (asset is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(asset.OrganizationId, "assets", write: true, asset.Id))
            return new(StatusCodes.Status403Forbidden);

        db.Assets.Remove(asset);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ToggleStarAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var asset = await db.Assets.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (asset is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(asset.OrganizationId, "assets", write: true, asset.Id))
            return new(StatusCodes.Status403Forbidden);

        asset.Starred = !asset.Starred;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status200OK, new AssetStarredDto(asset.Starred));
    }
}

public sealed record AssetStarredDto(bool Starred);
