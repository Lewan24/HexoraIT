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
[Route("api/incidents")]
public class IncidentsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<IncidentDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Incidents.AsQueryable();
        if (organizationId is { } id) query = query.Where(i => i.OrganizationId == id);

        return Ok(await query.ProjectTo<IncidentDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IncidentDto>> GetById(Guid id)
    {
        var incident = await Db.Incidents.FirstOrDefaultAsync(i => i.Id == id);
        return incident is null ? NotFound() : Ok(mapper.Map<IncidentDto>(incident));
    }

    [HttpPost]
    public async Task<ActionResult<IncidentDto>> Create([FromQuery] Guid organizationId, CreateIncidentDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var incident = mapper.Map<Incident>(dto);
        incident.OrganizationId = organizationId;
        Db.Incidents.Add(incident);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = incident.Id }, mapper.Map<IncidentDto>(incident));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateIncidentDto dto)
    {
        var incident = await Db.Incidents.FirstOrDefaultAsync(i => i.Id == id);
        if (incident is null) return NotFound();

        var check = await CheckWriteAccessAsync(incident.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, incident);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var incident = await Db.Incidents.FirstOrDefaultAsync(i => i.Id == id);
        if (incident is null) return NotFound();

        var check = await CheckWriteAccessAsync(incident.OrganizationId);
        if (check is not null) return check;

        Db.Incidents.Remove(incident);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}