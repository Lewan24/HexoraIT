using HexoraITApi.Api.Auth;
using HexoraITApi.Application;
using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

public record CreateClientDto([Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(200)] string DisplayName, [Required, StringLength(200, MinimumLength = 8)] string Password);
public record CopyRoleDto([Required] List<Guid> OrganizationIds, bool Overwrite = false);

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
        if (await Db.Users.AnyAsync(u => u.Id == userContext.UserId && u.SystemRole == SystemRole.Client))
        {
            var individual = await Db.ClientPermissions.Where(p => p.UserId == userContext.UserId && p.OrganizationId == organizationId)
                .Select(p => new PermissionDto(p.Resource, p.ResourceId, p.CanRead, p.CanWrite)).ToListAsync();
            return Ok(new OrganizationAccessDto("Client", false, individual));
        }
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
        if (await Db.Users.AnyAsync(u => u.Id == userId && u.SystemRole == SystemRole.Client))
            return BadRequest("Configure individual client permissions instead of assigning a role.");
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

    [HttpPost("clients")]
    public async Task<IActionResult> CreateClient(Guid organizationId, CreateClientDto dto, [FromServices] IPasswordHasher hasher)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        var email = dto.Email.Trim().ToLowerInvariant();
        if (await Db.Users.AnyAsync(u => u.Email.ToLower() == email)) return Conflict("An account with this email already exists.");
        var (hash, salt) = hasher.Hash(dto.Password);
        var client = new User { Email = email, DisplayName = dto.DisplayName.Trim(), PasswordHash = hash,
            PasswordSalt = salt, SystemRole = SystemRole.Client };
        Db.Users.Add(client);
        Db.UserOrganizations.Add(new UserOrganization { UserId = client.Id, OrganizationId = organizationId, Role = OrgRole.ReadOnly });
        await Db.SaveChangesAsync();
        return Ok(new { client.Id, client.Email, client.DisplayName });
    }

    [HttpGet("clients")]
    public async Task<IActionResult> Clients(Guid organizationId)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        return Ok(await Db.UserOrganizations.Where(m => m.OrganizationId == organizationId && m.User.SystemRole == SystemRole.Client)
            .Select(m => new { m.User.Id, m.User.Email, m.User.DisplayName }).ToListAsync());
    }

    [HttpGet("clients/{clientId:guid}/permissions")]
    public async Task<IActionResult> ClientPermissions(Guid organizationId, Guid clientId)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        if (!await Db.UserOrganizations.AnyAsync(m => m.OrganizationId == organizationId && m.UserId == clientId && m.User.SystemRole == SystemRole.Client)) return NotFound();
        return Ok(await Db.ClientPermissions.Where(p => p.OrganizationId == organizationId && p.UserId == clientId)
            .Select(p => new PermissionDto(p.Resource, p.ResourceId, p.CanRead, p.CanWrite)).ToListAsync());
    }

    [HttpPut("clients/{clientId:guid}/permissions")]
    public async Task<IActionResult> SaveClientPermissions(Guid organizationId, Guid clientId, SaveOrganizationRoleDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        if (!await Db.UserOrganizations.AnyAsync(m => m.OrganizationId == organizationId && m.UserId == clientId && m.User.SystemRole == SystemRole.Client)) return NotFound();
        var error = await ValidateAsync(organizationId, dto, client: true);
        if (error is not null) return BadRequest(error);
        if (dto.Permissions.Any(p => p.Resource is "dashboard" or "settings" || (p.Resource == "tasks" && p.CanWrite)))
            return BadRequest("Clients cannot access dashboard or organization settings, or manage tasks.");
        var existing = await Db.ClientPermissions.Where(p => p.OrganizationId == organizationId && p.UserId == clientId).ToListAsync();
        Db.ClientPermissions.RemoveRange(existing.Where(p => !dto.Permissions.Any(d => d.Resource == p.Resource && d.ResourceId == p.ResourceId)));
        foreach (var p in dto.Permissions)
        {
            var rule = existing.FirstOrDefault(e => e.Resource == p.Resource && e.ResourceId == p.ResourceId);
            if (rule is null) { rule = new ClientPermission { UserId = clientId, OrganizationId = organizationId, Resource = p.Resource, ResourceId = p.ResourceId }; Db.ClientPermissions.Add(rule); }
            rule.CanRead = p.CanRead; rule.CanWrite = p.CanWrite;
        }
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("roles/{roleId:guid}/copy")]
    public async Task<IActionResult> Copy(Guid organizationId, Guid roleId, CopyRoleDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId, OrgRole.Admin);
        if (check is not null) return check;
        var source = await Db.OrganizationRoles.AsNoTracking().Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Id == roleId && r.OrganizationId == organizationId);
        if (source is null) return NotFound();
        var targets = dto.OrganizationIds.Distinct().ToList();
        if (targets.Count == 0 || targets.Count > 100 || targets.Contains(organizationId)) return BadRequest("Choose 1–100 other organizations.");
        foreach (var id in targets)
            if (!await userContext.HasAccessAsync(id) || await userContext.GetRoleAsync(id) is not (OrgRole.Admin or OrgRole.Owner)) return Forbid();
        var existing = await Db.OrganizationRoles.Include(r => r.Permissions)
            .Where(r => targets.Contains(r.OrganizationId) && r.Name.ToLower() == source.Name.ToLower()).ToListAsync();
        if (!dto.Overwrite && existing.Count > 0)
            return Conflict(new { message = "Confirm overwriting existing roles.", organizationIds = existing.Select(r => r.OrganizationId) });
        foreach (var id in targets)
        {
            var role = existing.FirstOrDefault(r => r.OrganizationId == id);
            if (role is null) { role = new OrganizationRole { OrganizationId = id, Name = source.Name }; Db.OrganizationRoles.Add(role); }
            var defaults = source.Permissions.Where(p => p.ResourceId == Guid.Empty).ToList();
            Db.RolePermissions.RemoveRange(role.Permissions.Where(p => p.ResourceId == Guid.Empty && !defaults.Any(d => d.Resource == p.Resource)));
            foreach (var p in defaults)
            {
                var rule = role.Permissions.FirstOrDefault(e => e.ResourceId == Guid.Empty && e.Resource == p.Resource);
                if (rule is null) Db.RolePermissions.Add(ToEntity(ToDto(p), role.Id));
                else { rule.CanRead = p.CanRead; rule.CanWrite = p.CanWrite; }
            }
        }
        await Db.SaveChangesAsync();
        return NoContent();
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

    private async Task<string?> ValidateAsync(Guid organizationId, SaveOrganizationRoleDto dto, Guid? roleId = null, bool client = false)
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
        if (!client && await Db.OrganizationRoles.AnyAsync(r => r.OrganizationId == organizationId && r.Id != roleId && r.Name.ToLower() == dto.Name.Trim().ToLower()))
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
