using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;

namespace HexoraITApi.Application;

public sealed class GitHubVersionService(
    HttpClient httpClient,
    IMemoryCache cache)
{
    private const string CacheKey = "github-latest-release";

    public async Task<string?> GetLatestVersionAsync()
    {
        return await cache.GetOrCreateAsync(CacheKey, async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1);

            httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("HexoraIT");

            var release = await httpClient.GetFromJsonAsync<GitHubReleaseDto>(
                "https://api.github.com/repos/Lewan24/HexoraIT/releases/latest");

            return release?.TagName;
        });
    }
    
    private sealed class GitHubReleaseDto
    {
        [JsonPropertyName("tag_name")]
        public string TagName { get; init; } = string.Empty;
    }
}