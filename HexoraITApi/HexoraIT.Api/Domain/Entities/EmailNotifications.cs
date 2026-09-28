namespace HexoraITApi.Domain.Entities;

public class GlobalEmailSettings
{
    public int Id { get; set; } = 1;
    public bool Enabled { get; set; }
    public string Host { get; set; } = "";
    public int Port { get; set; } = 587;
    public bool UseTls { get; set; } = true;
    public string Username { get; set; } = "";
    public byte[]? EncryptedPassword { get; set; }
    public string FromAddress { get; set; } = "";
    public string FromName { get; set; } = "HexoraIT";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class OrganizationNotificationSettings
{
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    public bool LicenseExpiring { get; set; } = true;
    public bool ClientTaskCreated { get; set; } = true;
    public bool IncidentCreated { get; set; } = true;
    public bool ContractExpiring { get; set; } = true;
    public bool WarrantyExpiring { get; set; } = true;
    public bool RoleOrMembershipChanged { get; set; } = true;
    public int ExpiryWarningDays { get; set; } = 30;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class AccountActionToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Purpose { get; set; } = "";
    public byte[] TokenHash { get; set; } = [];
    public DateTime ExpiresAt { get; set; }
    public DateTime? UsedAt { get; set; }
}

public class NotificationDelivery
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public string EventType { get; set; } = "";
    public Guid ResourceId { get; set; }
    public DateOnly EffectiveDate { get; set; }
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
}
