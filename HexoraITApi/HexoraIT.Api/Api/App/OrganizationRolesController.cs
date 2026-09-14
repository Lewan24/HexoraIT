using HexoraITApi.Api.Auth;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/organizations/{organizationId:guid}")]
public class OrganizationRolesController(AppDbContext db, ICurrentUserContext userContext)
    : OrgScopedController(db, userContext)
{
    [HttpGet("permissions")]
    public async Task<ActionResult<OrganizationAccessDto>> GetAccess(Guid organizationId)
    {
        var check = await CheckReadAccessAsync(organizationId);
        if (check is not null) return check;

        var member = await Db.UserOrganizations.AsNoTracking()
            .Include(m => m.CustomRole).ThenInclude(r => r!.Permissions)
            .SingleAsync(m => m.OrganizationId == organizationId && m.UserId == userContext.UserId);
        var permissions = member.CustomRoleId is null
            ? OrganizationResources.All.Select(r => new PermissionDto(r, Guid.Empty, true, member.Role >= OrgRole.Member)).ToList()
            : member.CustomRole!.Permissions.Select(ToDto).ToList();
        return Ok(new OrganizationAccessDto(member.CustomRole?.Name ?? member.Role.ToString(),
            member.CustomRoleId is null && member.Role >= OrgRole.Admin, permissions));
    }

    [HttpGet("roles")]
    public async Task<ActionResult<List<OrganizationRoleDto>>> GetRoles(Guid organizationId)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        var roles = await Db.OrganizationRoles.AsNoTracking().Include(r => r.Permissions)
            .Where(r => r.OrganizationId == organizationId).OrderBy(r => r.Name).ToListAsync();
        return Ok(roles.Select(ToDto).ToList());
    }

    [HttpPost("roles")]
    public async Task<ActionResult<OrganizationRoleDto>> Create(Guid organizationId, SaveOrganizationRoleDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        var error = await ValidateAsync(organizationId, dto);
        if (error is not null) return BadRequest(error);

        var role = new OrganizationRole { OrganizationId = organizationId, Name = dto.Name.Trim() };
        role.Permissions = dto.Permissions.Select(p => ToEntity(p, role.Id)).ToList();
        Db.OrganizationRoles.Add(role);
        await Db.SaveChangesAsync();
        return Ok(ToDto(role));
    }

    [HttpPut("roles/{roleId:guid}")]
    public async Task<IActionResult> Update(Guid organizationId, Guid roleId, SaveOrganizationRoleDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        var role = await Db.OrganizationRoles.Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Id == roleId && r.OrganizationId == organizationId);
        if (role is null) return NotFound();
        var error = await ValidateAsync(organizationId, dto, roleId);
        if (error is not null) return BadRequest(error);

        role.Name = dto.Name.Trim();
        Db.RolePermissions.RemoveRange(role.Permissions.Where(p =>
            !dto.Permissions.Any(d => d.Resource == p.Resource && d.ResourceId == p.ResourceId)));
        foreach (var permission in dto.Permissions)
        {
            var existing = role.Permissions.FirstOrDefault(p =>
                p.Resource == permission.Resource && p.ResourceId == permission.ResourceId);
            if (existing is null) Db.RolePermissions.Add(ToEntity(permission, role.Id));
            else
            {
                existing.CanRead = permission.CanRead;
                existing.CanWrite = permission.CanWrite;
            }
        }
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("roles/{roleId:guid}")]
    public async Task<IActionResult> Delete(Guid organizationId, Guid roleId)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        var role = await Db.OrganizationRoles.FirstOrDefaultAsync(r => r.Id == roleId && r.OrganizationId == organizationId);
        if (role is null) return NotFound();
        if (await Db.UserOrganizations.AnyAsync(m => m.CustomRoleId == roleId))
            return Conflict("Assign another role to all members before deleting this role.");
        Db.OrganizationRoles.Remove(role);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("members/{userId:guid}/role")]
    public async Task<IActionResult> Assign(Guid organizationId, Guid userId, AssignOrganizationRoleDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        var member = await Db.UserOrganizations.FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId);
        if (member is null) return NotFound();
        if (!Enum.IsDefined(dto.Role) || dto.Role == OrgRole.Owner || member.Role == OrgRole.Owner)
            return BadRequest("The organization owner cannot be changed through role assignment.");
        var actingRole = await userContext.GetRoleAsync(organizationId);
        if (actingRole != OrgRole.Owner && (member.Role >= OrgRole.Admin || (dto.CustomRoleId is null && dto.Role >= OrgRole.Admin)))
            return Forbid();
        if (dto.CustomRoleId is { } customRoleId &&
            !await Db.OrganizationRoles.AnyAsync(r => r.Id == customRoleId && r.OrganizationId == organizationId))
            return BadRequest("Role does not belong to this organization.");

        member.CustomRoleId = dto.CustomRoleId;
        member.Role = dto.CustomRoleId is null ? dto.Role : OrgRole.ReadOnly;
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("role-resources/{resource}")]
    public async Task<ActionResult<List<ResourceOptionDto>>> GetResources(Guid organizationId, string resource)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        return Ok(await ResourceOptionsAsync(organizationId, resource));
    }

    private async Task<List<ResourceOptionDto>> ResourceOptionsAsync(Guid organizationId, string resource) =>
        resource switch
        {
            "assets" => await Db.Assets.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "passwords" => await Db.Passwords.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "networks" => await Db.Subnets.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "licenses" => await Db.Licenses.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "contacts" => await Db.Contacts.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "contracts" => await Db.Contracts.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "plans" => await Db.Plans.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Title)).ToListAsync(),
            "incidents" => await Db.Incidents.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Title)).ToListAsync(),
            "knowledge" => await Db.KnowledgeArticles.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Title)).ToListAsync(),
            "tasks" => await Db.Tasks.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Title)).ToListAsync(),
            "projects" => await Db.Projects.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "groups" => await Db.Groups.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "warranty" => await Db.WarrantyItems.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            "files" => await Db.StoredFiles.Where(x => x.OrganizationId == organizationId)
                .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(),
            _ => []
        };

    private async Task<string?> ValidateAsync(Guid organizationId, SaveOrganizationRoleDto dto, Guid? roleId = null)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Trim().Length > 100)
            return "Role name must contain between 1 and 100 characters.";
        if (dto.Permissions is null || dto.Permissions.Count > 2000)
            return "Provide at most 2000 permission rules.";
        if (dto.Permissions.Any(p => !OrganizationResources.All.Contains(p.Resource) || (p.CanWrite && !p.CanRead)))
            return "Unknown resource or write permission without read permission.";
        if (dto.Permissions.GroupBy(p => new { p.Resource, p.ResourceId }).Any(g => g.Count() > 1))
            return "Duplicate permission rules are not allowed.";
        if (dto.Permissions.Any(p => p.ResourceId != Guid.Empty && p.Resource is "dashboard" or "diagram" or "settings"))
            return "This resource supports module permissions only.";
        if (await Db.OrganizationRoles.AnyAsync(r => r.OrganizationId == organizationId && r.Id != roleId && r.Name.ToLower() == dto.Name.Trim().ToLower()))
            return "A role with this name already exists.";
        foreach (var group in dto.Permissions.Where(p => p.ResourceId != Guid.Empty).GroupBy(p => p.Resource))
        {
            var ids = (await ResourceOptionsAsync(organizationId, group.Key)).Select(r => r.Id).ToHashSet();
            if (group.Any(p => !ids.Contains(p.ResourceId)))
                return "An individual resource does not exist in this organization.";
        }
        return null;
    }

    private static PermissionDto ToDto(RolePermission p) => new(p.Resource, p.ResourceId, p.CanRead, p.CanWrite);
    private static OrganizationRoleDto ToDto(OrganizationRole r) => new(r.Id, r.Name, r.Permissions.Select(ToDto).ToList());
    private static RolePermission ToEntity(PermissionDto p, Guid roleId) => new()
    {
        RoleId = roleId, Resource = p.Resource, ResourceId = p.ResourceId,
        CanRead = p.CanRead, CanWrite = p.CanWrite
    };
}
