using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record DiagramNodeDto(Guid Id, DiagramDeviceType DeviceType, string Label, string? Ip, Guid? AssetId, double X, double Y, string? Color);
public record DiagramEdgeDto(Guid Id, Guid Source, Guid Target, string? Label, DiagramConnectionType ConnectionType);
public record DiagramDto(List<DiagramNodeDto> Nodes, List<DiagramEdgeDto> Edges);
public record SaveDiagramDto(List<DiagramNodeDto> Nodes, List<DiagramEdgeDto> Edges);