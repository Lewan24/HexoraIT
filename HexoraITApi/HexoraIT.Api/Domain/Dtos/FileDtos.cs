using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record FileFolderDto(Guid Id, string Name, Guid? ParentFolderId, DateTime CreatedAt, int? SortIndex = null);
public record CreateFolderDto([Required, StringLength(200)] string Name, Guid? ParentFolderId);

public record StoredFileDto(Guid Id, string Name, string MimeType, long Size, Guid? FolderId, DateTime UploadedAt, int? SortIndex = null);
public record RenameFolderDto([Required, StringLength(200)] string Name);
public record MoveFolderDto(Guid? NewParentFolderId);
public record MoveFileDto(Guid? NewFolderId);
public record RenameFileDto([Required, StringLength(260)] string Name);
