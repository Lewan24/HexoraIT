using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class ClientReportEndpoints
{
    public static IEndpointRouteBuilder MapClientReportEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapPost("/api/organizations/{organizationId:guid}/reports", CreateAsync)
            .WithTags("Client Reports").RequireAuthorization()
            .AddEndpointFilter<DataAnnotationsValidationFilter<CreateClientReportDto>>()
            .Produces<ClientReportResultDto>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        return endpoints;
    }
    private static async Task<IResult> CreateAsync(Guid organizationId, CreateClientReportDto dto, IClientReportService service, CancellationToken token) =>
        (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
}
