using HexoraITApi.Api.Interfaces;

namespace HexoraIT.Tests.Fakes;

public class FakeFileStorage : IFileStorage
{
    private readonly Dictionary<string, byte[]> _store = new();

    public Task<string> SaveAsync(Stream content, string fileName, string contentType)
    {
        using var ms = new MemoryStream();
        content.CopyTo(ms);

        var key = Guid.NewGuid().ToString();
        _store[key] = ms.ToArray();

        return Task.FromResult(key);
    }

    public Task<Stream> OpenAsync(string path)
        => Task.FromResult<Stream>(new MemoryStream(_store[path]));

    public Task DeleteAsync(string path)
    {
        _store.Remove(path);
        return Task.CompletedTask;
    }
}