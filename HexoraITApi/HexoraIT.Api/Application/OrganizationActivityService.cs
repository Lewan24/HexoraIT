using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public record OrganizationActivityItem(Guid Id, DateTime OccurredAt, Guid ActorId, string? ActorName,
    string Action, string Resource, Guid ResourceId, string? ResourceName, string? PreviousName);
public record OrganizationActivityPage(int RetentionDays, int Page, bool HasMore, List<OrganizationActivityItem> Items);
public record OrganizationActivitySettings(int RetentionDays);

public sealed class OrganizationActivityService(AppDbContext db, ICurrentUserContext user)
{
    private const int PageSize = 50;
    public const int MaxPage = int.MaxValue / PageSize;

    public async Task<Organization?> GetAuthorizedOrganizationAsync(Guid id, CancellationToken token)
    {
        if (await user.GetRoleAsync(id) is not (OrgRole.Owner or OrgRole.Admin)) return null;
        return await db.Organizations.FirstOrDefaultAsync(org => org.Id == id, token);
    }

    public async Task<OrganizationActivityPage> GetPageAsync(Organization organization, int page, CancellationToken token)
    {
        var items = await Read(organization).Skip((page - 1) * PageSize).Take(PageSize + 1).ToListAsync(token);
        var hasMore = items.Count > PageSize;
        if (hasMore) items.RemoveAt(PageSize);
        return new(organization.ActivityRetentionDays, page, hasMore, items);
    }

    public async Task SaveSettingsAsync(Organization organization, OrganizationActivitySettings settings, CancellationToken token)
    {
        organization.ActivityRetentionDays = settings.RetentionDays;
        await db.SaveChangesAsync(token);
    }

    public IQueryable<OrganizationActivityItem> Read(Organization organization)
    {
        var cutoff = DateTime.UtcNow.AddDays(-organization.ActivityRetentionDays);
        return from activity in db.OrganizationActivities.AsNoTracking()
               where activity.OrganizationId == organization.Id && activity.OccurredAt >= cutoff
               join actor in db.Users.AsNoTracking() on activity.ActorId equals actor.Id into actors
               from actor in actors.DefaultIfEmpty()
               orderby activity.OccurredAt descending, activity.Id descending
               select new OrganizationActivityItem(activity.Id, activity.OccurredAt, activity.ActorId,
                   actor == null ? null : actor.DisplayName, activity.Action, activity.Resource,
                   activity.ResourceId, activity.ResourceName, activity.PreviousName);
    }
}

public sealed class OrganizationActivityCleanup(IServiceScopeFactory scopes, ILogger<OrganizationActivityCleanup> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));
        do
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await PurgeExpiredAsync(db, DateTime.UtcNow, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex) { logger.LogError(ex, "Organization activity cleanup failed"); }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    public static async Task PurgeExpiredAsync(AppDbContext db, DateTime now, CancellationToken token = default)
    {
        const int batchSize = 1000;
        var expired = db.OrganizationActivities.Where(activity => db.Organizations.IgnoreQueryFilters()
            .Any(org => org.Id == activity.OrganizationId && activity.OccurredAt < now.AddDays(-org.ActivityRetentionDays)));
        while (true)
        {
            var ids = await expired.OrderBy(activity => activity.OccurredAt).ThenBy(activity => activity.Id)
                .Select(activity => activity.Id).Take(batchSize).ToListAsync(token);
            if (ids.Count == 0) return;
            await expired.Where(activity => ids.Contains(activity.Id)).ExecuteDeleteAsync(token);
            if (ids.Count < batchSize) return;
        }
    }
}
