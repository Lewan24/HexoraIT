using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace HexoraITApi.Api.App;

public static class WarrantyEndpoints
{
    public static IEndpointRouteBuilder MapWarrantyEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/warranties").WithTags("Warranties").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<WarrantyItemDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync).Produces<WarrantyItemDto>().Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateWarrantyItemDto>>().Produces<WarrantyItemDto>(StatusCodes.Status201Created).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status409Conflict);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateWarrantyItemDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/{id:guid}/star", ToggleStarAsync).Produces<WarrantyStarredDto>().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPost("/{id:guid}/document", UploadDocumentAsync).DisableAntiforgery().WithMetadata(new RequestSizeLimitAttribute(20_000_000)).Produces<WarrantyItemDto>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapGet("/{id:guid}/document", DownloadDocumentAsync).Produces(StatusCodes.Status200OK).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetAllAsync(Guid? organizationId, [AsParameters] PaginationParameters pagination, IWarrantyService service, HttpResponse response, CancellationToken token) => (await service.GetAllAsync(organizationId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> GetByIdAsync(Guid id, IWarrantyService service, CancellationToken token) => (await service.GetByIdAsync(id, token)).ToHttpResult();
    private static async Task<IResult> CreateAsync(Guid organizationId, CreateWarrantyItemDto dto, IWarrantyService service, CancellationToken token) => (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdateWarrantyItemDto dto, IWarrantyService service, CancellationToken token) => (await service.UpdateAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, IWarrantyService service, CancellationToken token) => (await service.DeleteAsync(id, token)).ToHttpResult();
    private static async Task<IResult> ToggleStarAsync(Guid id, IWarrantyService service, CancellationToken token) => (await service.ToggleStarAsync(id, token)).ToHttpResult();
    private static async Task<IResult> UploadDocumentAsync(Guid id, IFormFile file, IWarrantyService service, CancellationToken token) => (await service.UploadDocumentAsync(id, file, token)).ToHttpResult();
    private static async Task<IResult> DownloadDocumentAsync(Guid id, IWarrantyService service, CancellationToken token)
    { var result = await service.DownloadDocumentAsync(id, token); return result.Value is DocumentDownload file ? Results.File(file.Content, file.ContentType, file.FileName) : result.ToHttpResult(); }
}
