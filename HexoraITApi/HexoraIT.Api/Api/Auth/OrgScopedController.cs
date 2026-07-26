using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HexoraITApi.Api.Auth;

[Authorize]
public abstract class OrgScopedController(AppDbContext db, ICurrentUserContext userContext) : ControllerBase
{
    protected AppDbContext Db => db;

    protected async Task<ActionResult?> CheckReadAccessAsync(Guid organizationId) =>
        await userContext.HasAccessAsync(organizationId) ? null : Forbid();

    protected async Task<ActionResult?> CheckWriteAccessAsync(Guid organizationId, OrgRole minRole = OrgRole.Member)
    {
        var role = await userContext.GetRoleAsync(organizationId);
        if (role is null || role < minRole) 
            return Forbid();
        
        return null;
    }
}