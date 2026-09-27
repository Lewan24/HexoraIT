using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record WorkTaskDto(Guid Id, string Title, string Description, Priority Priority, WorkTaskStatus Status,
    string Assignee, DateOnly DueDate, List<string> Tags, DateTime CreatedAt, Guid? ProjectId,
    Guid? CreatedByUserId = null, string? CreatedByName = null);

public record CreateWorkTaskDto(
    [Required, StringLength(200)] string Title, [StringLength(100000)] string Description,
    Priority Priority, WorkTaskStatus Status, [StringLength(200)] string Assignee, DateOnly DueDate,
    [Required, StringCollection(100, 100)] List<string> Tags, Guid? ProjectId);

public record UpdateWorkTaskDto(
    [Required, StringLength(200)] string Title, [StringLength(100000)] string Description,
    Priority Priority, WorkTaskStatus Status, [StringLength(200)] string Assignee, DateOnly DueDate,
    [Required, StringCollection(100, 100)] List<string> Tags, Guid? ProjectId);
