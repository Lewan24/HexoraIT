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
[Route("api/groups")]
public class GroupsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<GroupDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Groups.AsQueryable();
        if (organizationId is { } id) query = query.Where(g => g.OrganizationId == id);

        return Ok(await query.ProjectTo<GroupDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<GroupDto>> GetById(Guid id)
    {
        var group = await Db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        return group is null ? NotFound() : Ok(mapper.Map<GroupDto>(group));
    }

    [HttpPost]
    public async Task<ActionResult<GroupDto>> Create([FromQuery] Guid organizationId, CreateGroupDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var group = mapper.Map<Group>(dto);
        group.OrganizationId = organizationId;
        group.CreatedAt = DateTime.UtcNow;
        Db.Groups.Add(group);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = group.Id }, mapper.Map<GroupDto>(group));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateGroupDto dto)
    {
        var group = await Db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null) return NotFound();

        var check = await CheckWriteAccessAsync(group.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, group);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var group = await Db.Groups.FirstOrDefaultAsync(g => g.Id == id);
        if (group is null) return NotFound();

        var check = await CheckWriteAccessAsync(group.OrganizationId);
        if (check is not null) return check;

        Db.Groups.Remove(group);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}