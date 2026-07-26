using AutoMapper;
using HexoraITApi.Api.Auth;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/warranties")]
public class WarrantiesController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage)
    : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<WarrantyItemDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.WarrantyItems.AsQueryable();
        if (organizationId is { } id) query = query.Where(w => w.OrganizationId == id);

        return Ok(await query
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
        if (check is not null) return check;

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

        var check = await CheckWriteAccessAsync(item.OrganizationId);
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
        if (item is null) return NotFound();

        var check = await CheckWriteAccessAsync(item.OrganizationId);
        if (check is not null) return check;

        if (item.DocumentBlobPath is not null) await storage.DeleteAsync(item.DocumentBlobPath);
        Db.WarrantyItems.Remove(item);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        if (item is null) return NotFound();

        var check = await CheckWriteAccessAsync(item.OrganizationId);
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
        if (item is null) return NotFound();

        var check = await CheckWriteAccessAsync(item.OrganizationId);
        if (check is not null) return check;

        if (item.DocumentBlobPath is not null) await storage.DeleteAsync(item.DocumentBlobPath);

        var path = await storage.SaveAsync(file.OpenReadStream(), file.FileName, file.ContentType);
        item.DocumentName = file.FileName;
        item.DocumentMimeType = file.ContentType;
        item.DocumentSize = file.Length;
        item.DocumentBlobPath = path;
        await Db.SaveChangesAsync();
        return Ok(mapper.Map<WarrantyItemDto>(item));
    }

    [HttpGet("{id:guid}/document")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var item = await Db.WarrantyItems.FirstOrDefaultAsync(w => w.Id == id);
        if (item?.DocumentBlobPath is null) return NotFound();

        var stream = await storage.OpenAsync(item.DocumentBlobPath);
        return File(stream, item.DocumentMimeType ?? "application/octet-stream", item.DocumentName);
    }

    private static WarrantyStatus CalcStatus(DateOnly end)
    {
        var days = end.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
        return days < 0 ? WarrantyStatus.Expired : days <= 60 ? WarrantyStatus.Expiring : WarrantyStatus.Active;
    }
}