using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class DashboardLayoutEndpoints
{
    public static IEndpointRouteBuilder MapDashboardLayoutEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/dashboard-layout").WithTags("Dashboard Layout").RequireAuthorization();
        group.MapGet("", GetAsync).Produces<DashboardLayoutDto>().Produces(StatusCodes.Status403Forbidden);
        group.MapPut("", SaveAsync).AddEndpointFilter<DataAnnotationsValidationFilter<DashboardLayoutDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden);
        group.MapDelete("", ResetAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden);
        return endpoints;
    }
    private static async Task<IResult> GetAsync(Guid organizationId, IDashboardLayoutService service, CancellationToken token) => (await service.GetAsync(organizationId, token)).ToHttpResult();
    private static async Task<IResult> SaveAsync(Guid organizationId, DashboardLayoutDto dto, IDashboardLayoutService service, CancellationToken token) => (await service.SaveAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> ResetAsync(Guid organizationId, IDashboardLayoutService service, CancellationToken token) => (await service.ResetAsync(organizationId, token)).ToHttpResult();
}
