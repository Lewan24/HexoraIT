using System.Text.Json;
using System.Text.Json.Serialization;

namespace HexoraITApi.Application.DataTransfer;

public sealed record ArchiveExportRequest(string Password, bool ConfirmSensitiveData, string? ArchivePassword = null,
    List<string>? Sections = null, List<Guid>? FileIds = null, bool IncludeAttachments = true);
public sealed record ArchiveImportRequest(string Password, string ReviewToken, string ConfirmOrganizationName, bool ConfirmImport, string? ArchivePassword = null);
public sealed record ArchiveDownload(Stream Content, string FileName);
public sealed record ArchiveCapabilities(bool CanExport, bool CanImport, bool IsEmpty, long MaxArchiveBytes,
    long MaxFileBytes = ArchiveSchema.MaxFileBytes, long MaxExpandedBytes = ArchiveSchema.MaxExpandedBytes);
public sealed record ArchiveSectionOption(string Key, int Count);
public sealed record ArchiveFileOption(Guid Id, string Name, long Size);
public sealed record ArchiveExportOptions(List<ArchiveSectionOption> Sections, List<ArchiveFileOption> Files);
public sealed record ArchiveDownloadTicket(string DownloadToken);
public sealed record ArchivePreview(string OrganizationName, DateTime CreatedAt, Dictionary<string, int> Counts,
    int FileCount, long FileBytes, string ReviewToken);
public sealed record ArchiveReview(Guid UserId, Guid OrganizationId, Guid SecurityStamp, string Sha256, DateTime ExpiresAt);

public sealed class ArchiveManifest
{
    [JsonRequired] public string Format { get; set; } = "hexorait-organization";
    [JsonRequired] public int Version { get; set; } = 1;
    [JsonRequired] public string OrganizationName { get; set; } = "";
    [JsonRequired] public DateTime CreatedAt { get; set; }
    [JsonRequired] public Dictionary<string, List<ArchiveItem>> Records { get; set; } = [];
    [JsonRequired] public List<ArchiveFile> Files { get; set; } = [];
}
public sealed record ArchiveItem(Guid Id, Dictionary<string, JsonElement> Data);
public sealed record ArchiveFile(string Kind, Guid RecordId, string Entry, long Size, string Sha256);

public sealed class ArchiveValidationException(string message, int status = 400) : Exception(message)
{
    public int StatusCode { get; } = status;
}
