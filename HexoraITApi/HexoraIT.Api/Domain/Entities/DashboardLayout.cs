namespace HexoraITApi.Domain.Entities;

public class DashboardLayout
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid OrganizationId { get; set; }
    public List<string> SectionOrder { get; set; } = [];
    public List<string> HiddenSections { get; set; } = [];
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}