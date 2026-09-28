using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Api.App;

public static class PrivateNoteEndpoints
{
    public static IEndpointRouteBuilder MapPrivateNoteEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations/{organizationId:guid}/private-notes").WithTags("Private Notes").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<PrivateNote>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<SavePrivateNoteDto>>().Produces<PrivateNote>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<SavePrivateNoteDto>>().Produces<PrivateNote>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetAllAsync(Guid organizationId, [AsParameters] PaginationParameters pagination, IPrivateNoteService service, HttpResponse response, CancellationToken token) => (await service.GetAllAsync(organizationId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> CreateAsync(Guid organizationId, SavePrivateNoteDto dto, IPrivateNoteService service, CancellationToken token) => (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid organizationId, Guid id, SavePrivateNoteDto dto, IPrivateNoteService service, CancellationToken token) => (await service.UpdateAsync(organizationId, id, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid organizationId, Guid id, IPrivateNoteService service, CancellationToken token) => (await service.DeleteAsync(organizationId, id, token)).ToHttpResult();
}
