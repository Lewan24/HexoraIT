namespace HexoraITApi.Domain.Dtos;

using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Validation;

public record DashboardLayoutDto(
    [Required, StringCollection(100, 100)] List<string> SectionOrder,
    [Required, StringCollection(100, 100)] List<string> HiddenSections);
