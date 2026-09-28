using HexoraITApi.Application;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using System.Net;

namespace HexoraITApi.Api.Administrator;

public static class AuditEndpoints
{
    public static IEndpointRouteBuilder MapAuditEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/admin/audit").RequireAuthorization("AdminOnly").WithTags("Audit");
        group.MapGet("", async (AppDbContext db, string? ip, Guid? userId, string? account, string? eventType,
            string? severity, string? path, string? traceId, string? sessionId, int? statusCode,
            DateTimeOffset? from, DateTimeOffset? to, int? page, int? pageSize, CancellationToken ct) =>
        {
            var number = page ?? 1;
            var size = pageSize ?? 50;
            if (number < 1 || number > 10000 || size < 1 || size > 100 || from > to ||
                (statusCode.HasValue && (statusCode < 100 || statusCode > 599))) return Results.BadRequest();
            var query = db.AuditEvents.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(ip))
            {
                if (!IPAddress.TryParse(ip, out var address)) return Results.BadRequest("Invalid IP address.");
                var normalized = AuditCapture.Address(address);
                query = query.Where(a => a.ClientIp == normalized);
            }
            if (userId.HasValue) query = query.Where(a => a.UserId == userId || a.TargetUserId == userId);
            if (!string.IsNullOrWhiteSpace(account)) query = query.Where(a => a.Account == account.Trim().ToLower());
            if (!string.IsNullOrWhiteSpace(eventType)) query = query.Where(a => a.EventType == eventType);
            if (!string.IsNullOrWhiteSpace(severity)) query = query.Where(a => a.Severity == severity);
            if (!string.IsNullOrWhiteSpace(path)) query = query.Where(a => a.Path.Contains(path));
            if (!string.IsNullOrWhiteSpace(traceId)) query = query.Where(a => a.TraceId == traceId);
            if (!string.IsNullOrWhiteSpace(sessionId)) query = query.Where(a => a.SessionId == sessionId);
            if (statusCode.HasValue) query = query.Where(a => a.StatusCode == statusCode);
            if (from.HasValue) query = query.Where(a => a.OccurredAt >= from.Value.UtcDateTime);
            if (to.HasValue) query = query.Where(a => a.OccurredAt <= to.Value.UtcDateTime);
            var total = await query.CountAsync(ct);
            var items = await query.OrderByDescending(a => a.OccurredAt).ThenByDescending(a => a.Id)
                .Skip((number - 1) * size).Take(size).ToListAsync(ct);
            return Results.Ok(new { items, total, page = number, pageSize = size });
        });
        group.MapGet("/summary", async (AppDbContext db, CancellationToken ct) =>
        {
            var since = DateTime.UtcNow.AddHours(-24);
            var query = db.AuditEvents.AsNoTracking().Where(a => a.OccurredAt >= since);
            var counts = await query.GroupBy(a => 1).Select(g => new
            {
                Total = g.Count(),
                Warnings = g.Count(a => a.Severity == "warning"),
                Failures = g.Count(a => a.EventType.Contains("failed") || a.StatusCode == 401),
                Errors = g.Count(a => a.Severity == "error" || a.StatusCode >= 500),
                Denied = g.Count(a => a.EventType == "access_denied" || a.StatusCode == 403),
                RateLimited = g.Count(a => a.EventType == "rate_limited" || a.StatusCode == 429),
                Incidents = g.Count(a => a.EventType == "security_probe_detected" || a.Signal == "possible_path_probe"),
                NotFound = g.Count(a => a.StatusCode == 404 || a.EventType == "route_not_found")
            }).SingleOrDefaultAsync(ct);
            return Results.Ok(new
            {
                since,
                total = counts?.Total ?? 0,
                warnings = counts?.Warnings ?? 0,
                failures = counts?.Failures ?? 0,
                errors = counts?.Errors ?? 0,
                denied = counts?.Denied ?? 0,
                rateLimited = counts?.RateLimited ?? 0,
                incidents = counts?.Incidents ?? 0,
                notFound = counts?.NotFound ?? 0
            });
        });
        group.MapGet("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
            await db.AuditEvents.AsNoTracking().SingleOrDefaultAsync(a => a.Id == id, ct) is { } item
                ? Results.Ok(item) : Results.NotFound());
        // Browser reports are explicitly untrusted; identity and IP always come from the server.
        endpoints.MapPost("/api/audit/client", (ClientAuditDto dto, SecurityAuditLogger audit) =>
        {
            if (dto.EventType is not ("navigation" or "client_not_found" or "security_probe") || string.IsNullOrEmpty(dto.Path) ||
                dto.Path.Length > 2048 || !dto.Path.StartsWith('/') || dto.Path.StartsWith("//")) return Results.BadRequest();
            var path = AuditCapture.SafePath(dto.Path);
            var probe = AuditCapture.IsProbePath(path) || dto.EventType == "security_probe";
            audit.Events.Add(new() { EventType = probe ? "security_probe_detected" : dto.EventType, Source = "client", Path = path,
                Severity = probe ? "error" : dto.EventType == "client_not_found" ? "warning" : "info",
                Signal = probe ? "possible_path_probe" : "unverified_client_report" });
            return Results.NoContent();
        }).RequireRateLimiting("client-audit").WithMetadata(new Microsoft.AspNetCore.Mvc.RequestSizeLimitAttribute(4096));
        return endpoints;
    }
}
public sealed record ClientAuditDto(string EventType, string Path);
