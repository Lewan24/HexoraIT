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
[Route("api/plans")]
public class PlansController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<PlanDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Plans.AsQueryable();
        if (organizationId is { } id) query = query.Where(p => p.OrganizationId == id);

        return Ok(await query.ProjectTo<PlanDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PlanDto>> GetById(Guid id)
    {
        var plan = await Db.Plans.FirstOrDefaultAsync(p => p.Id == id);
        return plan is null ? NotFound() : Ok(mapper.Map<PlanDto>(plan));
    }

    [HttpPost]
    public async Task<ActionResult<PlanDto>> Create([FromQuery] Guid organizationId, CreatePlanDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var plan = mapper.Map<Plan>(dto);
        plan.OrganizationId = organizationId;
        plan.CreatedAt = DateTime.UtcNow;
        Db.Plans.Add(plan);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, mapper.Map<PlanDto>(plan));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdatePlanDto dto)
    {
        var plan = await Db.Plans.FirstOrDefaultAsync(p => p.Id == id);
        if (plan is null) return NotFound();

        var check = await CheckWriteAccessAsync(plan.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, plan);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var plan = await Db.Plans.FirstOrDefaultAsync(p => p.Id == id);
        if (plan is null) return NotFound();

        var check = await CheckWriteAccessAsync(plan.OrganizationId);
        if (check is not null) return check;

        Db.Plans.Remove(plan);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}