using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record CreateClientReportDto(
    [Required, StringLength(200)] string Title,
    [Required, StringLength(100000)] string Description,
    Priority Priority);

public record ClientReportResultDto(Guid Id, string Title, DateTime CreatedAt);
