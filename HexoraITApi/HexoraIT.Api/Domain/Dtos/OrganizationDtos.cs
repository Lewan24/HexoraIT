using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record OrganizationDto(Guid Id, string Name, string Color, string Initials, string Description);
public record CreateOrganizationDto(string Name, string Color, string Initials, string Description);
public record UpdateOrganizationDto(string Name, string Color, string Initials, string Description);
public record InviteMemberDto(string Email, OrgRole Role);
public record OrgMemberDto(Guid UserId, string Email, string DisplayName, OrgRole Role);