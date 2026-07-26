using AutoMapper;
using HexoraITApi.Api.Auth;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/diagram")]
public class DiagramController(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<DiagramDto>> Get([FromQuery] Guid organizationId)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;

        var nodes = await Db.DiagramNodes.Where(n => n.OrganizationId == organizationId).ToListAsync();
        var edges = await Db.DiagramEdges.Where(e => e.OrganizationId == organizationId).ToListAsync();
        return Ok(new DiagramDto(mapper.Map<List<DiagramNodeDto>>(nodes), mapper.Map<List<DiagramEdgeDto>>(edges)));
    }

    [HttpPut]
    public async Task<IActionResult> Save([FromQuery] Guid organizationId, SaveDiagramDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        await using var tx = await Db.Database.BeginTransactionAsync();

        var existingNodes = await Db.DiagramNodes.Where(n => n.OrganizationId == organizationId).ToListAsync();
        var existingEdges = await Db.DiagramEdges.Where(e => e.OrganizationId == organizationId).ToListAsync();
        Db.DiagramEdges.RemoveRange(existingEdges);
        Db.DiagramNodes.RemoveRange(existingNodes);
        await Db.SaveChangesAsync();

        var nodes = mapper.Map<List<DiagramNode>>(dto.Nodes);
        nodes.ForEach(n => n.OrganizationId = organizationId);
        var edges = mapper.Map<List<DiagramEdge>>(dto.Edges);
        edges.ForEach(e => e.OrganizationId = organizationId);

        Db.DiagramNodes.AddRange(nodes);
        Db.DiagramEdges.AddRange(edges);
        await Db.SaveChangesAsync();

        await tx.CommitAsync();
        return NoContent();
    }
}