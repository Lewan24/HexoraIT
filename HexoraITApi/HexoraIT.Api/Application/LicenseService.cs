using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface ILicenseService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateLicenseDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateLicenseDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken cancellationToken = default);
}

public sealed class LicenseService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : ILicenseService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "licenses"))
            return new(StatusCodes.Status403Forbidden);
        var query = db.Licenses.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<LicenseDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(totalCount, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Licenses.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<LicenseDto>(item));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateLicenseDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "licenses", write: true))
            return new(StatusCodes.Status403Forbidden);
        var item = mapper.Map<License>(dto);
        item.OrganizationId = organizationId;
        item.Status = CalculateStatus(item.ExpiryDate);
        db.Licenses.Add(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status201Created, mapper.Map<LicenseDto>(item), $"/api/licenses/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateLicenseDto dto, CancellationToken cancellationToken = default)
    {
        var item = await db.Licenses.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "licenses", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        mapper.Map(dto, item);
        item.Status = CalculateStatus(item.ExpiryDate);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Licenses.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "licenses", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        db.Licenses.Remove(item);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var item = await db.Licenses.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "licenses", write: true, item.Id))
            return new(StatusCodes.Status403Forbidden);
        item.Starred = !item.Starred;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status200OK, new LicenseStarredDto(item.Starred));
    }

    private static LicenseStatus CalculateStatus(DateOnly expiryDate)
    {
        var days = expiryDate.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
        return days < 0 ? LicenseStatus.Expired : days <= 60 ? LicenseStatus.Expiring : LicenseStatus.Active;
    }
}

public sealed record LicenseStarredDto(bool Starred);
