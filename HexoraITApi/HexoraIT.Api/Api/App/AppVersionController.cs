using System.Text.Json.Serialization;
using HexoraITApi.Application;
using HexoraITApi.Domain;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/version")]
public class AppVersionController(IOptions<AppSettings> appSettings, GitHubVersionService githubVersionService)
{
    private readonly AppSettings _appSettings = appSettings.Value;
    
    [HttpGet]
    public ActionResult<string> GetVersion()
        => new OkObjectResult(_appSettings.CurrentVersion);

    [HttpGet("latest")]
    public async Task<ActionResult<string>> GetLatestVersion()
    {
        var version = await githubVersionService.GetLatestVersionAsync();

        return version is null
            ? new StatusCodeResult(StatusCodes.Status503ServiceUnavailable)
            : new OkObjectResult(version);
    }
}