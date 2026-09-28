using HexoraITApi.Api.Interfaces;
using System.Security;

namespace HexoraITApi.Application;

public class LocalFileStorage(
    IWebHostEnvironment env,
    IConfiguration config,
    ILogger<LocalFileStorage>? logger = null) : IFileStorage
{
    private readonly string _root = Path.GetFullPath(
        Path.Combine(env.ContentRootPath, config["FileStorage:RootPath"] ?? "App_Data/files"));

    public async Task<string> SaveAsync(Stream content, string fileName, string contentType)
    {
        Directory.CreateDirectory(_root);
        var extension = Path.GetExtension(FileUploadSecurity.NormalizeFileName(fileName));
        var storageName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var fullPath = ResolvePath(storageName);
        try
        {
            await using var fs = new FileStream(
                fullPath, FileMode.CreateNew, FileAccess.Write, FileShare.None, 81920, FileOptions.Asynchronous);
            await content.CopyToAsync(fs);
            return storageName;
        }
        catch
        {
            try
            {
                if (File.Exists(fullPath)) File.Delete(fullPath);
            }
            catch (Exception cleanupException)
            {
                logger?.LogWarning(
                    cleanupException,
                    "Unable to remove incomplete blob {StorageName} after a failed write.",
                    storageName);
            }
            throw;
        }
    }

    public Task<Stream> OpenAsync(string path) => Task.FromResult<Stream>(File.OpenRead(ResolvePath(path)));

    public Task DeleteAsync(string path)
    {
        var fullPath = ResolvePath(path);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    private string ResolvePath(string storageName)
    {
        if (string.IsNullOrWhiteSpace(storageName) || Path.IsPathRooted(storageName))
            throw new SecurityException("Invalid storage path.");

        var fullPath = Path.GetFullPath(Path.Combine(_root, storageName));
        var rootPrefix = _root.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!fullPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase))
            throw new SecurityException("Storage path escapes the configured root.");
        return fullPath;
    }
}
