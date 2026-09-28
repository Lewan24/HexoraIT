using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record ProjectDto(Guid Id, string Name, string Description, string Color, DateTime CreatedAt, int TaskCount);
public record CreateProjectDto([Required, StringLength(200)] string Name, [StringLength(100000)] string Description, [StringLength(20)] string Color);
public record UpdateProjectDto([Required, StringLength(200)] string Name, [StringLength(100000)] string Description, [StringLength(20)] string Color);
