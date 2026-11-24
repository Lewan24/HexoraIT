namespace HexoraITApi.Domain.Entities;

public static class OrganizationActivityRetention
{
    public const int DefaultDays = 7;
    public const int MinDays = 1;
    public const int MaxDays = 365;
}

public sealed class OrganizationActivity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid ActorId { get; set; }
    public DateTime OccurredAt { get; set; }
    public string Action { get; set; } = "";
    public string Resource { get; set; } = "";
    public Guid ResourceId { get; set; }
    public string? ResourceName { get; set; }
    public string? PreviousName { get; set; }
}
