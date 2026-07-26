using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Api.Auth;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/licenses")]
public class LicensesController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<LicenseDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Licenses.AsQueryable();
        if (organizationId is { } id) query = query.Where(l => l.OrganizationId == id);

        return Ok(await query.ProjectTo<LicenseDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<LicenseDto>> GetById(Guid id)
    {
        var license = await Db.Licenses.FirstOrDefaultAsync(l => l.Id == id);
        return license is null ? NotFound() : Ok(mapper.Map<LicenseDto>(license));
    }

    [HttpPost]
    public async Task<ActionResult<LicenseDto>> Create([FromQuery] Guid organizationId, CreateLicenseDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var license = mapper.Map<License>(dto);
        license.OrganizationId = organizationId;
        license.Status = CalcStatus(license.ExpiryDate);
        Db.Licenses.Add(license);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = license.Id }, mapper.Map<LicenseDto>(license));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateLicenseDto dto)
    {
        var license = await Db.Licenses.FirstOrDefaultAsync(l => l.Id == id);
        if (license is null) return NotFound();

        var check = await CheckWriteAccessAsync(license.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, license);
        license.Status = CalcStatus(license.ExpiryDate);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var license = await Db.Licenses.FirstOrDefaultAsync(l => l.Id == id);
        if (license is null) return NotFound();

        var check = await CheckWriteAccessAsync(license.OrganizationId);
        if (check is not null) return check;

        Db.Licenses.Remove(license);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var license = await Db.Licenses.FirstOrDefaultAsync(l => l.Id == id);
        if (license is null) return NotFound();

        var check = await CheckWriteAccessAsync(license.OrganizationId);
        if (check is not null) return check;

        license.Starred = !license.Starred;
        await Db.SaveChangesAsync();
        return Ok(new { license.Starred });
    }

    private static LicenseStatus CalcStatus(DateOnly expiry)
    {
        var days = expiry.DayNumber - DateOnly.FromDateTime(DateTime.UtcNow).DayNumber;
        return days < 0 ? LicenseStatus.Expired : days <= 60 ? LicenseStatus.Expiring : LicenseStatus.Active;
    }
}