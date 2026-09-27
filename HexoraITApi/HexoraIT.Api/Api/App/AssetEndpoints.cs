using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class AssetEndpoints
{
    public static IEndpointRouteBuilder MapAssetEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/assets")
            .WithTags("Assets")
            .RequireAuthorization();

        group.MapGet("", GetAllAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>()
            .Produces<List<AssetDto>>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapGet("/{id:guid}", GetByIdAsync)
            .Produces<AssetDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("", CreateAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<CreateAssetDto>>()
            .Produces<AssetDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status403Forbidden);

        group.MapPut("/{id:guid}", UpdateAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<UpdateAssetDto>>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        group.MapDelete("/{id:guid}", DeleteAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPatch("/{id:guid}/star", ToggleStarAsync)
            .Produces<AssetStarredDto>()
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetAllAsync(
        Guid? organizationId,
        [AsParameters] PaginationParameters pagination,
        IAssetService assetService,
        HttpResponse response,
        CancellationToken cancellationToken) =>
        (await assetService.GetAllAsync(organizationId, pagination, cancellationToken)).ToHttpResult(response);

    private static async Task<IResult> GetByIdAsync(
        Guid id,
        IAssetService assetService,
        CancellationToken cancellationToken) =>
        (await assetService.GetByIdAsync(id, cancellationToken)).ToHttpResult();

    private static async Task<IResult> CreateAsync(
        Guid organizationId,
        CreateAssetDto dto,
        IAssetService assetService,
        CancellationToken cancellationToken) =>
        (await assetService.CreateAsync(organizationId, dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> UpdateAsync(
        Guid id,
        UpdateAssetDto dto,
        IAssetService assetService,
        CancellationToken cancellationToken) =>
        (await assetService.UpdateAsync(id, dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> DeleteAsync(
        Guid id,
        IAssetService assetService,
        CancellationToken cancellationToken) =>
        (await assetService.DeleteAsync(id, cancellationToken)).ToHttpResult();

    private static async Task<IResult> ToggleStarAsync(
        Guid id,
        IAssetService assetService,
        CancellationToken cancellationToken) =>
        (await assetService.ToggleStarAsync(id, cancellationToken)).ToHttpResult();
}
