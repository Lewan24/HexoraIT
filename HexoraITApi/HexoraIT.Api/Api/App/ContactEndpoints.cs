using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class ContactEndpoints
{
    public static IEndpointRouteBuilder MapContactEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/contacts")
            .WithTags("Contacts")
            .RequireAuthorization();

        group.MapGet("", GetAllAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>()
            .Produces<List<ContactDto>>()
            .Produces(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync)
            .Produces<ContactDto>()
            .Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<CreateContactDto>>()
            .Produces<ContactDto>(StatusCodes.Status201Created)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync)
            .AddEndpointFilter<DataAnnotationsValidationFilter<UpdateContactDto>>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync)
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/{id:guid}/star", ToggleStarAsync)
            .Produces<ContactStarredDto>()
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> GetAllAsync(
        Guid? organizationId,
        [AsParameters] PaginationParameters pagination,
        IContactService service,
        HttpResponse response,
        CancellationToken cancellationToken) =>
        (await service.GetAllAsync(organizationId, pagination, cancellationToken)).ToHttpResult(response);

    private static async Task<IResult> GetByIdAsync(Guid id, IContactService service, CancellationToken cancellationToken) =>
        (await service.GetByIdAsync(id, cancellationToken)).ToHttpResult();

    private static async Task<IResult> CreateAsync(
        Guid organizationId,
        CreateContactDto dto,
        IContactService service,
        CancellationToken cancellationToken) =>
        (await service.CreateAsync(organizationId, dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> UpdateAsync(
        Guid id,
        UpdateContactDto dto,
        IContactService service,
        CancellationToken cancellationToken) =>
        (await service.UpdateAsync(id, dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> DeleteAsync(Guid id, IContactService service, CancellationToken cancellationToken) =>
        (await service.DeleteAsync(id, cancellationToken)).ToHttpResult();

    private static async Task<IResult> ToggleStarAsync(Guid id, IContactService service, CancellationToken cancellationToken) =>
        (await service.ToggleStarAsync(id, cancellationToken)).ToHttpResult();
}
