using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class GroupEndpoints
{
    public static IEndpointRouteBuilder MapGroupEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/groups")
            .WithTags("Groups")
            .RequireAuthorization();

        group.MapGet("", GetAllAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>()
            .Produces<List<GroupDto>>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync)
            .Produces<GroupDto>()
            .Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<CreateGroupDto>>()
            .Produces<GroupDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<UpdateGroupDto>>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetAllAsync(
        Guid? organizationId,
        [AsParameters] PaginationParameters pagination,
        IGroupService service,
        HttpResponse response,
        CancellationToken cancellationToken) =>
        (await service.GetAllAsync(organizationId, pagination, cancellationToken)).ToHttpResult(response);

    private static async Task<IResult> GetByIdAsync(Guid id, IGroupService service, CancellationToken cancellationToken) =>
        (await service.GetByIdAsync(id, cancellationToken)).ToHttpResult();

    private static async Task<IResult> CreateAsync(
        Guid organizationId,
        CreateGroupDto dto,
        IGroupService service,
        CancellationToken cancellationToken) =>
        (await service.CreateAsync(organizationId, dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> UpdateAsync(
        Guid id,
        UpdateGroupDto dto,
        IGroupService service,
        CancellationToken cancellationToken) =>
        (await service.UpdateAsync(id, dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> DeleteAsync(Guid id, IGroupService service, CancellationToken cancellationToken) =>
        (await service.DeleteAsync(id, cancellationToken)).ToHttpResult();
}
