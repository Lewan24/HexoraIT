using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IOrganizationRoleService
{
    Task<ApiOperationResult> GetAccessAsync(Guid organizationId, CancellationToken token = default);
    Task<ApiOperationResult> GetRolesAsync(Guid organizationId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, SaveOrganizationRoleDto dto, CancellationToken token = default);
    Task<ApiOperationResult> UpdateAsync(Guid organizationId, Guid roleId, SaveOrganizationRoleDto dto, CancellationToken token = default);
    Task<ApiOperationResult> DeleteAsync(Guid organizationId, Guid roleId, CancellationToken token = default);
    Task<ApiOperationResult> AssignAsync(Guid organizationId, Guid userId, AssignOrganizationRoleDto dto, CancellationToken token = default);
    Task<ApiOperationResult> GetResourcesAsync(Guid organizationId, string resource, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> CreateClientAsync(Guid organizationId, CreateClientDto dto, CancellationToken token = default);
    Task<ApiOperationResult> GetClientsAsync(Guid organizationId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> GetClientPermissionsAsync(Guid organizationId, Guid clientId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> SaveClientPermissionsAsync(Guid organizationId, Guid clientId, SaveOrganizationRoleDto dto, CancellationToken token = default);
    Task<ApiOperationResult> CopyAsync(Guid organizationId, Guid roleId, CopyRoleDto dto, CancellationToken token = default);
}

public sealed class OrganizationRoleService(AppDbContext db, ICurrentUserContext userContext, IPasswordHasher hasher, INotificationService? notifications = null)
    : IOrganizationRoleService
{
    public async Task<ApiOperationResult> GetAccessAsync(Guid organizationId, CancellationToken token = default)
    {
        if (!await userContext.HasAccessAsync(organizationId)) return Forbidden();
        var member = await db.UserOrganizations.AsNoTracking()
            .Include(m => m.CustomRole).ThenInclude(r => r!.Permissions)
            .SingleAsync(m => m.OrganizationId == organizationId && m.UserId == userContext.UserId, token);
        if (await db.Users.AnyAsync(u => u.Id == userContext.UserId && u.SystemRole == SystemRole.Client, token))
        {
            var individual = await db.ClientPermissions
                .Where(p => p.UserId == userContext.UserId && p.OrganizationId == organizationId)
                .Select(p => new PermissionDto(p.Resource, p.ResourceId, p.CanRead, p.CanWrite)).ToListAsync(token);
            return Ok(new OrganizationAccessDto("Client", false, individual));
        }
        var permissions = member.CustomRoleId is null
            ? OrganizationResources.All.Select(r => new PermissionDto(r, Guid.Empty, true, member.Role >= OrgRole.Member)).ToList()
            : member.CustomRole!.Permissions.Select(ToDto).ToList();
        return Ok(new OrganizationAccessDto(member.CustomRole?.Name ?? member.Role.ToString(),
            member.CustomRoleId is null && member.Role >= OrgRole.Admin, permissions));
    }

    public async Task<ApiOperationResult> GetRolesAsync(Guid organizationId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        if (!Pagination.TryResolve(pagination, out var window)) return PaginationError();
        var query = db.OrganizationRoles.AsNoTracking().Where(r => r.OrganizationId == organizationId);
        var total = await query.CountAsync(token);
        var roles = await query.OrderBy(r => r.Name).ThenBy(r => r.Id).Skip(window.Offset).Take(window.PageSize)
            .Include(r => r.Permissions).AsSplitQuery().ToListAsync(token);
        return new(StatusCodes.Status200OK, roles.Select(ToDto).ToList(), Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, SaveOrganizationRoleDto dto, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        var error = await ValidateAsync(organizationId, dto, token: token);
        if (error is not null) return BadRequest(error);
        var role = new OrganizationRole { OrganizationId = organizationId, Name = dto.Name.Trim() };
        role.Permissions = dto.Permissions.Select(p => ToEntity(p, role.Id)).ToList();
        db.OrganizationRoles.Add(role); await db.SaveChangesAsync(token); return Ok(ToDto(role));
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid organizationId, Guid roleId, SaveOrganizationRoleDto dto, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        var role = await db.OrganizationRoles.Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Id == roleId && r.OrganizationId == organizationId, token);
        if (role is null) return NotFound();
        var error = await ValidateAsync(organizationId, dto, roleId, token: token);
        if (error is not null) return BadRequest(error);
        role.Name = dto.Name.Trim();
        db.RolePermissions.RemoveRange(role.Permissions.Where(p => !dto.Permissions.Any(d => d.Resource == p.Resource && d.ResourceId == p.ResourceId)));
        foreach (var permission in dto.Permissions)
        {
            var existing = role.Permissions.FirstOrDefault(p => p.Resource == permission.Resource && p.ResourceId == permission.ResourceId);
            if (existing is null) db.RolePermissions.Add(ToEntity(permission, role.Id));
            else { existing.CanRead = permission.CanRead; existing.CanWrite = permission.CanWrite; }
        }
        await db.SaveChangesAsync(token); return NoContent();
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid organizationId, Guid roleId, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        var role = await db.OrganizationRoles.FirstOrDefaultAsync(r => r.Id == roleId && r.OrganizationId == organizationId, token);
        if (role is null) return NotFound();
        if (await db.UserOrganizations.AnyAsync(m => m.CustomRoleId == roleId, token))
            return new(StatusCodes.Status409Conflict, "Assign another role to all members before deleting this role.");
        db.OrganizationRoles.Remove(role); await db.SaveChangesAsync(token); return NoContent();
    }

    public async Task<ApiOperationResult> AssignAsync(Guid organizationId, Guid userId, AssignOrganizationRoleDto dto, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        var member = await db.UserOrganizations.FirstOrDefaultAsync(m => m.OrganizationId == organizationId && m.UserId == userId, token);
        if (member is null) return NotFound();
        if (await db.Users.AnyAsync(u => u.Id == userId && u.SystemRole == SystemRole.Client, token))
            return BadRequest("Configure individual client permissions instead of assigning a role.");
        if (!Enum.IsDefined(dto.Role) || dto.Role == OrgRole.Owner || member.Role == OrgRole.Owner)
            return BadRequest("The organization owner cannot be changed through role assignment.");
        var actingRole = await userContext.GetRoleAsync(organizationId);
        if (actingRole != OrgRole.Owner && (member.Role >= OrgRole.Admin || (dto.CustomRoleId is null && dto.Role >= OrgRole.Admin))) return Forbidden();
        if (dto.CustomRoleId is { } customRoleId &&
            !await db.OrganizationRoles.AnyAsync(r => r.Id == customRoleId && r.OrganizationId == organizationId, token))
            return BadRequest("Role does not belong to this organization.");
        member.CustomRoleId = dto.CustomRoleId; member.Role = dto.CustomRoleId is null ? dto.Role : OrgRole.ReadOnly;
        var memberName = await db.Users.Where(x => x.Id == userId).Select(x => x.DisplayName).SingleAsync(token);
        await db.SaveChangesAsync(token);
        if (notifications is not null)
            await notifications.NotifyAsync(organizationId, "role_membership_changed", "Organization role changed",
                $"The role for {memberName} was changed.", token);
        return NoContent();
    }

    public async Task<ApiOperationResult> GetResourcesAsync(Guid organizationId, string resource, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        if (!Pagination.TryResolve(pagination, out var window)) return PaginationError();
        var query = ResourceOptionsQuery(organizationId, resource);
        if (query is null) return new(StatusCodes.Status200OK, new List<ResourceOptionDto>(), Pagination: new PaginationMetadata(0, window));
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(x => x.Name).ThenBy(x => x.Id).Skip(window.Offset).Take(window.PageSize)
            .Select(x => new ResourceOptionDto(x.Id, x.Name)).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> CreateClientAsync(Guid organizationId, CreateClientDto dto, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        var email = dto.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email.ToLower() == email, token)) return new(StatusCodes.Status409Conflict, "An account with this email already exists.");
        var (hash, salt) = hasher.Hash(dto.Password);
        var client = new User { Email = email, DisplayName = dto.DisplayName.Trim(), PasswordHash = hash, PasswordSalt = salt, SystemRole = SystemRole.Client };
        db.Users.Add(client);
        db.UserOrganizations.Add(new UserOrganization { UserId = client.Id, OrganizationId = organizationId, Role = OrgRole.ReadOnly });
        await db.SaveChangesAsync(token); return Ok(new ClientSummaryDto(client.Id, client.Email, client.DisplayName));
    }

    public async Task<ApiOperationResult> GetClientsAsync(Guid organizationId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        if (!Pagination.TryResolve(pagination, out var window)) return PaginationError();
        var query = db.UserOrganizations.Where(m => m.OrganizationId == organizationId && m.User.SystemRole == SystemRole.Client);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(m => m.User.Email).ThenBy(m => m.UserId).Skip(window.Offset).Take(window.PageSize)
            .Select(m => new ClientSummaryDto(m.User.Id, m.User.Email, m.User.DisplayName)).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> GetClientPermissionsAsync(Guid organizationId, Guid clientId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        if (!await IsClientMemberAsync(organizationId, clientId, token)) return NotFound();
        if (!Pagination.TryResolve(pagination, out var window)) return PaginationError();
        var query = db.ClientPermissions.Where(p => p.OrganizationId == organizationId && p.UserId == clientId);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(p => p.Resource).ThenBy(p => p.ResourceId).Skip(window.Offset).Take(window.PageSize)
            .Select(p => new PermissionDto(p.Resource, p.ResourceId, p.CanRead, p.CanWrite)).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> SaveClientPermissionsAsync(Guid organizationId, Guid clientId, SaveOrganizationRoleDto dto, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        if (!await IsClientMemberAsync(organizationId, clientId, token)) return NotFound();
        var error = await ValidateAsync(organizationId, dto, client: true, token: token);
        if (error is not null) return BadRequest(error);
        if (dto.Permissions.Any(p => p.Resource is "dashboard" or "settings" || (p.Resource == "tasks" && p.CanWrite)))
            return BadRequest("Clients cannot access dashboard or organization settings, or manage tasks.");
        var existing = await db.ClientPermissions.Where(p => p.OrganizationId == organizationId && p.UserId == clientId).ToListAsync(token);
        db.ClientPermissions.RemoveRange(existing.Where(p => !dto.Permissions.Any(d => d.Resource == p.Resource && d.ResourceId == p.ResourceId)));
        foreach (var p in dto.Permissions)
        {
            var rule = existing.FirstOrDefault(e => e.Resource == p.Resource && e.ResourceId == p.ResourceId);
            if (rule is null) { rule = new ClientPermission { UserId = clientId, OrganizationId = organizationId, Resource = p.Resource, ResourceId = p.ResourceId }; db.ClientPermissions.Add(rule); }
            rule.CanRead = p.CanRead; rule.CanWrite = p.CanWrite;
        }
        await db.SaveChangesAsync(token); return NoContent();
    }

    public async Task<ApiOperationResult> CopyAsync(Guid organizationId, Guid roleId, CopyRoleDto dto, CancellationToken token = default)
    {
        if (!await CanManageAsync(organizationId)) return Forbidden();
        var source = await db.OrganizationRoles.AsNoTracking().Include(r => r.Permissions)
            .FirstOrDefaultAsync(r => r.Id == roleId && r.OrganizationId == organizationId, token);
        if (source is null) return NotFound();
        var targets = dto.OrganizationIds.Distinct().ToList();
        if (targets.Count == 0 || targets.Count > 100 || targets.Contains(organizationId)) return BadRequest("Choose 1–100 other organizations.");
        foreach (var id in targets)
            if (!await userContext.HasAccessAsync(id) || await userContext.GetRoleAsync(id) is not (OrgRole.Admin or OrgRole.Owner)) return Forbidden();
        var existing = await db.OrganizationRoles.Include(r => r.Permissions)
            .Where(r => targets.Contains(r.OrganizationId) && r.Name.ToLower() == source.Name.ToLower()).ToListAsync(token);
        if (!dto.Overwrite && existing.Count > 0)
            return new(StatusCodes.Status409Conflict, new { message = "Confirm overwriting existing roles.", organizationIds = existing.Select(r => r.OrganizationId) });
        foreach (var id in targets)
        {
            var role = existing.FirstOrDefault(r => r.OrganizationId == id);
            if (role is null) { role = new OrganizationRole { OrganizationId = id, Name = source.Name }; db.OrganizationRoles.Add(role); }
            var defaults = source.Permissions.Where(p => p.ResourceId == Guid.Empty).ToList();
            db.RolePermissions.RemoveRange(role.Permissions.Where(p => p.ResourceId == Guid.Empty && !defaults.Any(d => d.Resource == p.Resource)));
            foreach (var p in defaults)
            {
                var rule = role.Permissions.FirstOrDefault(e => e.ResourceId == Guid.Empty && e.Resource == p.Resource);
                if (rule is null) db.RolePermissions.Add(ToEntity(ToDto(p), role.Id));
                else { rule.CanRead = p.CanRead; rule.CanWrite = p.CanWrite; }
            }
        }
        await db.SaveChangesAsync(token); return NoContent();
    }

    private Task<bool> CanManageAsync(Guid organizationId) => HasManageRoleAsync(organizationId);
    private async Task<bool> HasManageRoleAsync(Guid organizationId) => await userContext.GetRoleAsync(organizationId) is OrgRole.Admin or OrgRole.Owner;
    private Task<bool> IsClientMemberAsync(Guid organizationId, Guid clientId, CancellationToken token) =>
        db.UserOrganizations.AnyAsync(m => m.OrganizationId == organizationId && m.UserId == clientId && m.User.SystemRole == SystemRole.Client, token);

    private IQueryable<ResourceOptionRow>? ResourceOptionsQuery(Guid organizationId, string resource) => resource switch
    {
        "assets" => db.Assets.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "passwords" => db.Passwords.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "networks" => db.Subnets.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "licenses" => db.Licenses.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "contacts" => db.Contacts.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "contracts" => db.Contracts.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "plans" => db.Plans.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Title }),
        "incidents" => db.Incidents.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Title }),
        "knowledge" => db.KnowledgeArticles.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Title }),
        "tasks" => db.Tasks.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Title }),
        "projects" => db.Projects.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "groups" => db.Groups.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "warranty" => db.WarrantyItems.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        "files" => db.StoredFiles.Where(x => x.OrganizationId == organizationId).Select(x => new ResourceOptionRow { Id = x.Id, Name = x.Name }),
        _ => null
    };

    private sealed class ResourceOptionRow
    {
        public Guid Id { get; init; }
        public string Name { get; init; } = "";
    }

    private async Task<string?> ValidateAsync(Guid organizationId, SaveOrganizationRoleDto dto, Guid? roleId = null, bool client = false, CancellationToken token = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Trim().Length > 100) return "Role name must contain between 1 and 100 characters.";
        if (dto.Permissions is null || dto.Permissions.Count > 2000) return "Provide at most 2000 permission rules.";
        if (dto.Permissions.Any(p => !OrganizationResources.All.Contains(p.Resource) || (p.CanWrite && !p.CanRead))) return "Unknown resource or write permission without read permission.";
        if (dto.Permissions.GroupBy(p => new { p.Resource, p.ResourceId }).Any(g => g.Count() > 1)) return "Duplicate permission rules are not allowed.";
        if (dto.Permissions.Any(p => p.ResourceId != Guid.Empty && p.Resource is "dashboard" or "diagram" or "settings")) return "This resource supports module permissions only.";
        if (!client && await db.OrganizationRoles.AnyAsync(r => r.OrganizationId == organizationId && r.Id != roleId && r.Name.ToLower() == dto.Name.Trim().ToLower(), token)) return "A role with this name already exists.";
        foreach (var group in dto.Permissions.Where(p => p.ResourceId != Guid.Empty).GroupBy(p => p.Resource))
        {
            var ids = group.Select(p => p.ResourceId).Distinct().ToList();
            if (await ExistingResourceCountAsync(organizationId, group.Key, ids, token) != ids.Count) return "An individual resource does not exist in this organization.";
        }
        return null;
    }

    private Task<int> ExistingResourceCountAsync(Guid organizationId, string resource, List<Guid> ids, CancellationToken token) => resource switch
    {
        "assets" => db.Assets.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "passwords" => db.Passwords.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "networks" => db.Subnets.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "licenses" => db.Licenses.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "contacts" => db.Contacts.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "contracts" => db.Contracts.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "plans" => db.Plans.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "incidents" => db.Incidents.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "knowledge" => db.KnowledgeArticles.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "tasks" => db.Tasks.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "projects" => db.Projects.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "groups" => db.Groups.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "warranty" => db.WarrantyItems.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        "files" => db.StoredFiles.CountAsync(x => x.OrganizationId == organizationId && ids.Contains(x.Id), token),
        _ => Task.FromResult(0)
    };

    private static PermissionDto ToDto(RolePermission p) => new(p.Resource, p.ResourceId, p.CanRead, p.CanWrite);
    private static OrganizationRoleDto ToDto(OrganizationRole r) => new(r.Id, r.Name, r.Permissions.Select(ToDto).ToList());
    private static RolePermission ToEntity(PermissionDto p, Guid roleId) => new() { RoleId = roleId, Resource = p.Resource, ResourceId = p.ResourceId, CanRead = p.CanRead, CanWrite = p.CanWrite };
    private static ApiOperationResult Ok(object value) => new(StatusCodes.Status200OK, value);
    private static ApiOperationResult NoContent() => new(StatusCodes.Status204NoContent);
    private static ApiOperationResult BadRequest(object value) => new(StatusCodes.Status400BadRequest, value);
    private static ApiOperationResult Forbidden() => new(StatusCodes.Status403Forbidden);
    private static ApiOperationResult NotFound() => new(StatusCodes.Status404NotFound);
    private static ApiOperationResult PaginationError() => BadRequest("Both page and pageSize must be supplied together.");
}
