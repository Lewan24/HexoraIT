namespace HexoraITApi.Domain.Entities;

// Deliberately has no cascading foreign keys: evidence survives account/resource deletion.
public sealed class AuditEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string EventType { get; set; } = "request_completed";
    public string Severity { get; set; } = "info";
    public string Source { get; set; } = "server";
    public Guid? UserId { get; set; }
    public Guid? TargetUserId { get; set; }
    public Guid? OrganizationId { get; set; }
    public Guid? ResourceId { get; set; }
    public string? Account { get; set; }
    public string? SessionId { get; set; }
    public string? ClientIp { get; set; }
    public string? PeerIp { get; set; }
    public string Method { get; set; } = "";
    public string Path { get; set; } = "";
    public string? Route { get; set; }
    public int StatusCode { get; set; }
    public long DurationMs { get; set; }
    public string TraceId { get; set; } = "";
    public string? UserAgent { get; set; }
    public string? RedirectPath { get; set; }
    public string? Signal { get; set; }
}
