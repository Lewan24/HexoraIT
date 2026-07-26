using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record PlanDto(Guid Id, string Title, string Description, Priority Priority, PlanStatus Status, DateOnly TargetDate, List<string> Tags, DateTime CreatedAt);
public record CreatePlanDto(string Title, string Description, Priority Priority, PlanStatus Status, DateOnly TargetDate, List<string> Tags);
public record UpdatePlanDto(string Title, string Description, Priority Priority, PlanStatus Status, DateOnly TargetDate, List<string> Tags);