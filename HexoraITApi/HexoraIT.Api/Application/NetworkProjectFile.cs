using System.Text.Json;

namespace HexoraITApi.Application;

public static class NetworkProjectFile
{
    public const string ContentType = "application/vnd.hexora.network-project+json";
    public const long MaxBytes = 10 * 1024 * 1024;

    public static string ValidateName(string name)
    {
        var fileName = FileUploadSecurity.NormalizeFileName(name);
        if (fileName != name || !fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase) || fileName.Length == 5)
            throw new InvalidDataException("Choose a network project with a .json file name.");
        return fileName;
    }

    public static async Task<ValidatedUpload> ValidateAsync(IFormFile file, CancellationToken token)
    {
        var name = ValidateName(file.FileName);
        if (file.Length > MaxBytes)
            throw new InvalidDataException("Network projects must be at most 10 MiB.");

        try
        {
            await using var stream = file.OpenReadStream();
            using var document = await JsonDocument.ParseAsync(stream, cancellationToken: token);
            var project = document.RootElement;
            if (project.ValueKind == JsonValueKind.Object &&
                project.TryGetProperty("name", out var title) && title.ValueKind == JsonValueKind.String &&
                project.TryGetProperty("devices", out var devices) && devices.ValueKind == JsonValueKind.Array &&
                project.TryGetProperty("links", out var links) && links.ValueKind == JsonValueKind.Array)
                return new(name, ContentType);
        }
        catch (JsonException exception)
        {
            throw new InvalidDataException("The file is not a valid Network Architect project JSON.", exception);
        }
        throw new InvalidDataException("The file is not a valid Network Architect project JSON.");
    }
}
