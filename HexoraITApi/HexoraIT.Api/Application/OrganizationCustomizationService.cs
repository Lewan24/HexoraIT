using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public sealed record OrganizationCustomizationDto(List<string> HiddenModules);

public sealed class OrganizationCustomizationService(AppDbContext db, ICurrentUserContext userContext)
{
    public static readonly string[] CustomizableModules = OrganizationResources.All
        .Where(resource => resource is not ("dashboard" or "settings")).ToArray();

    public static List<string> DefaultHiddenModules(bool temporary) => temporary
        ? CustomizableModules.Except(["assets", "passwords", "contacts", "contracts", "knowledge", "files"]).ToList()
        : [];

    public static bool ValidModules(List<string> modules) => modules.Count <= CustomizableModules.Length &&
        modules.All(CustomizableModules.Contains);

    public async Task<ApiOperationResult> GetAsync(Guid id, CancellationToken token = default)
    {
        if (!await userContext.HasAccessAsync(id)) return new(StatusCodes.Status403Forbidden);
        var org = await db.Organizations.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, token);
        return org is null ? new(StatusCodes.Status404NotFound)
            : new(StatusCodes.Status200OK, new OrganizationCustomizationDto(org.HiddenModules));
    }

    public async Task<ApiOperationResult> SaveAsync(Guid id, OrganizationCustomizationDto dto, CancellationToken token = default)
    {
        if (!await userContext.HasAccessAsync(id) || await userContext.GetRoleAsync(id) is not (OrgRole.Owner or OrgRole.Admin))
            return new(StatusCodes.Status403Forbidden);
        if (dto.HiddenModules is null || !ValidModules(dto.HiddenModules))
            return new(StatusCodes.Status400BadRequest, "Invalid organization modules.");
        var org = await db.Organizations.FirstOrDefaultAsync(o => o.Id == id, token);
        if (org is null) return new(StatusCodes.Status404NotFound);
        org.HiddenModules = dto.HiddenModules.Distinct().Order().ToList();
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status204NoContent);
    }
}
