namespace HexoraITApi.Domain.Entities;

public sealed class OrganizationAudit
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public string Title { get; set; } = "";
    public DateOnly AuditDate { get; set; }
    public List<OrganizationAuditUpdate> Updates { get; set; } = [];
}

public sealed class OrganizationAuditUpdate
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuditId { get; set; }
    public OrganizationAudit Audit { get; set; } = null!;
    public Guid AuthorId { get; set; }
    public string Author { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = "";
    public string Note { get; set; } = "";
    public List<OrganizationAuditAttachment> Attachments { get; set; } = [];
}

public sealed class OrganizationAuditAttachment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UpdateId { get; set; }
    public OrganizationAuditUpdate Update { get; set; } = null!;
    public string FileName { get; set; } = "";
    public int Size { get; set; }
    public byte[] Content { get; set; } = [];
}
