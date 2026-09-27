using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record OrganizationDto(Guid Id, string Name, string Color, string Initials, string Description);
public record CreateOrganizationDto([Required, StringLength(200)] string Name, [StringLength(20)] string Color,
    [StringLength(8)] string Initials, [StringLength(100000)] string Description);
public record UpdateOrganizationDto([Required, StringLength(200)] string Name, [StringLength(20)] string Color,
    [StringLength(8)] string Initials, [StringLength(100000)] string Description);
public record InviteMemberDto([Required, EmailAddress, StringLength(256)] string Email, OrgRole Role, Guid? CustomRoleId = null);
public record OrgMemberDto(Guid UserId, string Email, string DisplayName, OrgRole Role, Guid? CustomRoleId = null, string? CustomRoleName = null, SystemRole SystemRole = SystemRole.User);
