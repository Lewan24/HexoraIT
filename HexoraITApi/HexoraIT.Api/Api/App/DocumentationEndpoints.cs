using HexoraITApi.Application;
using HexoraITApi.Application.Documentation;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace HexoraITApi.Api.App;

public static class DocumentationEndpoints
{
    public static IEndpointRouteBuilder MapDocumentationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations/{organizationId:guid}/documentation").WithTags("Documentation").RequireAuthorization();
        group.MapGet("/options", async (Guid organizationId, DocumentationService service, CancellationToken token) =>
            (await service.GetOptionsAsync(organizationId, token)).ToHttpResult());
        group.MapGet("/items/{section}", async (Guid organizationId, string section, string? search, [AsParameters] PaginationParameters pagination, DocumentationService service, HttpResponse response, CancellationToken token) =>
            (await service.GetItemsAsync(organizationId, section, pagination, token, search)).ToHttpResult(response))
            .AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>();
        group.MapPost("/pdf", async (Guid organizationId, DocumentationRequestDto options, DocumentationService service, HttpResponse response, CancellationToken token) =>
        {
            var result = await service.GenerateAsync(organizationId, options, token);
            if (result.Value is not DocumentationPdf pdf) return result.StatusCode == 413 ? Results.Problem(detail: result.Value?.ToString(), statusCode: 413) : result.ToHttpResult();
            response.Headers.CacheControl = "no-store";
            return Results.File(pdf.Content, "application/pdf", pdf.FileName);
        }).RequireRateLimiting("documentation-export").AddEndpointFilter<DataAnnotationsValidationFilter<DocumentationRequestDto>>()
            .WithMetadata(new RequestSizeLimitAttribute(1_048_576)).Produces(StatusCodes.Status200OK, contentType: "application/pdf")
            .Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status413PayloadTooLarge);
        return endpoints;
    }
}
