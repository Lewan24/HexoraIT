using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IGroupService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateGroupDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateGroupDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class GroupService(
    AppDbContext db,
    IMapper mapper,
    ICurrentUserContext userContext) : IGroupService
{
    public async Task<ApiOperationResult> GetAllAsync(
        Guid? organizationId,
        PaginationParameters? pagination,
        CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization &&
            !await userContext.HasPermissionAsync(organization, "groups"))
            return new(StatusCodes.Status403Forbidden);

        var query = db.Groups.AsQueryable();
        if (organizationId is { } id) query = query.Where(group => group.OrganizationId == id);
        var totalCount = await query.CountAsync(cancellationToken);
        var groups = await query
            .OrderBy(group => group.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .ProjectTo<GroupDto>(mapper.ConfigurationProvider)
            .ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, groups,
            Pagination: new PaginationMetadata(totalCount, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return group is null
            ? new(StatusCodes.Status404NotFound)
            : new(StatusCodes.Status200OK, mapper.Map<GroupDto>(group));
    }

    public async Task<ApiOperationResult> CreateAsync(
        Guid organizationId,
        CreateGroupDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "groups", write: true))
            return new(StatusCodes.Status403Forbidden);
        if (!await LinkedAssetsAreAvailableAsync(organizationId, dto.LinkedAssets, cancellationToken))
            return new(StatusCodes.Status400BadRequest, "Group references an unavailable asset.");

        var group = mapper.Map<Group>(dto);
        group.OrganizationId = organizationId;
        group.CreatedAt = DateTime.UtcNow;
        db.Groups.Add(group);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<GroupDto>(group), $"/api/groups/{group.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(
        Guid id,
        UpdateGroupDto dto,
        CancellationToken cancellationToken = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (group is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(group.OrganizationId, "groups", write: true, group.Id))
            return new(StatusCodes.Status403Forbidden);
        if (!await LinkedAssetsAreAvailableAsync(group.OrganizationId, dto.LinkedAssets, cancellationToken))
            return new(StatusCodes.Status400BadRequest, "Group references an unavailable asset.");

        mapper.Map(dto, group);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var group = await db.Groups.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (group is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(group.OrganizationId, "groups", write: true, group.Id))
            return new(StatusCodes.Status403Forbidden);

        db.Groups.Remove(group);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    private async Task<bool> LinkedAssetsAreAvailableAsync(
        Guid organizationId,
        IEnumerable<Guid> linkedAssets,
        CancellationToken cancellationToken)
    {
        var ids = linkedAssets.Distinct().ToList();
        if (ids.Count == 0) return true;
        return await db.Assets.CountAsync(
            asset => asset.OrganizationId == organizationId && ids.Contains(asset.Id),
            cancellationToken) == ids.Count;
    }
}
