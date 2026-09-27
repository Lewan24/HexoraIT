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
[Route("api/contracts")]
public class ContractsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage,
    ILogger<ContractsController>? logger = null) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<ContractDto>>> GetAll(
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

        var query = Db.Contracts.AsQueryable();
        if (organizationId is { } id) query = query.Where(c => c.OrganizationId == id);

        WritePaginationHeaders(await query.CountAsync(), window);
        return Ok(await query
            .OrderBy(c => c.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .Select(c => new ContractDto(
                c.Id,
                c.Name,
                c.Vendor,
                c.Category,
                c.StartDate,
                c.EndDate,
                c.Value,
                c.Currency,
                c.AutoRenew,
                c.Notes,
                c.Starred,
                c.Status,
                c.DocumentName == null
                    ? null
                    : new ContractDocumentDto(
                        c.DocumentName,
                        c.DocumentMimeType ?? "",
                        c.DocumentSize ?? 0
                    )
            ))
            .ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ContractDto>> GetById(Guid id)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        return contract is null ? NotFound() : Ok(mapper.Map<ContractDto>(contract));
    }

    [HttpPost]
    public async Task<ActionResult<ContractDto>> Create([FromQuery] Guid organizationId, CreateContractDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var contract = mapper.Map<Contract>(dto);
        contract.OrganizationId = organizationId;
        contract.Status = CalcStatus(contract.EndDate);
        Db.Contracts.Add(contract);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = contract.Id }, mapper.Map<ContractDto>(contract));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateContractDto dto)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) return NotFound();

        var check = await CheckWriteAccessAsync(contract.OrganizationId, resourceId: contract.Id);
        if (check is not null) return check;

        mapper.Map(dto, contract);
        contract.Status = CalcStatus(contract.EndDate);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) return NotFound();

        var check = await CheckWriteAccessAsync(contract.OrganizationId, resourceId: contract.Id);
        if (check is not null) return check;

        var documentPath = contract.DocumentBlobPath;
        Db.Contracts.Remove(contract);
        await Db.SaveChangesAsync();
        if (documentPath is not null)
        {
            try { await storage.DeleteAsync(documentPath); }
            catch (Exception exception)
            {
                logger?.LogWarning(exception, "Unable to remove contract blob {BlobPath} after deleting its metadata.", documentPath);
            }
        }
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) return NotFound();

        var check = await CheckWriteAccessAsync(contract.OrganizationId, resourceId: contract.Id);
        if (check is not null) return check;

        contract.Starred = !contract.Starred;
        await Db.SaveChangesAsync();
        return Ok(new { contract.Starred });
    }
    
    [HttpPost("{id:guid}/document")]
    [RequestSizeLimit(20_000_000)]
    public async Task<IActionResult> UploadDocument(Guid id, IFormFile file)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) 
            return NotFound();

        var check = await CheckWriteAccessAsync(contract.OrganizationId, resourceId: contract.Id);
        if (check is not null) 
            return check;

        ValidatedUpload validated;
        try { validated = await FileUploadSecurity.ValidateAsync(file, 20_000_000, HttpContext?.RequestAborted ?? CancellationToken.None); }
        catch (InvalidDataException exception) { return BadRequest(exception.Message); }

        var oldPath = contract.DocumentBlobPath;
        var path = await storage.SaveAsync(file.OpenReadStream(), validated.FileName, validated.ContentType);
        contract.DocumentName = validated.FileName;
        contract.DocumentMimeType = validated.ContentType;
        contract.DocumentSize = file.Length;
        contract.DocumentBlobPath = path;
        try { await Db.SaveChangesAsync(); }
        catch
        {
            try { await storage.DeleteAsync(path); }
            catch (Exception cleanupException)
            {
                logger?.LogWarning(cleanupException, "Unable to remove new contract blob {BlobPath} after a database failure.", path);
            }
            throw;
        }
        if (oldPath is not null)
        {
            try { await storage.DeleteAsync(oldPath); }
            catch (Exception exception)
            {
                logger?.LogWarning(exception, "Unable to remove replaced contract blob {BlobPath}.", oldPath);
            }
        }
        
        return Ok(mapper.Map<ContractDto>(contract));
    }

    [HttpGet("{id:guid}/document")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        if (contract?.DocumentBlobPath is null) return NotFound();

        var stream = await storage.OpenAsync(contract.DocumentBlobPath);
        var contentType = FileUploadSecurity.CanRenderInline(contract.DocumentName ?? "", contract.DocumentMimeType ?? "")
            ? contract.DocumentMimeType!
            : "application/octet-stream";
        return File(stream, contentType, FileUploadSecurity.SafeDownloadName(contract.DocumentName ?? "download"));
    }

    private static ContractStatus CalcStatus(DateOnly end)
    {
        var days = end.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
        return days < 0 ? ContractStatus.Expired : days <= 60 ? ContractStatus.Expiring : ContractStatus.Active;
    }
}
