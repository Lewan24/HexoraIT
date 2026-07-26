using HexoraITApi.Api.Auth;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/dashboard-layout")]
public class DashboardController(AppDbContext db, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<DashboardLayoutDto?>> Get([FromQuery] Guid organizationId)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;

        var layout = await Db.DashboardLayouts
            .FirstOrDefaultAsync(l => l.OrganizationId == organizationId && l.UserId == userContext.UserId);

        return Ok(layout is null ? null : new DashboardLayoutDto(layout.SectionOrder, layout.HiddenSections));
    }

    [HttpPut]
    public async Task<IActionResult> Save([FromQuery] Guid organizationId, DashboardLayoutDto dto)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;

        var layout = await Db.DashboardLayouts
            .FirstOrDefaultAsync(l => l.OrganizationId == organizationId && l.UserId == userContext.UserId);

        if (layout is null)
        {
            layout = new DashboardLayout { UserId = userContext.UserId, OrganizationId = organizationId };
            Db.DashboardLayouts.Add(layout);
        }

        layout.SectionOrder = dto.SectionOrder;
        layout.HiddenSections = dto.HiddenSections;
        layout.UpdatedAt = DateTime.UtcNow;
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete]
    public async Task<IActionResult> Reset([FromQuery] Guid organizationId)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;

        var layout = await Db.DashboardLayouts
            .FirstOrDefaultAsync(l => l.OrganizationId == organizationId && l.UserId == userContext.UserId);
        if (layout is not null)
        {
            Db.DashboardLayouts.Remove(layout);
            await Db.SaveChangesAsync();
        }
        return NoContent();
    }
}