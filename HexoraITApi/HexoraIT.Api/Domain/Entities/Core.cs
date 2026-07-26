namespace HexoraITApi.Domain.Entities;

public class Asset : BaseEntity
{
    public string Name { get; set; } = "";
    public AssetType Type { get; set; }
    public AssetStatus Status { get; set; }
    public string Location { get; set; } = "";
    public string Owner { get; set; } = "";
    public string Ip { get; set; } = "";
    public DateTime UpdatedAt { get; set; }
    public bool Starred { get; set; }
    public List<string> Tags { get; set; } = [];
    public string Notes { get; set; } = "";
    public string? Serial { get; set; }
}

public class PasswordEntry : BaseEntity
{
    public string Name { get; set; } = "";
    public string Username { get; set; } = "";
    public byte[] EncryptedPassword { get; set; } = [];
    public string Category { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public DateTime UpdatedAt { get; set; }
    public PasswordStrength Strength { get; set; }
    public bool Starred { get; set; }
    public string Notes { get; set; } = "";
}

public class Subnet : BaseEntity
{
    public string Name { get; set; } = "";
    public string Cidr { get; set; } = "";
    public int? Vlan { get; set; }
    public SubnetType Type { get; set; }
    public string Gateway { get; set; } = "";
    public string Dns { get; set; } = "";
    public string Description { get; set; } = "";
    public List<IPEntry> Ips { get; set; } = [];
}

public class IPEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SubnetId { get; set; }
    public Subnet Subnet { get; set; } = null!;
    public string Ip { get; set; } = "";
    public string Label { get; set; } = "";
    public IPEntryStatus Status { get; set; }
    public Guid? AssetId { get; set; }
    public string? PlainText { get; set; }
    public string Notes { get; set; } = "";
}

public class License : BaseEntity
{
    public string Name { get; set; } = "";
    public string Vendor { get; set; } = "";
    public LicenseCategory Category { get; set; }
    public LicenseType Type { get; set; }
    public int Seats { get; set; }
    public int SeatsUsed { get; set; }
    public DateOnly PurchaseDate { get; set; }
    public DateOnly ExpiryDate { get; set; }
    public decimal Cost { get; set; }
    public string Currency { get; set; } = "";
    public string LicenseKey { get; set; } = ""; // TODO: Add encryption here
    public string Notes { get; set; } = "";
    public bool Starred { get; set; }
    public LicenseStatus Status { get; set; }
}

public class Contact : BaseEntity
{
    public string Name { get; set; } = "";
    public string Company { get; set; } = "";
    public string Role { get; set; } = "";
    public string Phone { get; set; } = "";
    public string Email { get; set; } = "";
    public string Description { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public bool Starred { get; set; }
}

public class Contract : BaseEntity
{
    public string Name { get; set; } = "";
    public string Vendor { get; set; } = "";
    public ContractCategory Category { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly EndDate { get; set; }
    public decimal Value { get; set; }
    public string Currency { get; set; } = "";
    public bool AutoRenew { get; set; }
    public string Notes { get; set; } = "";
    public bool Starred { get; set; }
    public ContractStatus Status { get; set; }
    
    public string? DocumentName { get; set; }
    public string? DocumentMimeType { get; set; }
    public long? DocumentSize { get; set; }
    public string? DocumentBlobPath { get; set; }
}

public class Plan : BaseEntity
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public Priority Priority { get; set; }
    public PlanStatus Status { get; set; }
    public DateOnly TargetDate { get; set; }
    public List<string> Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class Incident : BaseEntity
{
    public string Title { get; set; } = "";
    public IncidentSeverity Severity { get; set; }
    public IncidentStatus Status { get; set; }
    public string Description { get; set; } = "";
    public string Resolution { get; set; } = "";
    public List<string> AffectedSystems { get; set; } = [];
    public DateTime OccurredAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public List<string> Tags { get; set; } = [];
}

public class KnowledgeArticle : BaseEntity
{
    public string Title { get; set; } = "";
    public string Category { get; set; } = "";
    public string Content { get; set; } = "";
    public List<string> Tags { get; set; } = [];
    public DateTime UpdatedAt { get; set; }
    public bool Starred { get; set; }
}

public class WorkTask : BaseEntity
{
    public string Title { get; set; } = "";
    public string Description { get; set; } = "";
    public Priority Priority { get; set; }
    public WorkTaskStatus Status { get; set; }
    public string Assignee { get; set; } = "";
    public DateOnly DueDate { get; set; }
    public List<string> Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    
    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }
}

public class Group : BaseEntity
{
    public string Name { get; set; } = "";
    public GroupType Type { get; set; }
    public string Description { get; set; } = "";
    public string Purpose { get; set; } = "";
    public List<string> Members { get; set; } = [];
    public List<Guid> LinkedAssets { get; set; } = [];
    public List<string> Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; }
}

public class WarrantyItem : BaseEntity
{
    public string Name { get; set; } = "";
    public string Vendor { get; set; } = "";
    public string SerialNumber { get; set; } = "";
    public DateOnly PurchaseDate { get; set; }
    public DateOnly WarrantyEndDate { get; set; }
    public WarrantyType WarrantyType { get; set; }
    public string ContactName { get; set; } = "";
    public string ContactPhone { get; set; } = "";
    public string ContactEmail { get; set; } = "";
    public string Notes { get; set; } = "";
    public Guid? AssetId { get; set; }
    public bool Starred { get; set; }
    public WarrantyStatus Status { get; set; }
    public string? DocumentName { get; set; }
    public string? DocumentMimeType { get; set; }
    public long? DocumentSize { get; set; }
    public string? DocumentBlobPath { get; set; }
}

public class DiagramNode
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public DiagramDeviceType DeviceType { get; set; }
    public string Label { get; set; } = "";
    public string? Ip { get; set; }
    public Guid? AssetId { get; set; }
    public double X { get; set; }
    public double Y { get; set; }
    public string? Color { get; set; }
}

public class DiagramEdge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid SourceNodeId { get; set; }
    public Guid TargetNodeId { get; set; }
    public string? Label { get; set; }
    public DiagramConnectionType ConnectionType { get; set; }
}