using System.Security;
using FluentAssertions;
using HexoraITApi.Application;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;

namespace HexoraIT.Tests.Application;

public sealed class LocalFileStorageTests : IDisposable
{
    private readonly string _testRoot = Path.Combine(Path.GetTempPath(), $"hexorait-storage-tests-{Guid.NewGuid():N}");

    [Fact]
    public async Task StorageUsesGeneratedNameAndRejectsTraversal()
    {
        Directory.CreateDirectory(_testRoot);
        var environment = new TestEnvironment { ContentRootPath = _testRoot };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["FileStorage:RootPath"] = "files" })
            .Build();
        var storage = new LocalFileStorage(environment, configuration);

        var key = await storage.SaveAsync(new MemoryStream("content"u8.ToArray()), "manual.pdf", "application/pdf");

        key.Should().MatchRegex("^[a-f0-9]{32}\\.pdf$");
        await using var stored = await storage.OpenAsync(key);
        using var reader = new StreamReader(stored);
        (await reader.ReadToEndAsync()).Should().Be("content");
        var traversal = () => storage.OpenAsync("../outside.txt");
        await traversal.Should().ThrowAsync<SecurityException>();
    }

    public void Dispose()
    {
        if (Directory.Exists(_testRoot)) Directory.Delete(_testRoot, recursive: true);
    }

    private sealed class TestEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "HexoraIT.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
