using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IProjectService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateProjectDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateProjectDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class ProjectService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : IProjectService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "projects")) return new(StatusCodes.Status403Forbidden);
        var query = db.Projects.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<ProjectDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Projects.Where(candidate => candidate.Id == id)
            .ProjectTo<ProjectDto>(mapper.ConfigurationProvider).FirstOrDefaultAsync(cancellationToken);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, item);
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateProjectDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "projects", write: true)) return new(StatusCodes.Status403Forbidden);
        var item = mapper.Map<Project>(dto);
        item.OrganizationId = organizationId;
        db.Projects.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        var result = await db.Projects.Where(project => project.Id == item.Id)
            .ProjectTo<ProjectDto>(mapper.ConfigurationProvider).SingleAsync(cancellationToken);
        return new(StatusCodes.Status201Created, result, $"/api/projects/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateProjectDto dto, CancellationToken cancellationToken = default)
    {
        var item = await db.Projects.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "projects", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        mapper.Map(dto, item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Projects.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "projects", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        var taskIds = await db.Tasks.IgnoreQueryFilters().Where(task => task.OrganizationId == item.OrganizationId && task.ProjectId == id)
            .Select(task => task.Id).ToListAsync(cancellationToken);
        foreach (var taskId in taskIds)
            if (!await userContext.HasPermissionAsync(item.OrganizationId, "tasks", true, taskId)) return new(StatusCodes.Status403Forbidden);
        db.Projects.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }
}
