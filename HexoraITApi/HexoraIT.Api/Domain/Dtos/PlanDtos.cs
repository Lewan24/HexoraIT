using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record PlanDto(
    Guid Id,
    string Title,
    string Description,
    Priority Priority,
    PlanStatus Status,
    DateOnly TargetDate,
    List<string> Tags,
    List<Guid> AssetIds,
    decimal EstimatedCost,
    DateTime CreatedAt
);

public record CreatePlanDto(
    [Required, StringLength(200)] string Title,
    [StringLength(100000)] string Description,
    Priority Priority,
    PlanStatus Status,
    DateOnly TargetDate,
    [Required, StringCollection(100, 100)] List<string> Tags,
    [Required, CollectionCount(1000)] List<Guid> AssetIds,
    [Range(typeof(decimal), "-9999999999999999.99", "9999999999999999.99")] decimal EstimatedCost
);

public record UpdatePlanDto(
    [Required, StringLength(200)] string Title,
    [StringLength(100000)] string Description,
    Priority Priority,
    PlanStatus Status,
    DateOnly TargetDate,
    [Required, StringCollection(100, 100)] List<string> Tags,
    [Required, CollectionCount(1000)] List<Guid> AssetIds,
    [Range(typeof(decimal), "-9999999999999999.99", "9999999999999999.99")] decimal EstimatedCost
);
