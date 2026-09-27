using HexoraITApi.Api.Auth;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/files")]
public class FilesExplorerController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage,
    ILogger<FilesExplorerController>? logger = null)
    : OrgScopedController(db, userContext)
{
    [HttpGet("folders")]
    public async Task<ActionResult<List<FileFolderDto>>> GetFolders(
        [FromQuery] Guid organizationId,
        [FromQuery] Guid? parentFolderId,
        [FromQuery] PaginationParameters? pagination = null)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;
        var paginationError = ResolvePagination(pagination, out var window);
        if (paginationError is not null) return paginationError;

        var query = Db.FileFolders
            .Where(f => f.OrganizationId == organizationId && f.ParentFolderId == parentFolderId);
        var totalCount = await query.CountAsync();
        var folders = await query
            .OrderBy(f => f.Name)
            .ThenBy(f => f.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .ProjectTo<FileFolderDto>(mapper.ConfigurationProvider)
            .ToListAsync();
        WritePaginationHeaders(totalCount, window);
        return Ok(folders);
    }

    [HttpPost("folders")]
    public async Task<ActionResult<FileFolderDto>> CreateFolder([FromQuery] Guid organizationId, CreateFolderDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Folder name is required.");

        if (dto.ParentFolderId is { } parentId &&
            !await Db.FileFolders.AnyAsync(f => f.Id == parentId && f.OrganizationId == organizationId))
            return BadRequest("Parent folder does not exist in this organization.");

        var folder = new FileFolder { OrganizationId = organizationId, Name = dto.Name.Trim(), ParentFolderId = dto.ParentFolderId };
        Db.FileFolders.Add(folder);
        await Db.SaveChangesAsync();
        return Ok(mapper.Map<FileFolderDto>(folder));
    }

    [HttpDelete("folders/{id:guid}")]
    public async Task<IActionResult> DeleteFolder(Guid id)
    {
        var folder = await Db.FileFolders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null) return NotFound();

        var check = await CheckWriteAccessAsync(folder.OrganizationId, resourceId: folder.Id);
        if (check is not null) return check;

        await using var tx = await Db.Database.BeginTransactionAsync();

        var folderIds = new List<Guid> { id };
        var frontier = new List<Guid> { id };
        while (frontier.Count > 0)
        {
            var children = await Db.FileFolders
                .Where(f => f.ParentFolderId != null && frontier.Contains(f.ParentFolderId!.Value))
                .Select(f => f.Id).ToListAsync();
            if (children.Count == 0) break;
            folderIds.AddRange(children);
            frontier = children;
        }

        // Inspect all descendants in this organization before a cascading delete.
        var filesToDelete = await Db.StoredFiles.IgnoreQueryFilters()
            .Where(f => f.OrganizationId == folder.OrganizationId && f.FolderId != null && folderIds.Contains(f.FolderId!.Value))
            .ToListAsync();

        foreach (var file in filesToDelete)
        {
            if (!await userContext.HasPermissionAsync(folder.OrganizationId, "files", true, file.Id)) return Forbid();
        }

        Db.StoredFiles.RemoveRange(filesToDelete);
        Db.FileFolders.RemoveRange(await Db.FileFolders.Where(f => folderIds.Contains(f.Id)).ToListAsync());
        await Db.SaveChangesAsync();
        await tx.CommitAsync();

        foreach (var file in filesToDelete)
        {
            try { await storage.DeleteAsync(file.BlobPath); }
            catch (Exception exception)
            {
                logger?.LogWarning(exception, "Unable to remove blob {BlobPath} after deleting its metadata.", file.BlobPath);
            }
        }

        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<List<StoredFileDto>>> GetFiles(
        [FromQuery] Guid organizationId,
        [FromQuery] Guid? folderId,
        [FromQuery] PaginationParameters? pagination = null)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;
        var paginationError = ResolvePagination(pagination, out var window);
        if (paginationError is not null) return paginationError;

        var query = Db.StoredFiles
            .Where(f => f.OrganizationId == organizationId &&
                (f.FolderId == folderId || (folderId == null &&
                    !Db.FileFolders.Any(folder => folder.Id == f.FolderId && folder.OrganizationId == organizationId))));
        var totalCount = await query.CountAsync();
        var files = await query
            .OrderBy(f => f.Name)
            .ThenBy(f => f.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .ProjectTo<StoredFileDto>(mapper.ConfigurationProvider)
            .ToListAsync();
        WritePaginationHeaders(totalCount, window);
        return Ok(files);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(100_000_000)] // 100 MB
    public async Task<ActionResult<StoredFileDto>> Upload([FromQuery] Guid organizationId, [FromQuery] Guid? folderId, IFormFile file)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        ValidatedUpload validated;
        try { validated = await FileUploadSecurity.ValidateAsync(file, 100_000_000, HttpContext?.RequestAborted ?? CancellationToken.None); }
        catch (InvalidDataException exception) { return BadRequest(exception.Message); }

        if (folderId is { } fid && !await Db.FileFolders.AnyAsync(f => f.Id == fid && f.OrganizationId == organizationId))
            return BadRequest("Target folder does not exist.");

        var blobPath = await storage.SaveAsync(file.OpenReadStream(), validated.FileName, validated.ContentType);
        var stored = new StoredFile
        {
            OrganizationId = organizationId,
            Name = validated.FileName,
            MimeType = validated.ContentType,
            Size = file.Length,
            BlobPath = blobPath,
            FolderId = folderId,
        };
        Db.StoredFiles.Add(stored);
        try { await Db.SaveChangesAsync(); }
        catch
        {
            try { await storage.DeleteAsync(blobPath); }
            catch (Exception cleanupException)
            {
                logger?.LogWarning(cleanupException, "Unable to remove new blob {BlobPath} after a database failure.", blobPath);
            }
            throw;
        }
        return Ok(mapper.Map<StoredFileDto>(stored));
    }

    [HttpGet("{id:guid}/content")]
    public async Task<IActionResult> GetContent(Guid id)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var stream = await storage.OpenAsync(file.BlobPath);
        var inline = FileUploadSecurity.CanRenderInline(file.Name, file.MimeType);
        Response.Headers[HeaderNames.ContentDisposition] =
            new ContentDispositionHeaderValue(inline ? "inline" : "attachment")
            { FileName = FileUploadSecurity.SafeDownloadName(file.Name) }.ToString();
        return File(stream, inline ? file.MimeType : "application/octet-stream");
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var stream = await storage.OpenAsync(file.BlobPath);
        Response.Headers[HeaderNames.ContentDisposition] =
            new ContentDispositionHeaderValue("attachment")
            { FileName = FileUploadSecurity.SafeDownloadName(file.Name) }.ToString();
        var contentType = FileUploadSecurity.CanRenderInline(file.Name, file.MimeType)
            ? file.MimeType
            : "application/octet-stream";
        return File(stream, contentType);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFile(Guid id)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var check = await CheckWriteAccessAsync(file.OrganizationId, resourceId: file.Id);
        if (check is not null) return check;

        Db.StoredFiles.Remove(file);
        await Db.SaveChangesAsync();
        try { await storage.DeleteAsync(file.BlobPath); }
        catch (Exception exception)
        {
            logger?.LogWarning(exception, "Unable to remove blob {BlobPath} after deleting its metadata.", file.BlobPath);
        }
        return NoContent();
    }

    [HttpPatch("folders/{id:guid}")]
    public async Task<IActionResult> RenameFolder(Guid id, RenameFolderDto dto)
    {
        var folder = await Db.FileFolders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null) return NotFound();

        var check = await CheckWriteAccessAsync(folder.OrganizationId, resourceId: folder.Id);
        if (check is not null) return check;

        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Folder name is required.");

        folder.Name = dto.Name.Trim();
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("folders/{id:guid}/move")]
    public async Task<IActionResult> MoveFolder(Guid id, MoveFolderDto dto)
    {
        var folder = await Db.FileFolders.FirstOrDefaultAsync(f => f.Id == id);
        if (folder is null) return NotFound();

        var check = await CheckWriteAccessAsync(folder.OrganizationId, resourceId: folder.Id);
        if (check is not null) return check;

        if (dto.NewParentFolderId == id) return BadRequest("A folder cannot be moved into itself.");

        if (dto.NewParentFolderId is { } targetId)
        {
            var target = await Db.FileFolders.FirstOrDefaultAsync(f => f.Id == targetId && f.OrganizationId == folder.OrganizationId);
            if (target is null) return BadRequest("Target folder does not exist.");

            var current = target;
            while (current.ParentFolderId is { } parentId)
            {
                if (parentId == id) return BadRequest("Cannot move a folder into its own subfolder.");
                current = await Db.FileFolders.FirstOrDefaultAsync(f => f.Id == parentId);
                if (current is null) break;
            }
        }

        folder.ParentFolderId = dto.NewParentFolderId;
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> RenameFile(Guid id, RenameFileDto dto)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var check = await CheckWriteAccessAsync(file.OrganizationId, resourceId: file.Id);
        if (check is not null) return check;

        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("File name is required.");

        file.Name = dto.Name.Trim();
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/move")]
    public async Task<IActionResult> MoveFile(Guid id, MoveFileDto dto)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var check = await CheckWriteAccessAsync(file.OrganizationId, resourceId: file.Id);
        if (check is not null) return check;

        if (dto.NewFolderId is { } targetId &&
            !await Db.FileFolders.AnyAsync(f => f.Id == targetId && f.OrganizationId == file.OrganizationId))
            return BadRequest("Target folder does not exist.");

        file.FolderId = dto.NewFolderId;
        await Db.SaveChangesAsync();
        return NoContent();
    }
}
