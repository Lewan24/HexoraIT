namespace HexoraITApi.Domain.Dtos;

public record RegisterDto(string Email, string Password, string DisplayName);

public record LoginDto(string Email, string Password, Guid? OrganizationId);

public record AuthResponseDto(string Token, DateTime ExpiresAt, UserDto User, List<OrganizationSummaryDto> Organizations);

public record UserDto(Guid Id, string Email, string DisplayName, string SystemRole);

public record OrganizationSummaryDto(Guid Id, string Name, string Role);

public record ChangePasswordDto(string CurrentPassword, string NewPassword);

public record UpdateProfileDto(string DisplayName);

public record SwitchOrgDto(Guid OrganizationId);