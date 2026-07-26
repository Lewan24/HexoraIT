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
[Route("api/contracts")]
public class ContractsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, IFileStorage storage) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<ContractDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Contracts.AsQueryable();
        if (organizationId is { } id) query = query.Where(c => c.OrganizationId == id);

        return Ok(await query
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

        var check = await CheckWriteAccessAsync(contract.OrganizationId);
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

        var check = await CheckWriteAccessAsync(contract.OrganizationId);
        if (check is not null) return check;

        Db.Contracts.Remove(contract);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        if (contract is null) return NotFound();

        var check = await CheckWriteAccessAsync(contract.OrganizationId);
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

        var check = await CheckWriteAccessAsync(contract.OrganizationId);
        if (check is not null) 
            return check;

        if (contract.DocumentBlobPath is not null) 
            await storage.DeleteAsync(contract.DocumentBlobPath);

        var path = await storage.SaveAsync(file.OpenReadStream(), file.FileName, file.ContentType);
        contract.DocumentName = file.FileName;
        contract.DocumentMimeType = file.ContentType;
        contract.DocumentSize = file.Length;
        contract.DocumentBlobPath = path;
        await Db.SaveChangesAsync();
        
        return Ok(mapper.Map<ContractDto>(contract));
    }

    [HttpGet("{id:guid}/document")]
    public async Task<IActionResult> DownloadDocument(Guid id)
    {
        var contract = await Db.Contracts.FirstOrDefaultAsync(c => c.Id == id);
        if (contract?.DocumentBlobPath is null) return NotFound();

        var stream = await storage.OpenAsync(contract.DocumentBlobPath);
        return File(stream, contract.DocumentMimeType ?? "application/octet-stream", contract.DocumentName);
    }

    private static ContractStatus CalcStatus(DateOnly end)
    {
        var days = end.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
        return days < 0 ? ContractStatus.Expired : days <= 60 ? ContractStatus.Expiring : ContractStatus.Active;
    }
}