using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record PasswordListDto(Guid Id, string Name, string Username, string Category,
    List<string> Tags, DateTime UpdatedAt, PasswordStrength Strength, bool Starred, string Notes);

public record CreatePasswordDto(
    [Required, StringLength(200)] string Name, [StringLength(500)] string Username,
    [Required(AllowEmptyStrings = true), StringLength(10000)] string Password,
    [StringLength(200)] string Category, [Required, StringCollection(100, 100)] List<string> Tags,
    [StringLength(100000)] string Notes);

public record UpdatePasswordDto(
    [Required, StringLength(200)] string Name, [StringLength(500)] string Username,
    [StringLength(10000)] string? Password, [StringLength(200)] string Category,
    [Required, StringCollection(100, 100)] List<string> Tags, [StringLength(100000)] string Notes);
