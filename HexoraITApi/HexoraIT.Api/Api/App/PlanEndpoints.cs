using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class PlanEndpoints
{
    public static IEndpointRouteBuilder MapPlanEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/plans").WithTags("Plans").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>()
            .Produces<List<PlanDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync).Produces<PlanDto>().Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreatePlanDto>>()
            .Produces<PlanDto>(StatusCodes.Status201Created).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdatePlanDto>>()
            .Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }

    private static async Task<IResult> GetAllAsync(Guid? organizationId, [AsParameters] PaginationParameters pagination, IPlanService service, HttpResponse response, CancellationToken cancellationToken) =>
        (await service.GetAllAsync(organizationId, pagination, cancellationToken)).ToHttpResult(response);
    private static async Task<IResult> GetByIdAsync(Guid id, IPlanService service, CancellationToken cancellationToken) =>
        (await service.GetByIdAsync(id, cancellationToken)).ToHttpResult();
    private static async Task<IResult> CreateAsync(Guid organizationId, CreatePlanDto dto, IPlanService service, CancellationToken cancellationToken) =>
        (await service.CreateAsync(organizationId, dto, cancellationToken)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdatePlanDto dto, IPlanService service, CancellationToken cancellationToken) =>
        (await service.UpdateAsync(id, dto, cancellationToken)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, IPlanService service, CancellationToken cancellationToken) =>
        (await service.DeleteAsync(id, cancellationToken)).ToHttpResult();
}
