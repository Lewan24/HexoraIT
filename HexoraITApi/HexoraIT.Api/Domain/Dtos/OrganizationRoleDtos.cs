using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record PermissionDto([Required, StringLength(40)] string Resource, Guid ResourceId, bool CanRead, bool CanWrite);
public record ResourceOptionDto(Guid Id, string Name);
public record OrganizationRoleDto(Guid Id, string Name, List<PermissionDto> Permissions);
public record SaveOrganizationRoleDto(
    [Required, StringLength(100, MinimumLength = 1)] string Name,
    [Required, CollectionCount(1000)] List<PermissionDto> Permissions);
public record AssignOrganizationRoleDto(OrgRole Role, Guid? CustomRoleId);
public record OrganizationAccessDto(string RoleName, bool CanManageRoles, List<PermissionDto> Permissions);
public record CreateClientDto(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(200)] string DisplayName,
    [Required, StringLength(200, MinimumLength = 15)] string Password);
public record ClientSummaryDto(Guid Id, string Email, string DisplayName);
public record CopyRoleDto([Required, CollectionCount(100)] List<Guid> OrganizationIds, bool Overwrite = false);
