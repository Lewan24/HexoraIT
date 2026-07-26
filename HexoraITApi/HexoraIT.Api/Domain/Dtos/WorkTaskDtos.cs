using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record WorkTaskDto(Guid Id, string Title, string Description, Priority Priority, WorkTaskStatus Status,
    string Assignee, DateOnly DueDate, List<string> Tags, DateTime CreatedAt, Guid? ProjectId);

public record CreateWorkTaskDto(string Title, string Description, Priority Priority, WorkTaskStatus Status,
    string Assignee, DateOnly DueDate, List<string> Tags, Guid? ProjectId);

public record UpdateWorkTaskDto(string Title, string Description, Priority Priority, WorkTaskStatus Status,
    string Assignee, DateOnly DueDate, List<string> Tags, Guid? ProjectId);