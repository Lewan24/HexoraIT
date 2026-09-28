using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record RegisterDto(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(200, MinimumLength = 15)] string Password,
    [StringLength(200)] string DisplayName);

public record LoginDto(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(200)] string Password,
    Guid? OrganizationId);

public record AuthResponseDto(string Token, DateTime ExpiresAt, UserDto User, List<OrganizationSummaryDto> Organizations);

public record UserDto(Guid Id, string Email, string DisplayName, string SystemRole);

public record OrganizationSummaryDto(Guid Id, string Name, string Role);

public record ChangePasswordDto(
    [Required, StringLength(200)] string CurrentPassword,
    [Required, StringLength(200, MinimumLength = 15)] string NewPassword);

public record UpdateProfileDto([Required, StringLength(200)] string DisplayName);

public record SwitchOrgDto(Guid OrganizationId);
