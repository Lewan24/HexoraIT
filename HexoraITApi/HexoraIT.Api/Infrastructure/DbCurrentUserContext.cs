using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Infrastructure;

public interface ICurrentUserContext
{
    Guid UserId { get; }
    Task<bool> HasAccessAsync(Guid organizationId);
    Task<OrgRole?> GetRoleAsync(Guid organizationId);
    Task<List<Guid>> GetAccessibleOrganizationIdsAsync();
    Task<bool> HasPermissionAsync(Guid organizationId, string resource, bool write = false, Guid? resourceId = null);
}

public class DbCurrentUserContext(AppDbContext db, ICurrentUserIdProvider idProvider) : ICurrentUserContext
{
    public Guid UserId => idProvider.UserId ?? throw new InvalidOperationException("No authenticated user.");

    public async Task<bool> HasPermissionAsync(Guid organizationId, string resource, bool write = false, Guid? resourceId = null)
    {
        var membership = await db.UserOrganizations.AsNoTracking()
            .Where(m => m.UserId == UserId && m.OrganizationId == organizationId && !m.Organization.IsDeleted)
            .Select(m => new { m.Role, m.CustomRoleId })
            .FirstOrDefaultAsync();
        if (membership is null || !OrganizationResources.All.Contains(resource)) return false;
        if (membership.CustomRoleId is null)
            return !write || membership.Role >= OrgRole.Member;

        var rules = await db.RolePermissions.AsNoTracking()
            .Where(p => p.RoleId == membership.CustomRoleId && p.Resource == resource &&
                (resourceId == null || p.ResourceId == Guid.Empty || p.ResourceId == resourceId))
            .ToListAsync();
        var module = rules.FirstOrDefault(p => p.ResourceId == Guid.Empty);
        var item = rules.FirstOrDefault(p => p.ResourceId == resourceId && p.ResourceId != Guid.Empty);
        var effective = item ?? module;
        if (resourceId is null && !write)
            return rules.Any(p => p.CanRead);
        return effective is not null && effective.CanRead && (!write || effective.CanWrite);
    }

    public async Task<bool> HasAccessAsync(Guid organizationId) =>
        await db.UserOrganizations.AsNoTracking()
            .AnyAsync(uo => uo.UserId == UserId && uo.OrganizationId == organizationId && !uo.Organization.IsDeleted);

    public async Task<OrgRole?> GetRoleAsync(Guid organizationId) =>
        await db.UserOrganizations.AsNoTracking()
            .Where(uo => uo.UserId == UserId && uo.OrganizationId == organizationId)
            .Select(uo => (OrgRole?)(uo.CustomRoleId == null ? uo.Role : OrgRole.ReadOnly))
            .FirstOrDefaultAsync();

    public async Task<List<Guid>> GetAccessibleOrganizationIdsAsync() =>
        await db.UserOrganizations.AsNoTracking()
            .Where(uo => uo.UserId == UserId)
            .Select(uo => uo.OrganizationId)
            .ToListAsync();
}
