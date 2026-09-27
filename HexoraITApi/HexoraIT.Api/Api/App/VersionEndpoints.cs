using HexoraITApi.Application;
using HexoraITApi.Domain;
using Microsoft.Extensions.Options;

namespace HexoraITApi.Api.App;

public static class VersionEndpoints
{
    public static IEndpointRouteBuilder MapVersionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/version").WithTags("Version");

        group.MapGet("", (IOptions<AppSettings> settings) =>
                TypedResults.Ok(settings.Value.CurrentVersion))
            .WithName("GetCurrentVersion")
            .Produces<string>();

        group.MapGet("/latest", GetLatestVersionAsync)
            .WithName("GetLatestVersion")
            .Produces<string>()
            .Produces(StatusCodes.Status503ServiceUnavailable);

        return endpoints;
    }

    private static async Task<IResult> GetLatestVersionAsync(
        GitHubVersionService githubVersionService,
        CancellationToken cancellationToken)
    {
        var version = await githubVersionService.GetLatestVersionAsync(cancellationToken);
        return version is null
            ? TypedResults.StatusCode(StatusCodes.Status503ServiceUnavailable)
            : TypedResults.Ok(version);
    }
}
