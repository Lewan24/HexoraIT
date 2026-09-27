using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record AssetDto(Guid Id, string Name, AssetType Type, AssetStatus Status, string Location,
    string Owner, string Ip, DateTime UpdatedAt, bool Starred, List<string> Tags, string Notes, string? Serial);

public record CreateAssetDto(
    [Required, StringLength(200)] string Name, AssetType Type, AssetStatus Status,
    [StringLength(500)] string Location, [StringLength(200)] string Owner, [StringLength(45)] string Ip,
    [Required, StringCollection(100, 100)] List<string> Tags,
    [StringLength(100000)] string Notes, [StringLength(200)] string? Serial);

public record UpdateAssetDto(
    [Required, StringLength(200)] string Name, AssetType Type, AssetStatus Status,
    [StringLength(500)] string Location, [StringLength(200)] string Owner, [StringLength(45)] string Ip,
    [Required, StringCollection(100, 100)] List<string> Tags,
    [StringLength(100000)] string Notes, [StringLength(200)] string? Serial);
