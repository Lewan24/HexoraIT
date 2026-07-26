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
[Route("api/tasks")]
public class TasksController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<WorkTaskDto>>> GetAll([FromQuery] Guid? organizationId, [FromQuery] Guid? projectId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Tasks.AsQueryable();
        if (organizationId is { } id) query = query.Where(t => t.OrganizationId == id);
        if (projectId is { } pid) query = query.Where(t => t.ProjectId == pid);

        return Ok(await query.ProjectTo<WorkTaskDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkTaskDto>> GetById(Guid id)
    {
        var task = await Db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        return task is null ? NotFound() : Ok(mapper.Map<WorkTaskDto>(task));
    }

    [HttpPost]
    public async Task<ActionResult<WorkTaskDto>> Create([FromQuery] Guid organizationId, CreateWorkTaskDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var task = mapper.Map<WorkTask>(dto);
        task.OrganizationId = organizationId;
        task.CreatedAt = DateTime.UtcNow;
        Db.Tasks.Add(task);
        await Db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = task.Id }, mapper.Map<WorkTaskDto>(task));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateWorkTaskDto dto)
    {
        var task = await Db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        var check = await CheckWriteAccessAsync(task.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, task);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var task = await Db.Tasks.FirstOrDefaultAsync(t => t.Id == id);
        if (task is null) return NotFound();

        var check = await CheckWriteAccessAsync(task.OrganizationId);
        if (check is not null) return check;

        Db.Tasks.Remove(task);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}