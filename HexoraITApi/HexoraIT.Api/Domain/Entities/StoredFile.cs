namespace HexoraITApi.Domain.Entities;

public class StoredFile : BaseEntity
{
    public string Name { get; set; } = "";
    public string MimeType { get; set; } = "application/octet-stream";
    public long Size { get; set; }
    public string BlobPath { get; set; } = "";
    public Guid? FolderId { get; set; }
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}