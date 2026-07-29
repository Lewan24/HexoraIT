namespace HexoraITApi.Domain.Entities;

public class FileFolder : BaseEntity
{
    public string Name { get; set; } = "";
    public Guid? ParentFolderId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}