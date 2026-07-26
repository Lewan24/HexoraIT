using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Infrastructure;

public interface ICurrentUserContext
{
    Guid UserId { get; }
    Task<bool> HasAccessAsync(Guid organizationId);
    Task<OrgRole?> GetRoleAsync(Guid organizationId);
    Task<List<Guid>> GetAccessibleOrganizationIdsAsync();
}

public class DbCurrentUserContext(AppDbContext db, ICurrentUserIdProvider idProvider) : ICurrentUserContext
{
    public Guid UserId => idProvider.UserId ?? throw new InvalidOperationException("No authenticated user.");

    public async Task<bool> HasAccessAsync(Guid organizationId) =>
        await db.UserOrganizations.AsNoTracking()
            .AnyAsync(uo => uo.UserId == UserId && uo.OrganizationId == organizationId);

    public async Task<OrgRole?> GetRoleAsync(Guid organizationId) =>
        await db.UserOrganizations.AsNoTracking()
            .Where(uo => uo.UserId == UserId && uo.OrganizationId == organizationId)
            .Select(uo => (OrgRole?)uo.Role)
            .FirstOrDefaultAsync();

    public async Task<List<Guid>> GetAccessibleOrganizationIdsAsync() =>
        await db.UserOrganizations.AsNoTracking()
            .Where(uo => uo.UserId == UserId)
            .Select(uo => uo.OrganizationId)
            .ToListAsync();
}