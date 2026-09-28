using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record SavePrivateNoteDto(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [Required(AllowEmptyStrings = true), StringLength(100000)] string Content);
