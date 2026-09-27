using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record AdminUserDto(Guid Id, string Email, string DisplayName, string SystemRole, bool IsBlocked, DateTime CreatedAt);
public record AdminCreateUserDto([Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(200)] string DisplayName,
    [Required, StringLength(200, MinimumLength = 15)] string Password,
    [Required, StringLength(20)] string SystemRole);
public record UpdateUserRoleDto([Required, StringLength(20)] string SystemRole);
public record AdminResetPasswordDto([Required, StringLength(200, MinimumLength = 15)] string NewPassword);
