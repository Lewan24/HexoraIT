using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IWorkTaskService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, Guid? projectId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateWorkTaskDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateWorkTaskDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class WorkTaskService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : IWorkTaskService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, Guid? projectId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "tasks")) return new(StatusCodes.Status403Forbidden);
        var query = db.Tasks.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        if (projectId is { } project) query = query.Where(item => item.ProjectId == project);
        var total = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<WorkTaskDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Tasks.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<WorkTaskDto>(item));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateWorkTaskDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "tasks", write: true)) return new(StatusCodes.Status403Forbidden);
        if (!await ProjectIsAvailableAsync(organizationId, dto.ProjectId, cancellationToken)) return new(StatusCodes.Status400BadRequest, "Project is not available in this organization.");
        var item = mapper.Map<WorkTask>(dto);
        item.OrganizationId = organizationId;
        item.CreatedAt = DateTime.UtcNow;
        item.CreatedByUserId = userContext.UserId;
        item.CreatedByName = await db.Users.Where(user => user.Id == userContext.UserId).Select(user => user.DisplayName).SingleAsync(cancellationToken);
        db.Tasks.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<WorkTaskDto>(item), $"/api/tasks/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateWorkTaskDto dto, CancellationToken cancellationToken = default)
    {
        var item = await db.Tasks.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "tasks", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        if (!await ProjectIsAvailableAsync(item.OrganizationId, dto.ProjectId, cancellationToken)) return new(StatusCodes.Status400BadRequest, "Project is not available in this organization.");
        mapper.Map(dto, item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Tasks.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "tasks", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        db.Tasks.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    private async Task<bool> ProjectIsAvailableAsync(Guid organizationId, Guid? projectId, CancellationToken cancellationToken) =>
        projectId is null || await db.Projects.AnyAsync(project => project.Id == projectId && project.OrganizationId == organizationId, cancellationToken);
}
