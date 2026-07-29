namespace HexoraITApi.Domain.Dtos;

public record FileFolderDto(Guid Id, string Name, Guid? ParentFolderId, DateTime CreatedAt);
public record CreateFolderDto(string Name, Guid? ParentFolderId);

public record StoredFileDto(Guid Id, string Name, string MimeType, long Size, Guid? FolderId, DateTime UploadedAt);