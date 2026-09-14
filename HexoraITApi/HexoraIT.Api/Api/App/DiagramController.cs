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

        var nodes = await Db.DiagramNodes.Where(n => n.OrganizationId == organizationId &&
            (n.AssetId == null || Db.Assets.Any(a => a.Id == n.AssetId && a.OrganizationId == organizationId))).ToListAsync();
        var nodeIds = nodes.Select(n => n.Id).ToList();
        var edges = await Db.DiagramEdges.Where(e => e.OrganizationId == organizationId &&
            nodeIds.Contains(e.SourceNodeId) && nodeIds.Contains(e.TargetNodeId)).ToListAsync();
        return Ok(new DiagramDto(mapper.Map<List<DiagramNodeDto>>(nodes), mapper.Map<List<DiagramEdgeDto>>(edges)));
    }

    [HttpPut]
    public async Task<IActionResult> Save([FromQuery] Guid organizationId, SaveDiagramDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        // Replacing a diagram must not silently delete nodes hidden by asset permissions.
        if (await Db.DiagramNodes.AnyAsync(n => n.OrganizationId == organizationId && n.AssetId != null &&
            !Db.Assets.Any(a => a.Id == n.AssetId && a.OrganizationId == organizationId))) return Forbid();
        var assetIds = dto.Nodes.Where(n => n.AssetId.HasValue).Select(n => n.AssetId!.Value).Distinct().ToList();
        if (await Db.Assets.CountAsync(a => a.OrganizationId == organizationId && assetIds.Contains(a.Id)) != assetIds.Count)
            return BadRequest("Diagram references an unavailable asset.");
        var nodeIds = dto.Nodes.Select(n => n.Id).ToHashSet();
        if (nodeIds.Count != dto.Nodes.Count || dto.Edges.Any(e => !nodeIds.Contains(e.Source) || !nodeIds.Contains(e.Target)))
            return BadRequest("Diagram contains invalid nodes or edges.");

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
