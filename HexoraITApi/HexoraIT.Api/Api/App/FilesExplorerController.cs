using HexoraITApi.Api.Auth;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Net.Http.Headers;

namespace HexoraITApi.Api.App;

// TODO: Implement renaming files and folders
// TODO: Implement moving files from or to folders etc
// TODO: Find better way of preview office files in frontend app
[ApiController]
[Route("api/files")]
public class FilesExplorerController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage)
    : OrgScopedController(db, userContext)
{
    [HttpGet("folders")]
    public async Task<ActionResult<List<FileFolderDto>>> GetFolders([FromQuery] Guid organizationId, [FromQuery] Guid? parentFolderId)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;

        var folders = await Db.FileFolders
            .Where(f => f.OrganizationId == organizationId && f.ParentFolderId == parentFolderId)
            .OrderBy(f => f.Name)
            .ProjectTo<FileFolderDto>(mapper.ConfigurationProvider)
            .ToListAsync();
        return Ok(folders);
    }

    [HttpPost("folders")]
    public async Task<ActionResult<FileFolderDto>> CreateFolder([FromQuery] Guid organizationId, CreateFolderDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        if (string.IsNullOrWhiteSpace(dto.Name)) return BadRequest("Folder name is required.");

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

        var check = await CheckWriteAccessAsync(folder.OrganizationId);
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

        var filesToDelete = await Db.StoredFiles
            .Where(f => f.FolderId != null && folderIds.Contains(f.FolderId!.Value))
            .ToListAsync();

        foreach (var file in filesToDelete)
        {
            try { await storage.DeleteAsync(file.BlobPath); }
            catch { }
        }

        Db.StoredFiles.RemoveRange(filesToDelete);
        Db.FileFolders.RemoveRange(await Db.FileFolders.Where(f => folderIds.Contains(f.Id)).ToListAsync());
        await Db.SaveChangesAsync();
        await tx.CommitAsync();

        return NoContent();
    }

    [HttpGet]
    public async Task<ActionResult<List<StoredFileDto>>> GetFiles([FromQuery] Guid organizationId, [FromQuery] Guid? folderId)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;

        var files = await Db.StoredFiles
            .Where(f => f.OrganizationId == organizationId && f.FolderId == folderId)
            .OrderBy(f => f.Name)
            .ProjectTo<StoredFileDto>(mapper.ConfigurationProvider)
            .ToListAsync();
        return Ok(files);
    }

    [HttpPost("upload")]
    [RequestSizeLimit(100_000_000)] // 100 MB
    public async Task<ActionResult<StoredFileDto>> Upload([FromQuery] Guid organizationId, [FromQuery] Guid? folderId, IFormFile file)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        if (file.Length == 0) return BadRequest("File is empty.");

        if (folderId is { } fid && !await Db.FileFolders.AnyAsync(f => f.Id == fid && f.OrganizationId == organizationId))
            return BadRequest("Target folder does not exist.");

        var blobPath = await storage.SaveAsync(file.OpenReadStream(), file.FileName, file.ContentType);
        var stored = new StoredFile
        {
            OrganizationId = organizationId,
            Name = file.FileName,
            MimeType = string.IsNullOrEmpty(file.ContentType) ? "application/octet-stream" : file.ContentType,
            Size = file.Length,
            BlobPath = blobPath,
            FolderId = folderId,
        };
        Db.StoredFiles.Add(stored);
        await Db.SaveChangesAsync();
        return Ok(mapper.Map<StoredFileDto>(stored));
    }

    [HttpGet("{id:guid}/content")]
    public async Task<IActionResult> GetContent(Guid id)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var stream = await storage.OpenAsync(file.BlobPath);
        Response.Headers[HeaderNames.ContentDisposition] =
            new ContentDispositionHeaderValue("inline") { FileName = file.Name }.ToString();
        return File(stream, file.MimeType);
    }

    [HttpGet("{id:guid}/download")]
    public async Task<IActionResult> Download(Guid id)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var stream = await storage.OpenAsync(file.BlobPath);
        Response.Headers[HeaderNames.ContentDisposition] =
            new ContentDispositionHeaderValue("attachment") { FileName = file.Name }.ToString();
        return File(stream, file.MimeType);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteFile(Guid id)
    {
        var file = await Db.StoredFiles.FirstOrDefaultAsync(f => f.Id == id);
        if (file is null) return NotFound();

        var check = await CheckWriteAccessAsync(file.OrganizationId);
        if (check is not null) return check;

        try { await storage.DeleteAsync(file.BlobPath); }
        catch {  }

        Db.StoredFiles.Remove(file);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}