using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HexoraITApi.Api.Auth;

[Authorize]
public abstract class OrgScopedController(AppDbContext db, ICurrentUserContext userContext) : ControllerBase
{
    protected AppDbContext Db => db;

    private string? Resource => GetType().Name switch
    {
        "OrganizationsController" or "OrganizationRolesController" => null,
        "SubnetsController" => "networks",
        "WarrantiesController" => "warranty",
        "FilesExplorerController" => "files",
        _ => GetType().Name.Replace("Controller", "").ToLowerInvariant()
    };

    protected async Task<ActionResult?> CheckReadAccessAsync(Guid organizationId) =>
        (Resource is { } resource
            ? await userContext.HasPermissionAsync(organizationId, resource)
            : await userContext.HasAccessAsync(organizationId)) ? null : Forbid();

    protected async Task<ActionResult?> CheckWriteAccessAsync(Guid organizationId, OrgRole minRole = OrgRole.Member, Guid? resourceId = null)
    {
        if (Resource is { } resource && minRole == OrgRole.Member)
            return await userContext.HasPermissionAsync(organizationId, resource, true, resourceId) ? null : Forbid();

        var role = await userContext.GetRoleAsync(organizationId);
        if (role is null || role < minRole) 
            return Forbid();
        
        return null;
    }
}
