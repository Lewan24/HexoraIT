using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Application;

public interface ISecurityAuditLogger
{
    void AuthenticationSucceeded(Guid userId);
    void AuthenticationFailed(string account, Guid? targetUserId) { }
    void AccountChanged(string action, Guid actorUserId, Guid targetUserId);
    void SensitiveResourceAccessed(string action, Guid userId, Guid resourceId, Guid organizationId);
    void RequestRejected(int statusCode, string method, string path, Guid? userId, string traceId, string? remoteAddress);
}

// Request-scoped buffer. Middleware persists with a separate DbContext, even when the
// business transaction fails. No bodies, credentials, cookies or authorization headers.
public sealed class SecurityAuditLogger(ILoggerFactory loggerFactory, IHttpContextAccessor accessor) : ISecurityAuditLogger
{
    private void Record(AuditEvent item)
    {
        Events.Add(item);
        var eventId = item.EventType switch { "authentication_succeeded" => 1001, "authentication_failed" => 1002,
            "request_rejected" => 1901, _ => item.ResourceId.HasValue ? 1201 : 1101 };
        loggerFactory.CreateLogger("HexoraIT.SecurityAudit").Log(
            item.Severity == "info" ? LogLevel.Information : LogLevel.Warning,
            new EventId(eventId, item.EventType),
            "SecurityAudit EventType={EventType} UserId={UserId} TargetUserId={TargetUserId} ResourceId={ResourceId} TraceId={TraceId}",
            item.EventType, item.UserId, item.TargetUserId, item.ResourceId,
            string.IsNullOrEmpty(item.TraceId) ? accessor.HttpContext?.TraceIdentifier : item.TraceId);
    }
    public List<AuditEvent> Events { get; } = [];
    public void AuthenticationSucceeded(Guid userId) => Record(new() { EventType = "authentication_succeeded", UserId = userId });
    public void AuthenticationFailed(string account, Guid? targetUserId) => Record(new()
    {
        EventType = "authentication_failed", Severity = "warning",
        Account = AuditCapture.Clean(account, 256), TargetUserId = targetUserId
    });
    public void AccountChanged(string action, Guid actorUserId, Guid targetUserId) => Record(new()
    { EventType = action, UserId = actorUserId, TargetUserId = targetUserId, Severity = "warning" });
    public void SensitiveResourceAccessed(string action, Guid userId, Guid resourceId, Guid organizationId) => Record(new()
    { EventType = action, UserId = userId, ResourceId = resourceId, OrganizationId = organizationId, Severity = "warning" });
    public void RequestRejected(int statusCode, string method, string path, Guid? userId, string traceId, string? remoteAddress) => Record(new()
    { EventType = "request_rejected", Severity = "warning", UserId = userId, TraceId = traceId });
}
