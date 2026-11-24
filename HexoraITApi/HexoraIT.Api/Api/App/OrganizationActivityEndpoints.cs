using System.Text.Json;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

public static class OrganizationActivityEndpoints
{
    public static void MapOrganizationActivityEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations/{id:guid}/activity").RequireAuthorization().WithTags("Organization activity");
        group.MapGet("", ListAsync).Produces<OrganizationActivityPage>().Produces(400).Produces(403);
        group.MapPut("/settings", SaveSettingsAsync).Produces<OrganizationActivitySettings>().Produces(400).Produces(403);
        group.MapGet("/export", ExportAsync).Produces(200, contentType: "application/json").Produces(403);
    }

    private static async Task<IResult> ListAsync(Guid id, int? page, OrganizationActivityService service, HttpResponse response, CancellationToken token)
    {
        var organization = await service.GetAuthorizedOrganizationAsync(id, token);
        if (organization is null) return Results.Forbid();
        if (page is < 1 or > OrganizationActivityService.MaxPage) return Results.BadRequest("Invalid activity page.");
        response.Headers.CacheControl = "no-store";
        return Results.Ok(await service.GetPageAsync(organization, page ?? 1, token));
    }

    private static async Task<IResult> SaveSettingsAsync(Guid id, OrganizationActivitySettings settings, OrganizationActivityService service, CancellationToken token)
    {
        var organization = await service.GetAuthorizedOrganizationAsync(id, token);
        if (organization is null) return Results.Forbid();
        if (settings.RetentionDays is < OrganizationActivityRetention.MinDays or > OrganizationActivityRetention.MaxDays)
            return Results.BadRequest("Activity retention must be between 1 and 365 days.");
        await service.SaveSettingsAsync(organization, settings, token);
        return Results.Ok(settings);
    }

    private static async Task<IResult> ExportAsync(Guid id, OrganizationActivityService service, HttpResponse response, CancellationToken token)
    {
        var organization = await service.GetAuthorizedOrganizationAsync(id, token);
        if (organization is null) return Results.Forbid();
        var events = service.Read(organization).AsAsyncEnumerable();
        response.Headers.CacheControl = "no-store";
        // Stream the entire retained history. JSON preserves text without spreadsheet formulas.
        return Results.Stream(stream => JsonSerializer.SerializeAsync(stream, events, JsonSerializerOptions.Web, token),
            "application/json", $"organization-activity-{id:D}.json");
    }
}
