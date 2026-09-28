using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record DiagramNodeDto(
    Guid Id,
    DiagramDeviceType DeviceType,
    [StringLength(200)] string Label,
    [StringLength(45)] string? Ip,
    Guid? AssetId,
    double X,
    double Y,
    [StringLength(20)] string? Color);
public record DiagramEdgeDto(
    Guid Id,
    Guid Source,
    Guid Target,
    [StringLength(200)] string? Label,
    DiagramConnectionType ConnectionType);
public record DiagramDto(List<DiagramNodeDto> Nodes, List<DiagramEdgeDto> Edges);
public record SaveDiagramDto(
    [Required, CollectionCount(2000)] List<DiagramNodeDto> Nodes,
    [Required, CollectionCount(4000)] List<DiagramEdgeDto> Edges);
