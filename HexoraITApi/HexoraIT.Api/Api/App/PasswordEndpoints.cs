using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class PasswordEndpoints
{
    public static IEndpointRouteBuilder MapPasswordEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/passwords").WithTags("Passwords").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<PasswordListDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}/reveal", RevealAsync).Produces<string>().Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreatePasswordDto>>().Produces<PasswordListDto>().ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdatePasswordDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/{id:guid}/star", ToggleStarAsync).Produces<PasswordStarredDto>().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetAllAsync(Guid? organizationId, [AsParameters] PaginationParameters pagination, IPasswordVaultService service, HttpResponse response, CancellationToken token) => (await service.GetAllAsync(organizationId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> RevealAsync(Guid id, IPasswordVaultService service, CancellationToken token) => (await service.RevealAsync(id, token)).ToHttpResult();
    private static async Task<IResult> CreateAsync(Guid organizationId, CreatePasswordDto dto, IPasswordVaultService service, CancellationToken token) => (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdatePasswordDto dto, IPasswordVaultService service, CancellationToken token) => (await service.UpdateAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, IPasswordVaultService service, CancellationToken token) => (await service.DeleteAsync(id, token)).ToHttpResult();
    private static async Task<IResult> ToggleStarAsync(Guid id, IPasswordVaultService service, CancellationToken token) => (await service.ToggleStarAsync(id, token)).ToHttpResult();
}
