using System.IO.Compression;
using Microsoft.AspNetCore.Http;

namespace HexoraITApi.Application;

public sealed record ValidatedUpload(string FileName, string ContentType);

public static class FileUploadSecurity
{
    private const int SignatureLength = 16;
    private const int MaxArchiveEntries = 10_000;
    private const long MaxArchiveUncompressedBytes = 200_000_000;
    private static readonly char[] DisallowedFileNameCharacters = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];

    public static async Task<ValidatedUpload> ValidateAsync(
        IFormFile file,
        long maxBytes,
        CancellationToken cancellationToken = default)
    {
        if (file.Length <= 0)
            throw new InvalidDataException("File is empty.");
        if (file.Length > maxBytes)
            throw new InvalidDataException($"File exceeds the {maxBytes} byte limit.");

        var fileName = NormalizeFileName(file.FileName);
        var extension = Path.GetExtension(fileName).ToLowerInvariant();

        await using var stream = file.OpenReadStream();
        var signature = new byte[SignatureLength];
        var bytesRead = await stream.ReadAsync(signature.AsMemory(), cancellationToken);
        if (stream.CanSeek) stream.Position = 0;

        var contentType = extension switch
        {
            ".pdf" when StartsWith(signature, bytesRead, "%PDF-"u8) => "application/pdf",
            ".png" when StartsWith(signature, bytesRead, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) => "image/png",
            ".jpg" or ".jpeg" when StartsWith(signature, bytesRead, [0xFF, 0xD8, 0xFF]) => "image/jpeg",
            ".gif" when StartsWith(signature, bytesRead, "GIF87a"u8) || StartsWith(signature, bytesRead, "GIF89a"u8) => "image/gif",
            ".webp" when IsWebP(signature, bytesRead) => "image/webp",
            ".docx" when IsValidOpenXml(stream, "word/") =>
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xlsx" when IsValidOpenXml(stream, "xl/") =>
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".txt" or ".md" or ".csv" or ".log" or ".yml" or ".yaml" or ".json"
                when !signature.AsSpan(0, bytesRead).Contains((byte)0) => "text/plain",
            ".pdf" or ".png" or ".jpg" or ".jpeg" or ".gif" or ".webp" or ".docx" or ".xlsx" =>
                throw new InvalidDataException("File content does not match its extension."),
            _ => "application/octet-stream"
        };

        return new ValidatedUpload(fileName, contentType);
    }

    public static string NormalizeFileName(string submittedName)
    {
        var normalizedSeparators = (submittedName ?? string.Empty).Trim().Replace('\\', '/');
        var fileName = normalizedSeparators[(normalizedSeparators.LastIndexOf('/') + 1)..].Trim();
        if (string.IsNullOrWhiteSpace(fileName) || fileName is "." or "..")
            throw new InvalidDataException("File name is required.");
        if (fileName.Length > 240)
            throw new InvalidDataException("File name cannot exceed 240 characters.");
        if (fileName.EndsWith('.') || fileName.EndsWith(' ') || fileName.Any(char.IsControl) ||
            fileName.IndexOfAny(DisallowedFileNameCharacters) >= 0)
            throw new InvalidDataException("File name contains invalid characters.");
        return fileName;
    }

    public static bool CanRenderInline(string fileName, string contentType)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return (extension, contentType) switch
        {
            (".pdf", "application/pdf") => true,
            (".png", "image/png") => true,
            (".jpg" or ".jpeg", "image/jpeg") => true,
            (".gif", "image/gif") => true,
            (".webp", "image/webp") => true,
            (".docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document") => true,
            (".xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") => true,
            (".txt" or ".md" or ".csv" or ".log" or ".yml" or ".yaml" or ".json", "text/plain") => true,
            _ => false
        };
    }

    public static string SafeDownloadName(string storedName)
    {
        try
        {
            return NormalizeFileName(storedName);
        }
        catch (InvalidDataException)
        {
            return "download";
        }
    }

    private static bool IsValidOpenXml(Stream stream, string requiredPrefix)
    {
        if (!stream.CanSeek) return false;
        try
        {
            stream.Position = 0;
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read, leaveOpen: true);
            if (archive.Entries.Count == 0 || archive.Entries.Count > MaxArchiveEntries) return false;
            long totalLength = 0;
            var hasContentTypes = false;
            var hasRequiredPart = false;
            foreach (var entry in archive.Entries)
            {
                if (entry.Length > MaxArchiveUncompressedBytes - totalLength) return false;
                totalLength += entry.Length;
                if (entry.FullName.Equals("[Content_Types].xml", StringComparison.OrdinalIgnoreCase)) hasContentTypes = true;
                if (entry.FullName.StartsWith(requiredPrefix, StringComparison.OrdinalIgnoreCase)) hasRequiredPart = true;
            }
            return hasContentTypes && hasRequiredPart;
        }
        catch (InvalidDataException)
        {
            return false;
        }
        finally
        {
            stream.Position = 0;
        }
    }

    private static bool IsWebP(byte[] signature, int length) =>
        length >= 12 && signature.AsSpan(0, 4).SequenceEqual("RIFF"u8) &&
        signature.AsSpan(8, 4).SequenceEqual("WEBP"u8);

    private static bool StartsWith(byte[] buffer, int length, ReadOnlySpan<byte> expected) =>
        length >= expected.Length && buffer.AsSpan(0, expected.Length).SequenceEqual(expected);
}
