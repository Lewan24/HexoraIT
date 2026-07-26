namespace HexoraITApi.Domain.Entities;

public class Project : BaseEntity
{
    public string Name { get; set; } = "";
    public string Description { get; set; } = "";
    public string Color { get; set; } = "#2563eb";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public List<WorkTask> Tasks { get; set; } = [];
}