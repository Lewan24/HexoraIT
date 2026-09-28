using System.Diagnostics;
using System.Net;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Routing;

namespace HexoraITApi.Application;

public static class AuditCapture
{
    public static string Clean(string? value, int limit) =>
        new((value ?? "").Where(c => !char.IsControl(c)).Take(limit).ToArray());

    public static string SafePath(string? value)
    {
        // Strip query and fragment, including from redirect URLs. Never store userinfo.
        var path = (value ?? "").Split('?', '#')[0];
        if (Uri.TryCreate(path, UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https")
            path = uri.AbsolutePath;
        return Clean(path, 2048);
    }

    public static string? Address(IPAddress? ip) => ip?.IsIPv4MappedToIPv6 == true
        ? ip.MapToIPv4().ToString() : ip?.ToString();

    public static async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        var watch = Stopwatch.StartNew();
        var buffer = context.RequestServices.GetRequiredService<SecurityAuditLogger>();
        var failure = false;
        try { await next(context); }
        catch { failure = true; throw; }
        finally
        {
            var status = failure ? 500 : context.Response.StatusCode;
            var path = SafePath(context.Request.Path);
            var probe = IsProbePath(path);
            buffer.Events.Add(new AuditEvent
            {
                EventType = probe ? "security_probe_detected" : status switch { 401 => "authentication_required", 403 => "access_denied", 404 => "route_not_found",
                    429 => "rate_limited", >= 500 => "server_error", >= 400 => "request_rejected",
                    >= 300 and < 400 => "redirect", _ => "request_completed" },
                Severity = status >= 500 ? "error" : probe ? "error" : status >= 400 ? "warning" : "info",
                Signal = probe ? "possible_path_probe" : null
            });
            foreach (var item in buffer.Events)
            {
                item.UserId ??= context.User.Identity?.IsAuthenticated == true ? Parse(context.User.FindFirst("sub")?.Value) : null;
                item.SessionId = Clean(context.User.FindFirst("jti")?.Value, 80);
                item.OrganizationId ??= Parse(context.Request.RouteValues["organizationId"]?.ToString()) ?? Parse(context.Request.Query["organizationId"]);
                item.ResourceId ??= Parse(context.Request.RouteValues["id"]?.ToString());
                item.ClientIp = Address(context.Connection.RemoteIpAddress);
                item.PeerIp = context.Items["AuditPeerIp"] as string;
                item.Method = Clean(context.Request.Method, 16);
                if (item.Source != "client") item.Path = path;
                item.Route = Clean((context.GetEndpoint() as RouteEndpoint)?.RoutePattern.RawText, 512);
                item.StatusCode = status;
                item.DurationMs = watch.ElapsedMilliseconds;
                item.TraceId = Clean(context.TraceIdentifier, 128);
                item.UserAgent = Clean(context.Request.Headers.UserAgent, 512);
                item.RedirectPath = SafePath(context.Response.Headers.Location);
            }
            try
            {
                // Do not use RequestAborted: disconnected clients must still leave evidence.
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(5));
                await using var scope = context.RequestServices.GetRequiredService<IServiceScopeFactory>().CreateAsyncScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                db.AuditEvents.AddRange(buffer.Events);
                await db.SaveChangesAsync(timeout.Token);
            }
            catch (Exception ex)
            {
                // Observable fallback; never silently drop evidence on database failure.
                var logger = context.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("HexoraIT.SecurityAudit");
                logger.LogError(ex, "AUDIT_PERSISTENCE_FAILED TraceId={TraceId} Events={Events}",
                    context.TraceIdentifier, System.Text.Json.JsonSerializer.Serialize(buffer.Events));
            }
        }
    }
    private static Guid? Parse(string? value) => Guid.TryParse(value, out var id) ? id : null;

    public static bool IsProbePath(string path) =>
        path.Contains("/.env", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/.git", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/wp-admin", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/wp-login", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/phpmyadmin", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/actuator", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("../", StringComparison.Ordinal) ||
        path.Contains("%2e%2e", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/etc/passwd", StringComparison.OrdinalIgnoreCase) ||
        path.Contains("/server-status", StringComparison.OrdinalIgnoreCase);
}
