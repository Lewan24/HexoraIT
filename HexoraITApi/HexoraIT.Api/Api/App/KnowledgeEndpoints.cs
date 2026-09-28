using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class KnowledgeEndpoints
{
    public static IEndpointRouteBuilder MapKnowledgeEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/knowledge").WithTags("Knowledge").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>()
            .Produces<List<KnowledgeArticleDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync).Produces<KnowledgeArticleDto>().Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateKnowledgeArticleDto>>()
            .Produces<KnowledgeArticleDto>(StatusCodes.Status201Created).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateKnowledgeArticleDto>>()
            .Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/{id:guid}/star", ToggleStarAsync).Produces<KnowledgeStarredDto>().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }

    private static async Task<IResult> GetAllAsync(Guid? organizationId, [AsParameters] PaginationParameters pagination, IKnowledgeService service, HttpResponse response, CancellationToken cancellationToken) =>
        (await service.GetAllAsync(organizationId, pagination, cancellationToken)).ToHttpResult(response);
    private static async Task<IResult> GetByIdAsync(Guid id, IKnowledgeService service, CancellationToken cancellationToken) =>
        (await service.GetByIdAsync(id, cancellationToken)).ToHttpResult();
    private static async Task<IResult> CreateAsync(Guid organizationId, CreateKnowledgeArticleDto dto, IKnowledgeService service, CancellationToken cancellationToken) =>
        (await service.CreateAsync(organizationId, dto, cancellationToken)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdateKnowledgeArticleDto dto, IKnowledgeService service, CancellationToken cancellationToken) =>
        (await service.UpdateAsync(id, dto, cancellationToken)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, IKnowledgeService service, CancellationToken cancellationToken) =>
        (await service.DeleteAsync(id, cancellationToken)).ToHttpResult();
    private static async Task<IResult> ToggleStarAsync(Guid id, IKnowledgeService service, CancellationToken cancellationToken) =>
        (await service.ToggleStarAsync(id, cancellationToken)).ToHttpResult();
}
