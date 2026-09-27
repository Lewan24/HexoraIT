namespace HexoraITApi.Application;

public interface ISecurityAuditLogger
{
    void AuthenticationSucceeded(Guid userId);
    void AccountChanged(string action, Guid actorUserId, Guid targetUserId);
    void SensitiveResourceAccessed(string action, Guid userId, Guid resourceId, Guid organizationId);
    void RequestRejected(int statusCode, string method, string path, Guid? userId, string traceId, string? remoteAddress);
}

public sealed class SecurityAuditLogger(
    ILoggerFactory loggerFactory,
    IHttpContextAccessor httpContextAccessor) : ISecurityAuditLogger
{
    private readonly ILogger _logger = loggerFactory.CreateLogger("HexoraIT.SecurityAudit");
    private const int AuthenticationEventId = 1001;
    private const int AccountEventId = 1101;
    private const int SensitiveAccessEventId = 1201;
    private const int RejectionEventId = 1901;

    public void AuthenticationSucceeded(Guid userId) =>
        _logger.LogInformation(
            new EventId(AuthenticationEventId, "AuthenticationSucceeded"),
            "SecurityAudit EventType={EventType} UserId={UserId} TraceId={TraceId} RemoteAddress={RemoteAddress}",
            "authentication_succeeded", userId, TraceId(), RemoteAddress());

    public void AccountChanged(string action, Guid actorUserId, Guid targetUserId) =>
        _logger.LogInformation(
            new EventId(AccountEventId, "AccountChanged"),
            "SecurityAudit EventType={EventType} ActorUserId={ActorUserId} TargetUserId={TargetUserId} TraceId={TraceId} RemoteAddress={RemoteAddress}",
            action, actorUserId, targetUserId, TraceId(), RemoteAddress());

    public void SensitiveResourceAccessed(string action, Guid userId, Guid resourceId, Guid organizationId) =>
        _logger.LogWarning(
            new EventId(SensitiveAccessEventId, "SensitiveResourceAccessed"),
            "SecurityAudit EventType={EventType} UserId={UserId} ResourceId={ResourceId} OrganizationId={OrganizationId} TraceId={TraceId} RemoteAddress={RemoteAddress}",
            action, userId, resourceId, organizationId, TraceId(), RemoteAddress());

    public void RequestRejected(
        int statusCode,
        string method,
        string path,
        Guid? userId,
        string traceId,
        string? remoteAddress) =>
        _logger.LogWarning(
            new EventId(RejectionEventId, "RequestRejected"),
            "SecurityAudit EventType={EventType} StatusCode={StatusCode} Method={Method} Path={Path} UserId={UserId} TraceId={TraceId} RemoteAddress={RemoteAddress}",
            "request_rejected", statusCode, method, path, userId, traceId, remoteAddress);

    private string? TraceId() => httpContextAccessor.HttpContext?.TraceIdentifier;

    private string? RemoteAddress() =>
        httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
}
