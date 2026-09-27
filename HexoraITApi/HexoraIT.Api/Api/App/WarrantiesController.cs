using AutoMapper;
using HexoraITApi.Api.Auth;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/warranties")]
public class WarrantiesController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage,
    ILogger<WarrantiesController>? logger = null)
    : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<WarrantyItemDto>>> GetAll(
        [FromQuery] Guid? organizationId,
        [FromQuery] PaginationParameters? pagination = null)
    {
        var paginationError = ResolvePagination(pagination, out var window);
        if (paginationError is not null) return paginationError;

        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.WarrantyItems.AsQueryable();
        if (organizationId is { } id) query = query.Where(w => w.OrganizationId == id);

        WritePaginationHeaders(await query.CountAsync(), window);
        return Ok(await query
            .OrderBy(w => w.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .Select(w => new WarrantyItemDto(
                w.Id,
                w.Name,
                w.Vendor,
                w.SerialNumber,
                w.PurchaseDate,
                w.WarrantyEndDate,
                w.WarrantyType,
                w.ContactName,
                w.ContactPhone,
                w.ContactEmail,
                w.Notes,
                w.AssetId,
                w.Starred,
                w.Status,
                w.DocumentName == null
                    ? null
                    : new WarrantyDocumentDto(
                        w.DocumentName,
                        w.DocumentMimeType ?? "",
                        w.DocumentSize ?? 0
                    )
            ))
            .ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WarrantyItemDto>> GetById(Guid id)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        return item is null ? NotFound() : Ok(mapper.Map<WarrantyItemDto>(item));
    }

    [HttpPost]
    public async Task<ActionResult<WarrantyItemDto>> Create([FromQuery] Guid organizationId, CreateWarrantyItemDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) 
            return check;
        
        if (await Db.WarrantyItems.AnyAsync(w => w.Id == Guid.Parse(dto.Id)))
            return Conflict("An item with this id already exists.");
        
        var item = mapper.Map<WarrantyItem>(dto);
        item.OrganizationId = organizationId;
        item.Status = CalcStatus(item.WarrantyEndDate);
        Db.WarrantyItems.Add(item);
        
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, mapper.Map<WarrantyItemDto>(item));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateWarrantyItemDto dto)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) return NotFound();

        var check = await CheckWriteAccessAsync(item.OrganizationId, resourceId: item.Id);
        if (check is not null) return check;

        mapper.Map(dto, item);
        item.Status = CalcStatus(item.WarrantyEndDate);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) 
            return NotFound();

        var check = await CheckWriteAccessAsync(item.OrganizationId, resourceId: item.Id);
        if (check is not null) 
            return check;

        var documentPath = item.DocumentBlobPath;
        Db.WarrantyItems.Remove(item);
        await Db.SaveChangesAsync();
        if (documentPath is not null)
        {
            try { await storage.DeleteAsync(documentPath); }
            catch (Exception exception)
            {
                logger?.LogWarning(exception, "Unable to remove warranty blob {BlobPath} after deleting its metadata.", documentPath);
            }
        }
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) return NotFound();

        var check = await CheckWriteAccessAsync(item.OrganizationId, resourceId: item.Id);
        if (check is not null) return check;

        item.Starred = !item.Starred;
        await Db.SaveChangesAsync();
        return Ok(new { item.Starred });
    }

    [HttpPost("{id:guid}/document")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadDocument(Guid id, IFormFile file)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        if (item is null)
            return NotFound();

        var check = await CheckWriteAccessAsync(item.OrganizationId, resourceId: item.Id);
        if (check is not null)
            return check;

        ValidatedUpload validated;
        try { validated = await FileUploadSecurity.ValidateAsync(file, 20_000_000, HttpContext?.RequestAborted ?? CancellationToken.None); }
        catch (InvalidDataException exception) { return BadRequest(exception.Message); }

        var oldPath = item.DocumentBlobPath;
        var path = await storage.SaveAsync(file.OpenReadStream(), validated.FileName, validated.ContentType);
        item.DocumentName = validated.FileName;
        item.DocumentMimeType = validated.ContentType;
        item.DocumentSize = file.Length;
        item.DocumentBlobPath = path;
        try { await Db.SaveChangesAsync(); }
        catch
        {
            try { await storage.DeleteAsync(path); }
            catch (Exception cleanupException)
            {
                logger?.LogWarning(cleanupException, "Unable to remove new warranty blob {BlobPath} after a database failure.", path);
            }
            throw;
        }
        if (oldPath is not null)
        {
            try { await storage.DeleteAsync(oldPath); }
            catch (Exception exception)
            {
                logger?.LogWarning(exception, "Unable to remove replaced warranty blob {BlobPath}.", oldPath);
            }
        }
        
        return Ok(mapper.Map<WarrantyItemDto>(item));
    }

    [HttpGet("{id:guid}/document")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        if (item?.DocumentBlobPath is null) return NotFound();

        var stream = await storage.OpenAsync(item.DocumentBlobPath);
        var contentType = FileUploadSecurity.CanRenderInline(item.DocumentName ?? "", item.DocumentMimeType ?? "")
            ? item.DocumentMimeType!
            : "application/octet-stream";
        return File(stream, contentType, FileUploadSecurity.SafeDownloadName(item.DocumentName ?? "download"));
    }

    private static WarrantyStatus CalcStatus(DateOnly end)
    {
        var days = end.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
        return days < 0 ? WarrantyStatus.Expired : days <= 60 ? WarrantyStatus.Expiring : WarrantyStatus.Active;
    }
}
