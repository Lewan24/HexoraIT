using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IDashboardLayoutService
{
    Task<ApiOperationResult> GetAsync(Guid organizationId, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> SaveAsync(Guid organizationId, DashboardLayoutDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ResetAsync(Guid organizationId, CancellationToken cancellationToken = default);
}

public sealed class DashboardLayoutService(AppDbContext db, ICurrentUserContext userContext) : IDashboardLayoutService
{
    public async Task<ApiOperationResult> GetAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "dashboard")) return new(StatusCodes.Status403Forbidden);
        var layout = await FindAsync(organizationId, cancellationToken);
        return new(StatusCodes.Status200OK, layout is null ? null : new DashboardLayoutDto(layout.SectionOrder, layout.HiddenSections));
    }

    public async Task<ApiOperationResult> SaveAsync(Guid organizationId, DashboardLayoutDto dto, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "dashboard")) return new(StatusCodes.Status403Forbidden);
        var layout = await FindAsync(organizationId, cancellationToken);
        if (layout is null)
        {
            layout = new DashboardLayout { UserId = userContext.UserId, OrganizationId = organizationId };
            db.DashboardLayouts.Add(layout);
        }
        layout.SectionOrder = dto.SectionOrder;
        layout.HiddenSections = dto.HiddenSections;
        layout.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ResetAsync(Guid organizationId, CancellationToken cancellationToken = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "dashboard")) return new(StatusCodes.Status403Forbidden);
        var layout = await FindAsync(organizationId, cancellationToken);
        if (layout is not null)
        {
            db.DashboardLayouts.Remove(layout);
            await db.SaveChangesAsync(cancellationToken);
        }
        return new(StatusCodes.Status204NoContent);
    }

    private Task<DashboardLayout?> FindAsync(Guid organizationId, CancellationToken cancellationToken) => db.DashboardLayouts
        .FirstOrDefaultAsync(layout => layout.OrganizationId == organizationId && layout.UserId == userContext.UserId, cancellationToken);
}
