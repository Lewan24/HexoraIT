using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IIncidentService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateIncidentDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateIncidentDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class IncidentService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, INotificationService? notifications = null) : IIncidentService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "incidents"))
            return new(StatusCodes.Status403Forbidden);

        var query = db.Incidents.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<IncidentDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(totalCount, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Incidents.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<IncidentDto>(item));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateIncidentDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "incidents", write: true))
            return new(StatusCodes.Status403Forbidden);
        var item = mapper.Map<Incident>(dto);
        item.OrganizationId = organizationId;
        db.Incidents.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        if (notifications is not null)
            await notifications.NotifyAsync(organizationId, "incident_created", $"New incident: {item.Title}",
                $"A new {item.Severity} incident '{item.Title}' was created.", cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<IncidentDto>(item), $"/api/incidents/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateIncidentDto dto, CancellationToken cancellationToken = default)
    {
        var item = await db.Incidents.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "incidents", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        mapper.Map(dto, item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Incidents.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "incidents", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        db.Incidents.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }
}
