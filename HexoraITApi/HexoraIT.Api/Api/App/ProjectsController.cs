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
[Route("api/projects")]
public class ProjectsController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<ProjectDto>>> GetAll([FromQuery] Guid? organizationId)
    {
        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null)
                return check;
        }

        var query = Db.Projects.AsQueryable();

        if (organizationId is { } id)
            query = query.Where(p => p.OrganizationId == id);

        var projects = await query
            .ProjectTo<ProjectDto>(mapper.ConfigurationProvider)
            .ToListAsync();

        return Ok(projects);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ProjectDto>> GetById(Guid id)
    {
        var project = await Db.Projects
            .Where(p => p.Id == id)
            .ProjectTo<ProjectDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync();

        if (project is null)
            return NotFound();

        return Ok(project);
    }

    [HttpPost]
    public async Task<ActionResult<ProjectDto>> Create(
        [FromQuery] Guid organizationId,
        CreateProjectDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null)
            return check;

        var project = mapper.Map<Project>(dto);
        project.OrganizationId = organizationId;

        Db.Projects.Add(project);
        await Db.SaveChangesAsync();

        var result = await Db.Projects
            .Where(p => p.Id == project.Id)
            .ProjectTo<ProjectDto>(mapper.ConfigurationProvider)
            .SingleAsync();

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateProjectDto dto)
    {
        var project = await Db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var check = await CheckWriteAccessAsync(project.OrganizationId);
        if (check is not null) return check;

        mapper.Map(dto, project);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var project = await Db.Projects.FirstOrDefaultAsync(p => p.Id == id);
        if (project is null) return NotFound();

        var check = await CheckWriteAccessAsync(project.OrganizationId);
        if (check is not null) return check;

        Db.Projects.Remove(project);
        await Db.SaveChangesAsync();
        return NoContent();
    }
}