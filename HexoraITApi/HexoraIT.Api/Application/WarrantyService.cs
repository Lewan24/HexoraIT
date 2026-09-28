using AutoMapper;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IWarrantyService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateWarrantyItemDto dto, CancellationToken token = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateWarrantyItemDto dto, CancellationToken token = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> UploadDocumentAsync(Guid id, IFormFile file, CancellationToken token = default);
    Task<ApiOperationResult> DownloadDocumentAsync(Guid id, CancellationToken token = default);
}

public sealed class WarrantyService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage,
    ILogger<WarrantyService> logger) : IWarrantyService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "warranty")) return new(StatusCodes.Status403Forbidden);
        var query = db.WarrantyItems.AsQueryable(); if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .Select(item => new WarrantyItemDto(item.Id, item.Name, item.Vendor, item.SerialNumber, item.PurchaseDate, item.WarrantyEndDate,
                item.WarrantyType, item.ContactName, item.ContactPhone, item.ContactEmail, item.Notes, item.AssetId, item.Starred, item.Status,
                item.DocumentName == null ? null : new(item.DocumentName, item.DocumentMimeType ?? "", item.DocumentSize ?? 0))).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }
    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken token = default)
    { var item = await db.WarrantyItems.FirstOrDefaultAsync(x => x.Id == id, token); return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<WarrantyItemDto>(item)); }
    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateWarrantyItemDto dto, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "warranty", true)) return new(StatusCodes.Status403Forbidden);
        if (!Guid.TryParse(dto.Id, out var requestedId)) return new(StatusCodes.Status400BadRequest, "Warranty id must be a valid GUID.");
        if (await db.WarrantyItems.AnyAsync(item => item.Id == requestedId, token)) return new(StatusCodes.Status409Conflict, "An item with this id already exists.");
        if (!await AssetIsAvailableAsync(organizationId, dto.AssetId, token)) return new(StatusCodes.Status400BadRequest, "Warranty references an unavailable asset.");
        var item = mapper.Map<WarrantyItem>(dto); item.OrganizationId = organizationId; item.Status = CalculateStatus(item.WarrantyEndDate);
        db.WarrantyItems.Add(item); await db.SaveChangesAsync(token);
        return new(StatusCodes.Status201Created, mapper.Map<WarrantyItemDto>(item), $"/api/warranties/{item.Id}");
    }
    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateWarrantyItemDto dto, CancellationToken token = default)
    {
        var item = await db.WarrantyItems.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "warranty", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        if (!Guid.TryParse(dto.Id, out var dtoId) || dtoId != id) return new(StatusCodes.Status400BadRequest, "Warranty id must match the route id.");
        if (!await AssetIsAvailableAsync(item.OrganizationId, dto.AssetId, token)) return new(StatusCodes.Status400BadRequest, "Warranty references an unavailable asset.");
        mapper.Map(dto, item); item.Status = CalculateStatus(item.WarrantyEndDate); await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }
    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.WarrantyItems.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "warranty", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        var path = item.DocumentBlobPath; db.WarrantyItems.Remove(item); await db.SaveChangesAsync(token);
        if (path is not null) await DeleteBlobSafelyAsync(path, "after deleting its metadata"); return new(StatusCodes.Status204NoContent);
    }
    public async Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.WarrantyItems.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "warranty", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        item.Starred = !item.Starred; await db.SaveChangesAsync(token); return new(StatusCodes.Status200OK, new WarrantyStarredDto(item.Starred));
    }
    public async Task<ApiOperationResult> UploadDocumentAsync(Guid id, IFormFile file, CancellationToken token = default)
    {
        var item = await db.WarrantyItems.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "warranty", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        ValidatedUpload validated; try { validated = await FileUploadSecurity.ValidateAsync(file, 20_000_000, token); } catch (InvalidDataException ex) { return new(StatusCodes.Status400BadRequest, ex.Message); }
        var oldPath = item.DocumentBlobPath;
        await using var content = file.OpenReadStream();
        var path = await storage.SaveAsync(content, validated.FileName, validated.ContentType);
        item.DocumentName = validated.FileName; item.DocumentMimeType = validated.ContentType; item.DocumentSize = file.Length; item.DocumentBlobPath = path;
        try { await db.SaveChangesAsync(token); } catch { await DeleteBlobSafelyAsync(path, "after a database failure"); throw; }
        if (oldPath is not null) await DeleteBlobSafelyAsync(oldPath, "after replacing it");
        return new(StatusCodes.Status200OK, mapper.Map<WarrantyItemDto>(item));
    }
    public async Task<ApiOperationResult> DownloadDocumentAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.WarrantyItems.FirstOrDefaultAsync(x => x.Id == id, token); if (item?.DocumentBlobPath is null) return new(StatusCodes.Status404NotFound);
        var stream = await storage.OpenAsync(item.DocumentBlobPath);
        var type = FileUploadSecurity.CanRenderInline(item.DocumentName ?? "", item.DocumentMimeType ?? "") ? item.DocumentMimeType! : "application/octet-stream";
        return new(StatusCodes.Status200OK, new DocumentDownload(stream, type, FileUploadSecurity.SafeDownloadName(item.DocumentName ?? "download")));
    }
    private Task<bool> AssetIsAvailableAsync(Guid organizationId, Guid? assetId, CancellationToken token) => assetId is null ? Task.FromResult(true) : db.Assets.AnyAsync(asset => asset.Id == assetId && asset.OrganizationId == organizationId, token);
    private async Task DeleteBlobSafelyAsync(string path, string reason) { try { await storage.DeleteAsync(path); } catch (Exception ex) { logger.LogWarning(ex, "Unable to remove warranty blob {BlobPath} {Reason}.", path, reason); } }
    private static WarrantyStatus CalculateStatus(DateOnly end) { var days = end.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber; return days < 0 ? WarrantyStatus.Expired : days <= 60 ? WarrantyStatus.Expiring : WarrantyStatus.Active; }
}
public sealed record WarrantyStarredDto(bool Starred);
