using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IFileExplorerService
{
    Task<ApiOperationResult> GetFoldersAsync(Guid organizationId, Guid? parentFolderId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> CreateFolderAsync(Guid organizationId, CreateFolderDto dto, CancellationToken token = default);
    Task<ApiOperationResult> DeleteFolderAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> GetFilesAsync(Guid organizationId, Guid? folderId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> UploadAsync(Guid organizationId, Guid? folderId, IFormFile file, CancellationToken token = default);
    Task<ApiOperationResult> GetContentAsync(Guid id, bool download, CancellationToken token = default);
    Task<ApiOperationResult> DeleteFileAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> RenameFolderAsync(Guid id, RenameFolderDto dto, CancellationToken token = default);
    Task<ApiOperationResult> MoveFolderAsync(Guid id, MoveFolderDto dto, CancellationToken token = default);
    Task<ApiOperationResult> RenameFileAsync(Guid id, RenameFileDto dto, CancellationToken token = default);
    Task<ApiOperationResult> MoveFileAsync(Guid id, MoveFileDto dto, CancellationToken token = default);
}

public sealed class FileExplorerService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext,
    IFileStorage storage, ILogger<FileExplorerService> logger) : IFileExplorerService
{
    public async Task<ApiOperationResult> GetFoldersAsync(Guid organizationId, Guid? parentFolderId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "files")) return new(StatusCodes.Status403Forbidden);
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        var query = db.FileFolders.Where(folder => folder.OrganizationId == organizationId && folder.ParentFolderId == parentFolderId);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(folder => folder.Name).ThenBy(folder => folder.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<FileFolderDto>(mapper.ConfigurationProvider).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> CreateFolderAsync(Guid organizationId, CreateFolderDto dto, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "files", true)) return new(StatusCodes.Status403Forbidden);
        if (string.IsNullOrWhiteSpace(dto.Name)) return new(StatusCodes.Status400BadRequest, "Folder name is required.");
        if (dto.ParentFolderId is { } parentId && !await db.FileFolders.AnyAsync(folder => folder.Id == parentId && folder.OrganizationId == organizationId, token))
            return new(StatusCodes.Status400BadRequest, "Parent folder does not exist in this organization.");
        var folder = new FileFolder { OrganizationId = organizationId, Name = dto.Name.Trim(), ParentFolderId = dto.ParentFolderId };
        db.FileFolders.Add(folder); await db.SaveChangesAsync(token);
        return new(StatusCodes.Status200OK, mapper.Map<FileFolderDto>(folder));
    }

    public async Task<ApiOperationResult> DeleteFolderAsync(Guid id, CancellationToken token = default)
    {
        var folder = await db.FileFolders.FirstOrDefaultAsync(item => item.Id == id, token); if (folder is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(folder.OrganizationId, "files", true, folder.Id)) return new(StatusCodes.Status403Forbidden);
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var folderIds = new List<Guid> { id }; var frontier = new List<Guid> { id };
        while (frontier.Count > 0)
        {
            var children = await db.FileFolders.Where(item => item.ParentFolderId != null && frontier.Contains(item.ParentFolderId.Value))
                .Select(item => item.Id).ToListAsync(token);
            if (children.Count == 0) break; folderIds.AddRange(children); frontier = children;
        }
        var files = await db.StoredFiles.IgnoreQueryFilters().Where(file => file.OrganizationId == folder.OrganizationId && file.FolderId != null && folderIds.Contains(file.FolderId.Value)).ToListAsync(token);
        foreach (var file in files)
            if (!await userContext.HasPermissionAsync(folder.OrganizationId, "files", true, file.Id)) return new(StatusCodes.Status403Forbidden);
        db.StoredFiles.RemoveRange(files);
        db.FileFolders.RemoveRange(await db.FileFolders.Where(item => folderIds.Contains(item.Id)).ToListAsync(token));
        await db.SaveChangesAsync(token); await transaction.CommitAsync(token);
        foreach (var file in files) await DeleteBlobSafelyAsync(file.BlobPath, "after deleting its metadata");
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> GetFilesAsync(Guid organizationId, Guid? folderId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "files")) return new(StatusCodes.Status403Forbidden);
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        var query = db.StoredFiles.Where(file => file.OrganizationId == organizationId &&
            (file.FolderId == folderId || (folderId == null && !db.FileFolders.Any(folder => folder.Id == file.FolderId && folder.OrganizationId == organizationId))));
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(file => file.Name).ThenBy(file => file.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<StoredFileDto>(mapper.ConfigurationProvider).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> UploadAsync(Guid organizationId, Guid? folderId, IFormFile file, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "files", true)) return new(StatusCodes.Status403Forbidden);
        ValidatedUpload validated; try { validated = await FileUploadSecurity.ValidateAsync(file, 100_000_000, token); } catch (InvalidDataException ex) { return new(StatusCodes.Status400BadRequest, ex.Message); }
        if (folderId is { } target && !await db.FileFolders.AnyAsync(folder => folder.Id == target && folder.OrganizationId == organizationId, token))
            return new(StatusCodes.Status400BadRequest, "Target folder does not exist.");
        var path = await storage.SaveAsync(file.OpenReadStream(), validated.FileName, validated.ContentType);
        var stored = new StoredFile { OrganizationId = organizationId, Name = validated.FileName, MimeType = validated.ContentType, Size = file.Length, BlobPath = path, FolderId = folderId };
        db.StoredFiles.Add(stored);
        try { await db.SaveChangesAsync(token); } catch { await DeleteBlobSafelyAsync(path, "after a database failure"); throw; }
        return new(StatusCodes.Status200OK, mapper.Map<StoredFileDto>(stored));
    }

    public async Task<ApiOperationResult> GetContentAsync(Guid id, bool download, CancellationToken token = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(item => item.Id == id, token); if (file is null) return new(StatusCodes.Status404NotFound);
        var stream = await storage.OpenAsync(file.BlobPath); var canInline = FileUploadSecurity.CanRenderInline(file.Name, file.MimeType);
        return new(StatusCodes.Status200OK, new DocumentDownload(stream, canInline ? file.MimeType : "application/octet-stream",
            FileUploadSecurity.SafeDownloadName(file.Name), Inline: !download && canInline));
    }

    public async Task<ApiOperationResult> DeleteFileAsync(Guid id, CancellationToken token = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(item => item.Id == id, token); if (file is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(file.OrganizationId, "files", true, file.Id)) return new(StatusCodes.Status403Forbidden);
        db.StoredFiles.Remove(file); await db.SaveChangesAsync(token); await DeleteBlobSafelyAsync(file.BlobPath, "after deleting its metadata");
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> RenameFolderAsync(Guid id, RenameFolderDto dto, CancellationToken token = default)
    {
        var folder = await db.FileFolders.FirstOrDefaultAsync(item => item.Id == id, token); if (folder is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(folder.OrganizationId, "files", true, folder.Id)) return new(StatusCodes.Status403Forbidden);
        if (string.IsNullOrWhiteSpace(dto.Name)) return new(StatusCodes.Status400BadRequest, "Folder name is required.");
        folder.Name = dto.Name.Trim(); await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> MoveFolderAsync(Guid id, MoveFolderDto dto, CancellationToken token = default)
    {
        var folder = await db.FileFolders.FirstOrDefaultAsync(item => item.Id == id, token); if (folder is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(folder.OrganizationId, "files", true, folder.Id)) return new(StatusCodes.Status403Forbidden);
        if (dto.NewParentFolderId == id) return new(StatusCodes.Status400BadRequest, "A folder cannot be moved into itself.");
        if (dto.NewParentFolderId is { } targetId)
        {
            var current = await db.FileFolders.FirstOrDefaultAsync(item => item.Id == targetId && item.OrganizationId == folder.OrganizationId, token);
            if (current is null) return new(StatusCodes.Status400BadRequest, "Target folder does not exist.");
            while (current.ParentFolderId is { } parentId)
            {
                if (parentId == id) return new(StatusCodes.Status400BadRequest, "Cannot move a folder into its own subfolder.");
                current = await db.FileFolders.FirstOrDefaultAsync(item => item.Id == parentId, token);
                if (current is null) break;
            }
        }
        folder.ParentFolderId = dto.NewParentFolderId; await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> RenameFileAsync(Guid id, RenameFileDto dto, CancellationToken token = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(item => item.Id == id, token); if (file is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(file.OrganizationId, "files", true, file.Id)) return new(StatusCodes.Status403Forbidden);
        if (string.IsNullOrWhiteSpace(dto.Name)) return new(StatusCodes.Status400BadRequest, "File name is required.");
        file.Name = dto.Name.Trim(); await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> MoveFileAsync(Guid id, MoveFileDto dto, CancellationToken token = default)
    {
        var file = await db.StoredFiles.FirstOrDefaultAsync(item => item.Id == id, token); if (file is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(file.OrganizationId, "files", true, file.Id)) return new(StatusCodes.Status403Forbidden);
        if (dto.NewFolderId is { } target && !await db.FileFolders.AnyAsync(folder => folder.Id == target && folder.OrganizationId == file.OrganizationId, token))
            return new(StatusCodes.Status400BadRequest, "Target folder does not exist.");
        file.FolderId = dto.NewFolderId; await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }

    private async Task DeleteBlobSafelyAsync(string path, string reason) { try { await storage.DeleteAsync(path); } catch (Exception ex) { logger.LogWarning(ex, "Unable to remove blob {BlobPath} {Reason}.", path, reason); } }
}
