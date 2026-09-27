using AutoMapper;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IDiagramService
{
    Task<ApiOperationResult> GetAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> SaveAsync(Guid organizationId, SaveDiagramDto dto, CancellationToken cancellationToken = default);
}

public sealed class DiagramService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext) : IDiagramService
{
    public async Task<ApiOperationResult> GetAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "diagram")) return new(StatusCodes.Status403Forbidden);
        var nodes = await db.DiagramNodes.Where(node => node.OrganizationId == organizationId &&
            (node.AssetId == null || db.Assets.Any(asset => asset.Id == node.AssetId && asset.OrganizationId == organizationId)))
            .ToListAsync(cancellationToken);
        var nodeIds = nodes.Select(node => node.Id).ToList();
        var edges = await db.DiagramEdges.Where(edge => edge.OrganizationId == organizationId &&
            nodeIds.Contains(edge.SourceNodeId) && nodeIds.Contains(edge.TargetNodeId)).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK,
            new DiagramDto(mapper.Map<List<DiagramNodeDto>>(nodes), mapper.Map<List<DiagramEdgeDto>>(edges)));
    }

    public async Task<ApiOperationResult> SaveAsync(Guid organizationId, SaveDiagramDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "diagram", write: true)) return new(StatusCodes.Status403Forbidden);
        if (dto.Nodes.Count > 2000 || dto.Edges.Count > 4000)
            return new(StatusCodes.Status400BadRequest, "Diagram exceeds the maximum number of nodes or edges.");
        if (await db.DiagramNodes.AnyAsync(node => node.OrganizationId == organizationId && node.AssetId != null &&
            !db.Assets.Any(asset => asset.Id == node.AssetId && asset.OrganizationId == organizationId), cancellationToken))
            return new(StatusCodes.Status403Forbidden);

        var assetIds = dto.Nodes.Where(node => node.AssetId.HasValue).Select(node => node.AssetId!.Value).Distinct().ToList();
        if (await db.Assets.CountAsync(asset => asset.OrganizationId == organizationId && assetIds.Contains(asset.Id), cancellationToken) != assetIds.Count)
            return new(StatusCodes.Status400BadRequest, "Diagram references an unavailable asset.");
        var nodeIds = dto.Nodes.Select(node => node.Id).ToHashSet();
        if (nodeIds.Count != dto.Nodes.Count || dto.Edges.Any(edge => !nodeIds.Contains(edge.Source) || !nodeIds.Contains(edge.Target)))
            return new(StatusCodes.Status400BadRequest, "Diagram contains invalid nodes or edges.");

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var existingNodes = await db.DiagramNodes.Where(node => node.OrganizationId == organizationId).ToListAsync(cancellationToken);
        var existingEdges = await db.DiagramEdges.Where(edge => edge.OrganizationId == organizationId).ToListAsync(cancellationToken);
        db.DiagramEdges.RemoveRange(existingEdges);
        db.DiagramNodes.RemoveRange(existingNodes);
        await db.SaveChangesAsync(cancellationToken);

        var nodes = mapper.Map<List<DiagramNode>>(dto.Nodes);
        nodes.ForEach(node => node.OrganizationId = organizationId);
        var edges = mapper.Map<List<DiagramEdge>>(dto.Edges);
        edges.ForEach(edge => edge.OrganizationId = organizationId);
        db.DiagramNodes.AddRange(nodes);
        db.DiagramEdges.AddRange(edges);
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }
}
