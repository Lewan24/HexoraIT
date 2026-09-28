using AutoMapper;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IOrganizationService
{
    Task<ApiOperationResult> GetAllAsync(PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> GetDeletedAsync(PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> CreateAsync(CreateOrganizationDto dto, CancellationToken token = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdateOrganizationDto dto, CancellationToken token = default);
    Task<ApiOperationResult> GetMembersAsync(Guid id, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> InviteMemberAsync(Guid id, InviteMemberDto dto, CancellationToken token = default);
    Task<ApiOperationResult> RemoveMemberAsync(Guid id, Guid userId, CancellationToken token = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> RestoreAsync(Guid id, CancellationToken token = default);
}

public sealed class OrganizationService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext, INotificationService? notifications = null) : IOrganizationService
{
    public async Task<ApiOperationResult> GetAllAsync(PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return PaginationError();
        var query = db.UserOrganizations.Where(item => item.UserId == userContext.UserId);
        var total = await query.CountAsync(token);
        var rows = await query.OrderBy(item => item.Organization.Name).ThenBy(item => item.OrganizationId)
            .Skip(window.Offset).Take(window.PageSize)
            .Select(item => new { item.OrganizationId, item.Organization.Name, item.Role }).ToListAsync(token);
        var items = rows.Select(item => new OrganizationSummaryDto(
            item.OrganizationId, item.Name, item.Role.ToString())).ToList();
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> GetDeletedAsync(PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return PaginationError();
        var query = db.UserOrganizations.IgnoreQueryFilters().Where(item => item.UserId == userContext.UserId && item.Role == OrgRole.Owner && item.Organization.IsDeleted);
        var total = await query.CountAsync(token);
        var rows = await query.OrderBy(item => item.Organization.Name).ThenBy(item => item.OrganizationId)
            .Skip(window.Offset).Take(window.PageSize)
            .Select(item => new { item.OrganizationId, item.Organization.Name, item.Role }).ToListAsync(token);
        var items = rows.Select(item => new OrganizationSummaryDto(
            item.OrganizationId, item.Name, item.Role.ToString())).ToList();
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> GetByIdAsync(Guid id, CancellationToken token = default)
    {
        if (!await userContext.HasAccessAsync(id)) return new(StatusCodes.Status403Forbidden);
        var item = await db.Organizations.FirstOrDefaultAsync(org => org.Id == id, token);
        return item is null ? new(StatusCodes.Status404NotFound) : new(StatusCodes.Status200OK, mapper.Map<OrganizationDto>(item));
    }

    public async Task<ApiOperationResult> CreateAsync(CreateOrganizationDto dto, CancellationToken token = default)
    {
        if (await IsClientAsync(token)) return new(StatusCodes.Status403Forbidden);
        var item = mapper.Map<Organization>(dto);
        db.Organizations.Add(item);
        db.UserOrganizations.Add(new UserOrganization { UserId = userContext.UserId, OrganizationId = item.Id, Role = OrgRole.Owner });
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status201Created, mapper.Map<OrganizationDto>(item), $"/api/organizations/{item.Id}");
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdateOrganizationDto dto, CancellationToken token = default)
    {
        if (await userContext.GetRoleAsync(id) is not (OrgRole.Admin or OrgRole.Owner)) return new(StatusCodes.Status403Forbidden);
        var item = await db.Organizations.FirstOrDefaultAsync(org => org.Id == id, token);
        if (item is null) return new(StatusCodes.Status404NotFound);
        mapper.Map(dto, item); await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> GetMembersAsync(Guid id, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!await userContext.HasAccessAsync(id) || !await userContext.HasPermissionAsync(id, "settings")) return new(StatusCodes.Status403Forbidden);
        if (!Pagination.TryResolve(pagination, out var window)) return PaginationError();
        var query = db.UserOrganizations.Where(item => item.OrganizationId == id);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(item => item.User.Email).ThenBy(item => item.UserId).Skip(window.Offset).Take(window.PageSize)
            .Select(item => new OrgMemberDto(item.UserId, item.User.Email, item.User.DisplayName, item.Role,
                item.CustomRoleId, item.CustomRole == null ? null : item.CustomRole.Name, item.User.SystemRole)).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> InviteMemberAsync(Guid id, InviteMemberDto dto, CancellationToken token = default)
    {
        var actingRole = await userContext.GetRoleAsync(id);
        if (actingRole is not (OrgRole.Admin or OrgRole.Owner)) return new(StatusCodes.Status403Forbidden);
        if (!Enum.IsDefined(dto.Role) || dto.Role == OrgRole.Owner) return new(StatusCodes.Status400BadRequest, "An organization can only have one owner. Invite as Admin or another role instead.");
        if (dto.CustomRoleId is null && dto.Role == OrgRole.Admin && actingRole != OrgRole.Owner) return new(StatusCodes.Status403Forbidden);
        var customRole = dto.CustomRoleId is { } roleId
            ? await db.OrganizationRoles.FirstOrDefaultAsync(role => role.Id == roleId && role.OrganizationId == id, token) : null;
        if (dto.CustomRoleId is not null && customRole is null) return new(StatusCodes.Status400BadRequest, "Role does not belong to this organization.");
        var assignedRole = customRole is null ? dto.Role : OrgRole.ReadOnly;
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Email == email, token);
        if (user is null) return new(StatusCodes.Status404NotFound, "No registered user with that email address was found.");
        if (user.SystemRole == SystemRole.Client) return new(StatusCodes.Status400BadRequest, "Clients are assigned through client management and cannot join another organization.");
        if (await db.UserOrganizations.AnyAsync(item => item.OrganizationId == id && item.UserId == user.Id, token)) return new(StatusCodes.Status409Conflict, "This user is already a member of the organization.");
        db.UserOrganizations.Add(new UserOrganization { UserId = user.Id, OrganizationId = id, Role = assignedRole, CustomRoleId = customRole?.Id });
        await db.SaveChangesAsync(token);
        if (notifications is not null)
            await notifications.NotifyAsync(id, "role_membership_changed", "Organization membership changed",
                $"{user.DisplayName} ({user.Email}) joined the organization as {customRole?.Name ?? assignedRole.ToString()}.", token);
        return new(StatusCodes.Status200OK, new OrgMemberDto(user.Id, user.Email, user.DisplayName, assignedRole, customRole?.Id, customRole?.Name));
    }

    public async Task<ApiOperationResult> RemoveMemberAsync(Guid id, Guid userId, CancellationToken token = default)
    {
        if (await IsClientAsync(token)) return new(StatusCodes.Status403Forbidden);
        var isSelf = userId == userContext.UserId;
        var actingRole = await userContext.GetRoleAsync(id);
        if (actingRole is null || (!isSelf && actingRole < OrgRole.Admin)) return new(StatusCodes.Status403Forbidden);
        var membership = await db.UserOrganizations.FirstOrDefaultAsync(item => item.OrganizationId == id && item.UserId == userId, token);
        if (membership is null) return new(StatusCodes.Status404NotFound);
        if (membership.Role == OrgRole.Owner) return new(StatusCodes.Status400BadRequest,
            isSelf ? "The organization owner cannot leave. Delete the organization instead if you want to give it up." : "The organization owner cannot be removed.");
        if (!isSelf && actingRole != OrgRole.Owner && membership.Role >= OrgRole.Admin) return new(StatusCodes.Status403Forbidden);
        var removedName = await db.Users.Where(x => x.Id == userId).Select(x => x.DisplayName).SingleAsync(token);
        db.UserOrganizations.Remove(membership); await db.SaveChangesAsync(token);
        if (notifications is not null)
            await notifications.NotifyAsync(id, "role_membership_changed", "Organization membership changed",
                $"{removedName} was removed from the organization.", token);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default)
    {
        if (await userContext.GetRoleAsync(id) != OrgRole.Owner) return new(StatusCodes.Status403Forbidden);
        var item = await db.Organizations.FirstOrDefaultAsync(org => org.Id == id, token); if (item is null) return new(StatusCodes.Status404NotFound);
        item.IsDeleted = true; item.DeletedAt = DateTime.UtcNow; await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> RestoreAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.Organizations.IgnoreQueryFilters().FirstOrDefaultAsync(org => org.Id == id, token);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!item.IsDeleted) return new(StatusCodes.Status400BadRequest, "Organization is not deleted.");
        var role = await db.UserOrganizations.Where(member => member.OrganizationId == id && member.UserId == userContext.UserId)
            .Select(member => (OrgRole?)member.Role).FirstOrDefaultAsync(token);
        if (role != OrgRole.Owner) return new(StatusCodes.Status403Forbidden);
        item.IsDeleted = false; item.DeletedAt = null; await db.SaveChangesAsync(token); return new(StatusCodes.Status204NoContent);
    }

    private Task<bool> IsClientAsync(CancellationToken token) => db.Users.AnyAsync(user => user.Id == userContext.UserId && user.SystemRole == SystemRole.Client, token);
    private static ApiOperationResult PaginationError() => new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
}
