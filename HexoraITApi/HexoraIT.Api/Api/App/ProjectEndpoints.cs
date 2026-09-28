using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class ProjectEndpoints
{
    public static IEndpointRouteBuilder MapProjectEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/projects").WithTags("Projects").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<ProjectDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync).Produces<ProjectDto>().Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateProjectDto>>().Produces<ProjectDto>(StatusCodes.Status201Created).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateProjectDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetAllAsync(Guid? organizationId, [AsParameters] PaginationParameters pagination, IProjectService service, HttpResponse response, CancellationToken token) => (await service.GetAllAsync(organizationId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> GetByIdAsync(Guid id, IProjectService service, CancellationToken token) => (await service.GetByIdAsync(id, token)).ToHttpResult();
    private static async Task<IResult> CreateAsync(Guid organizationId, CreateProjectDto dto, IProjectService service, CancellationToken token) => (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdateProjectDto dto, IProjectService service, CancellationToken token) => (await service.UpdateAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, IProjectService service, CancellationToken token) => (await service.DeleteAsync(id, token)).ToHttpResult();
}
