using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record GroupDto(Guid Id, string Name, GroupType Type, string Description, string Purpose,
    List<string> Members, List<Guid> LinkedAssets, List<string> Tags, DateTime CreatedAt);

public record CreateGroupDto(
    [Required, StringLength(200)] string Name, GroupType Type,
    [StringLength(100000)] string Description, [StringLength(100000)] string Purpose,
    [Required, StringCollection(1000, 200)] List<string> Members,
    [Required, CollectionCount(1000)] List<Guid> LinkedAssets,
    [Required, StringCollection(100, 100)] List<string> Tags);

public record UpdateGroupDto(
    [Required, StringLength(200)] string Name, GroupType Type,
    [StringLength(100000)] string Description, [StringLength(100000)] string Purpose,
    [Required, StringCollection(1000, 200)] List<string> Members,
    [Required, CollectionCount(1000)] List<Guid> LinkedAssets,
    [Required, StringCollection(100, 100)] List<string> Tags);
