using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record AssetDto(Guid Id, string Name, AssetType Type, AssetStatus Status, string Location,
    string Owner, string Ip, DateTime UpdatedAt, bool Starred, List<string> Tags, string Notes, string? Serial);

public record CreateAssetDto(string Name, AssetType Type, AssetStatus Status, string Location,
    string Owner, string Ip, List<string> Tags, string Notes, string? Serial);

public record UpdateAssetDto(string Name, AssetType Type, AssetStatus Status, string Location,
    string Owner, string Ip, List<string> Tags, string Notes, string? Serial);