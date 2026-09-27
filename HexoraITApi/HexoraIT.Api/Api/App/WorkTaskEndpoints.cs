using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class WorkTaskEndpoints
{
    public static IEndpointRouteBuilder MapWorkTaskEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/tasks").WithTags("Tasks").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<WorkTaskDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync).Produces<WorkTaskDto>().Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateWorkTaskDto>>().Produces<WorkTaskDto>(StatusCodes.Status201Created).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateWorkTaskDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetAllAsync(Guid? organizationId, Guid? projectId, [AsParameters] PaginationParameters pagination, IWorkTaskService service, HttpResponse response, CancellationToken token) => (await service.GetAllAsync(organizationId, projectId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> GetByIdAsync(Guid id, IWorkTaskService service, CancellationToken token) => (await service.GetByIdAsync(id, token)).ToHttpResult();
    private static async Task<IResult> CreateAsync(Guid organizationId, CreateWorkTaskDto dto, IWorkTaskService service, CancellationToken token) => (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdateWorkTaskDto dto, IWorkTaskService service, CancellationToken token) => (await service.UpdateAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, IWorkTaskService service, CancellationToken token) => (await service.DeleteAsync(id, token)).ToHttpResult();
}
