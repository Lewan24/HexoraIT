using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public sealed class ExpiryNotificationService(IServiceScopeFactory scopeFactory, ILogger<ExpiryNotificationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try { await ScanAsync(stoppingToken); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
            catch (Exception exception) { logger.LogError(exception, "Expiry notification scan failed."); }
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    internal async Task ScanAsync(CancellationToken token)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var notifications = scope.ServiceProvider.GetRequiredService<INotificationService>();
        if (!await db.GlobalEmailSettings.AsNoTracking().AnyAsync(x => x.Id == 1 && x.Enabled, token)) return;
        var savedPreferences = (await db.OrganizationNotificationSettings.AsNoTracking().ToListAsync(token)).ToDictionary(x => x.OrganizationId);
        var organizationIds = await db.Organizations.IgnoreQueryFilters().AsNoTracking().Where(x => !x.IsDeleted).Select(x => x.Id).ToListAsync(token);
        var preferences = organizationIds.Select(id => savedPreferences.GetValueOrDefault(id) ?? new OrganizationNotificationSettings { OrganizationId = id }).ToList();
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        foreach (var preference in preferences)
        {
            var lastDate = today.AddDays(preference.ExpiryWarningDays);
            if (preference.LicenseExpiring)
                foreach (var item in (await db.Licenses.IgnoreQueryFilters().AsNoTracking().Where(x => x.OrganizationId == preference.OrganizationId).ToListAsync(token)).Where(x => x.ExpiryDate >= today && x.ExpiryDate <= lastDate))
                    await SendOnceAsync(db, notifications, item.OrganizationId, "license_expiring", item.Id, item.ExpiryDate, $"License expiring: {item.Name}", $"The license '{item.Name}' expires on {item.ExpiryDate:yyyy-MM-dd}.", token);
            if (preference.ContractExpiring)
                foreach (var item in (await db.Contracts.IgnoreQueryFilters().AsNoTracking().Where(x => x.OrganizationId == preference.OrganizationId).ToListAsync(token)).Where(x => x.EndDate >= today && x.EndDate <= lastDate))
                    await SendOnceAsync(db, notifications, item.OrganizationId, "contract_expiring", item.Id, item.EndDate, $"Contract ending: {item.Name}", $"The contract '{item.Name}' ends on {item.EndDate:yyyy-MM-dd}.", token);
            if (preference.WarrantyExpiring)
                foreach (var item in (await db.WarrantyItems.IgnoreQueryFilters().AsNoTracking().Where(x => x.OrganizationId == preference.OrganizationId).ToListAsync(token)).Where(x => x.WarrantyEndDate >= today && x.WarrantyEndDate <= lastDate))
                    await SendOnceAsync(db, notifications, item.OrganizationId, "warranty_expiring", item.Id, item.WarrantyEndDate, $"Warranty ending: {item.Name}", $"The warranty for '{item.Name}' ends on {item.WarrantyEndDate:yyyy-MM-dd}.", token);
        }
    }

    private static async Task SendOnceAsync(AppDbContext db, INotificationService notifications, Guid organizationId,
        string eventType, Guid resourceId, DateOnly effectiveDate, string subject, string body, CancellationToken token)
    {
        if (await db.NotificationDeliveries.AnyAsync(x => x.OrganizationId == organizationId && x.EventType == eventType &&
            x.ResourceId == resourceId && x.EffectiveDate == effectiveDate, token)) return;
        await notifications.NotifyAsync(organizationId, eventType, subject, body, token);
        db.NotificationDeliveries.Add(new NotificationDelivery { OrganizationId = organizationId, EventType = eventType, ResourceId = resourceId, EffectiveDate = effectiveDate });
        await db.SaveChangesAsync(token);
    }
}
