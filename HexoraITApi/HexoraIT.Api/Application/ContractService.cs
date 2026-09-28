using AutoMapper;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IContractService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateContractDto dto, CancellationToken token = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateContractDto dto, CancellationToken token = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> UploadDocumentAsync(Guid id, IFormFile file, CancellationToken token = default);
    Task<ApiOperationResult> DownloadDocumentAsync(Guid id, CancellationToken token = default);
}

public sealed class ContractService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage,
    ILogger<ContractService> logger) : IContractService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "contracts")) return new(StatusCodes.Status403Forbidden);
        var query = db.Contracts.AsQueryable(); if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .Select(item => new ContractDto(item.Id, item.Name, item.Vendor, item.Category, item.StartDate, item.EndDate, item.Value, item.Currency,
                item.AutoRenew, item.Notes, item.Starred, item.Status, item.DocumentName == null ? null : new(item.DocumentName, item.DocumentMimeType ?? "", item.DocumentSize ?? 0)))
            .ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }
    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken token = default)
    { var item = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, token); return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<ContractDto>(item)); }
    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreateContractDto dto, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "contracts", true)) return new(StatusCodes.Status403Forbidden);
        var item = mapper.Map<Contract>(dto); item.OrganizationId = organizationId; item.Status = CalculateStatus(item.EndDate);
        db.Contracts.Add(item); await db.SaveChangesAsync(token);
        return new(StatusCodes.Status201Created, mapper.Map<ContractDto>(item), $"/api/contracts/{item.Id}");
    }
    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateContractDto dto, CancellationToken token = default)
    {
        var item = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "contracts", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        mapper.Map(dto, item); item.Status = CalculateStatus(item.EndDate); await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }
    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "contracts", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        var path = item.DocumentBlobPath; db.Contracts.Remove(item); await db.SaveChangesAsync(token);
        if (path is not null) await DeleteBlobSafelyAsync(path, "after deleting its metadata");
        return new(StatusCodes.Status204NoContent);
    }
    public async Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "contracts", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        item.Starred = !item.Starred; await db.SaveChangesAsync(token); return new(StatusCodes.Status200OK, new ContractStarredDto(item.Starred));
    }
    public async Task<ApiOperationResult> UploadDocumentAsync(Guid id, IFormFile file, CancellationToken token = default)
    {
        var item = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "contracts", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        ValidatedUpload validated; try { validated = await FileUploadSecurity.ValidateAsync(file, 20_000_000, token); } catch (InvalidDataException ex) { return new(StatusCodes.Status400BadRequest, ex.Message); }
        var oldPath = item.DocumentBlobPath; var path = await storage.SaveAsync(file.OpenReadStream(), validated.FileName, validated.ContentType);
        item.DocumentName = validated.FileName; item.DocumentMimeType = validated.ContentType; item.DocumentSize = file.Length; item.DocumentBlobPath = path;
        try { await db.SaveChangesAsync(token); } catch { await DeleteBlobSafelyAsync(path, "after a database failure"); throw; }
        if (oldPath is not null) await DeleteBlobSafelyAsync(oldPath, "after replacing it");
        return new(StatusCodes.Status200OK, mapper.Map<ContractDto>(item));
    }
    public async Task<ApiOperationResult> DownloadDocumentAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.Contracts.FirstOrDefaultAsync(x => x.Id == id, token); if (item?.DocumentBlobPath is null) return new(StatusCodes.Status404NotFound);
        var stream = await storage.OpenAsync(item.DocumentBlobPath);
        var type = FileUploadSecurity.CanRenderInline(item.DocumentName ?? "", item.DocumentMimeType ?? "") ? item.DocumentMimeType! : "application/octet-stream";
        return new(StatusCodes.Status200OK, new DocumentDownload(stream, type, FileUploadSecurity.SafeDownloadName(item.DocumentName ?? "download")));
    }
    private async Task DeleteBlobSafelyAsync(string path, string reason) { try { await storage.DeleteAsync(path); } catch (Exception ex) { logger.LogWarning(ex, "Unable to remove contract blob {BlobPath} {Reason}.", path, reason); } }
    private static ContractStatus CalculateStatus(DateOnly end) { var days = end.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber; return days < 0 ? ContractStatus.Expired : days <= 60 ? ContractStatus.Expiring : ContractStatus.Active; }
}
public sealed record ContractStarredDto(bool Starred);
