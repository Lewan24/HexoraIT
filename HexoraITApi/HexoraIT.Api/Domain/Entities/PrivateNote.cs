namespace HexoraITApi.Domain.Entities;

public class PrivateNote
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = "";
    public string Content { get; set; } = "";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
