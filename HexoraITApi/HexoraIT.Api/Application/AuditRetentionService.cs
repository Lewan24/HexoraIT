using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

// Opt-in retention. No evidence is automatically deleted unless configured by the operator.
public sealed class AuditRetentionService(IServiceScopeFactory scopes, IConfiguration configuration,
    ILogger<AuditRetentionService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var days = configuration.GetValue<int>("Audit:RetentionDays");
        if (days <= 0) return;
        using var timer = new PeriodicTimer(TimeSpan.FromHours(6));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = scopes.CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var cutoff = DateTime.UtcNow.AddDays(-days);
                // Bounded batches avoid holding long locks on the live audit table.
                var ids = await db.AuditEvents.Where(a => a.OccurredAt < cutoff)
                    .OrderBy(a => a.OccurredAt).Select(a => a.Id).Take(10000).ToListAsync(stoppingToken);
                if (ids.Count > 0) await db.AuditEvents.Where(a => ids.Contains(a.Id)).ExecuteDeleteAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { return; }
            catch (Exception ex) { logger.LogError(ex, "Audit retention failed"); }
        }
    }
}
