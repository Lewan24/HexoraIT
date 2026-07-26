using HexoraITApi.Api.Interfaces;
using HexoraITApi.Api;

namespace HexoraITApi.Application;

public class LocalFileStorage(IWebHostEnvironment env, IConfiguration config) : IFileStorage
{
    private readonly string _root = Path.Combine(env.ContentRootPath, config["FileStorage:RootPath"] ?? "App_Data/files");

    public async Task<string> SaveAsync(Stream content, string fileName, string contentType)
    {
        Directory.CreateDirectory(_root);
        var safeName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
        var fullPath = Path.Combine(_root, safeName);
        await using var fs = File.Create(fullPath);
        await content.CopyToAsync(fs);
        return safeName;
    }

    public Task<Stream> OpenAsync(string path) => Task.FromResult<Stream>(File.OpenRead(Path.Combine(_root, path)));

    public Task DeleteAsync(string path)
    {
        var fullPath = Path.Combine(_root, path);
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }
}