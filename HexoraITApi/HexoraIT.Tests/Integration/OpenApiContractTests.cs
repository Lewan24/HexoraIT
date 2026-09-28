using System.Text.Json;
using FluentAssertions;

namespace HexoraIT.Tests.Integration;

public sealed class OpenApiContractTests
{
    [Fact]
    public async Task TestingHost_ExposesOpenApiDocumentWithSecuredApiPaths()
    {
        using var factory = new SecurityWebApplicationFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/swagger/v2/swagger.json");
        response.IsSuccessStatusCode.Should().BeTrue();

        var content = await response.Content.ReadAsStringAsync();
        ExportDocumentWhenRequested(content);

        using var document = JsonDocument.Parse(content);
        var root = document.RootElement;
        root.GetProperty("openapi").GetString().Should().NotBeNullOrWhiteSpace();
        var paths = root.GetProperty("paths");
        paths.EnumerateObject().Should().Contain(path => path.Name.StartsWith("/api/", StringComparison.Ordinal));
    }

    [Fact]
    public async Task TestingHost_OpenApiDocument_ContainsVersionedApiOperations()
    {
        using var factory = new SecurityWebApplicationFactory();
        using var client = factory.CreateClient();

        using var response = await client.GetAsync("/swagger/v2/swagger.json");
        response.IsSuccessStatusCode.Should().BeTrue();

        using var document = JsonDocument.Parse(await response.Content.ReadAsStreamAsync());
        var root = document.RootElement;
        root.GetProperty("info").GetProperty("version").GetString().Should().Be("2.0.0");

        var apiPaths = root.GetProperty("paths")
            .EnumerateObject()
            .Where(path => path.Name.StartsWith("/api/", StringComparison.Ordinal))
            .ToList();

        apiPaths.Should().NotBeEmpty();
        apiPaths.Should().AllSatisfy(path =>
        {
            path.Value.EnumerateObject()
                .Where(operation => operation.Name is "get" or "post" or "put" or "patch" or "delete")
                .Should().NotBeEmpty();
        });
    }

    private static void ExportDocumentWhenRequested(string content)
    {
        var outputPath = Environment.GetEnvironmentVariable("HEXORAIT_OPENAPI_OUTPUT");
        if (string.IsNullOrWhiteSpace(outputPath))
            return;

        var fullPath = Path.GetFullPath(outputPath);
        var directory = Path.GetDirectoryName(fullPath);
        if (!string.IsNullOrWhiteSpace(directory))
            Directory.CreateDirectory(directory);

        File.WriteAllText(fullPath, content + Environment.NewLine);
    }
}
