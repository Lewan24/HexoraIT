namespace HexoraITApi.Domain.Entities;

public sealed class OperationTemplateVersion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Key { get; set; } = "";
    public int Version { get; set; }
    public string ContentHash { get; set; } = "";
    public string SchemaJson { get; set; } = "{}";
    public DateTime PublishedAt { get; set; } = DateTime.UtcNow;
}

public sealed class OperationRecord : BaseEntity
{
    public string Number { get; set; } = "";
    public int Year { get; set; }
    public int Sequence { get; set; }
    public Guid TemplateVersionId { get; set; }
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public string Category { get; set; } = "A";
    public string ChangeType { get; set; } = "Normal";
    public string Priority { get; set; } = "Medium";
    public string Risk { get; set; } = "Medium";
    public string Status { get; set; } = "Draft";
    public Guid RequesterId { get; set; }
    public Guid ImplementerId { get; set; }
    public Guid OwnerId { get; set; }
    public Guid? AssetId { get; set; }
    public DateTime? PlannedStart { get; set; }
    public DateTime? PlannedEnd { get; set; }
    public DateTime? ActualStart { get; set; }
    public DateTime? ActualEnd { get; set; }
    public string ValuesJson { get; set; } = "{}";
    public Guid RevisionToken { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    public Guid ModifiedBy { get; set; }
    public DateTime? ClosedAt { get; set; }
    public bool EmergencyBypassed { get; set; }
    public bool RetrospectiveReviewed { get; set; }
}

public sealed class OperationRevision
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid RecordId { get; set; }
    public Guid RevisionToken { get; set; }
    public Guid ActorId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string SnapshotJson { get; set; } = "{}";
}

public sealed class OperationActivity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid RecordId { get; set; }
    public Guid ActorId { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
    public string EventType { get; set; } = "";
    public string FromStatus { get; set; } = "";
    public string ToStatus { get; set; } = "";
    // User-entered comments are kept in revision content, never in audit metadata.
}
