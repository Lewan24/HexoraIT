using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record IncidentDto(Guid Id, string Title, IncidentSeverity Severity, IncidentStatus Status, string Description,
    string Resolution, List<string> AffectedSystems, DateTime OccurredAt, DateTime? ResolvedAt, List<string> Tags);

public record CreateIncidentDto(
    [Required, StringLength(200)] string Title, IncidentSeverity Severity, IncidentStatus Status,
    [StringLength(100000)] string Description, [StringLength(100000)] string Resolution,
    [Required, StringCollection(1000, 200)] List<string> AffectedSystems,
    DateTime OccurredAt, DateTime? ResolvedAt,
    [Required, StringCollection(100, 100)] List<string> Tags);

public record UpdateIncidentDto(
    [Required, StringLength(200)] string Title, IncidentSeverity Severity, IncidentStatus Status,
    [StringLength(100000)] string Description, [StringLength(100000)] string Resolution,
    [Required, StringCollection(1000, 200)] List<string> AffectedSystems,
    DateTime OccurredAt, DateTime? ResolvedAt,
    [Required, StringCollection(100, 100)] List<string> Tags);
