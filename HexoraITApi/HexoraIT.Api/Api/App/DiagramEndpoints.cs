using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace HexoraITApi.Api.App;

public static class DiagramEndpoints
{
    public static IEndpointRouteBuilder MapDiagramEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/diagram").WithTags("Diagram").RequireAuthorization();
        group.MapGet("", GetAsync).Produces<DiagramDto>().Produces(StatusCodes.Status403Forbidden);
        group.MapPut("", SaveAsync).AddEndpointFilter<DataAnnotationsValidationFilter<SaveDiagramDto>>()
            .WithMetadata(new RequestSizeLimitAttribute(4_000_000))
            .Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        return endpoints;
    }
    private static async Task<IResult> GetAsync(Guid organizationId, IDiagramService service, CancellationToken token) => (await service.GetAsync(organizationId, token)).ToHttpResult();
    private static async Task<IResult> SaveAsync(Guid organizationId, SaveDiagramDto dto, IDiagramService service, CancellationToken token) => (await service.SaveAsync(organizationId, dto, token)).ToHttpResult();
}
