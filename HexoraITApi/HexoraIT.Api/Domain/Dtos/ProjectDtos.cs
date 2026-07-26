namespace HexoraITApi.Domain.Dtos;

public record ProjectDto(Guid Id, string Name, string Description, string Color, DateTime CreatedAt, int TaskCount);
public record CreateProjectDto(string Name, string Description, string Color);
public record UpdateProjectDto(string Name, string Description, string Color);