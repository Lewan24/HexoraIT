using HexoraITApi.Application;
using HexoraITApi.Application.DataTransfer;
using Microsoft.AspNetCore.Mvc;

namespace HexoraITApi.Api.App;

public static class DataTransferEndpoints
{
    public static IEndpointRouteBuilder MapDataTransferEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations/{organizationId:guid}/data-transfer")
            .WithTags("Organization data transfer").RequireAuthorization().RequireRateLimiting("data-transfer")
            .AddEndpointFilter(async (context, next) =>
            {
                context.HttpContext.Response.Headers.CacheControl = "no-store";
                context.HttpContext.Response.Headers["X-Content-Type-Options"] = "nosniff";
                return await next(context);
            });
        group.MapGet("/capabilities", async (Guid organizationId, OrganizationArchiveService service, CancellationToken token) =>
            (await service.CapabilitiesAsync(organizationId, token)).ToHttpResult());
        group.MapGet("/options", async (Guid organizationId, OrganizationArchiveService service, CancellationToken token) =>
            (await service.ExportOptionsAsync(organizationId, token)).ToHttpResult());
        group.MapPost("/export-download", async (Guid organizationId, ArchiveExportRequest request, OrganizationArchiveService service, ArchiveDownloadStore downloads, CancellationToken token) =>
            (await service.PrepareDownloadAsync(organizationId, request, downloads, token)).ToHttpResult())
            .WithMetadata(new RequestSizeLimitAttribute(1_048_576));
        group.MapPost("/export", async (Guid organizationId, ArchiveExportRequest request, OrganizationArchiveService service, CancellationToken token) =>
        {
            var result = await service.ExportAsync(organizationId, request, token);
            return result.Value is ArchiveDownload download
                ? Results.Stream(download.Content, "application/zip", download.FileName)
                : result.ToHttpResult();
        }).WithMetadata(new RequestSizeLimitAttribute(1_048_576));
        group.MapPost("/preview", async (Guid organizationId, IFormFile file, [FromForm] string? archivePassword, OrganizationArchiveService service, CancellationToken token) =>
            (await service.PreviewAsync(organizationId, file, token, archivePassword)).ToHttpResult())
            .DisableAntiforgery().WithMetadata(UploadLimits());
        group.MapPost("/import", async (Guid organizationId, IFormFile file, [FromForm] string password, [FromForm] string reviewToken,
            [FromForm] string confirmOrganizationName, [FromForm] bool confirmImport, [FromForm] string? archivePassword, OrganizationArchiveService service, CancellationToken token) =>
            (await service.ImportAsync(organizationId, file, new(password, reviewToken, confirmOrganizationName, confirmImport, archivePassword), token)).ToHttpResult())
            .DisableAntiforgery().WithMetadata(UploadLimits());
        endpoints.MapGet("/api/data-transfer/download", async (string ticket, OrganizationArchiveService service, ArchiveDownloadStore downloads, HttpResponse response, CancellationToken token) =>
        {
            response.Headers.CacheControl = "no-store";
            response.Headers["Referrer-Policy"] = "no-referrer";
            response.Headers["X-Content-Type-Options"] = "nosniff";
            var result = await service.DownloadAsync(ticket, downloads, token);
            return result.Value is ArchiveDownload download ? Results.Stream(download.Content, "application/zip", download.FileName) : result.ToHttpResult();
        }).AllowAnonymous().RequireRateLimiting("data-transfer");
        return endpoints;
    }

    private static object[] UploadLimits() =>
    [new RequestSizeLimitAttribute(ArchiveSchema.MaxArchiveBytes + 1024 * 1024),
     new RequestFormLimitsAttribute { MultipartBodyLengthLimit = ArchiveSchema.MaxArchiveBytes + 1024 * 1024, ValueLengthLimit = 8192 }];
}
