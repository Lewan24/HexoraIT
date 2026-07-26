using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record PasswordListDto(Guid Id, string Name, string Username, string Category,
    List<string> Tags, DateTime UpdatedAt, PasswordStrength Strength, bool Starred, string Notes);

public record CreatePasswordDto(string Name, string Username, string Password, string Category,
    List<string> Tags, string Notes);

public record UpdatePasswordDto(string Name, string Username, string? Password, string Category,
    List<string> Tags, string Notes);