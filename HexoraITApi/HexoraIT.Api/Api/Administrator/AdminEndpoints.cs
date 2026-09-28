using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.Administrator;

public static class AdminEndpoints
{
    public static IEndpointRouteBuilder MapAdminEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/admin").WithTags("Admin").RequireAuthorization("AdminOnly");
        group.MapGet("/users", GetUsersAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<AdminUserDto>>().Produces(StatusCodes.Status400BadRequest);
        group.MapPost("/users", CreateUserAsync).AddEndpointFilter<DataAnnotationsValidationFilter<AdminCreateUserDto>>().Produces<AdminUserDto>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest);
        group.MapPatch("/users/{id:guid}/block", SetBlockedAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status404NotFound);
        group.MapPatch("/users/{id:guid}/role", SetRoleAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateUserRoleDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status404NotFound);
        group.MapPost("/users/{id:guid}/reset-password", ResetPasswordAsync).AddEndpointFilter<DataAnnotationsValidationFilter<AdminResetPasswordDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetUsersAsync([AsParameters] PaginationParameters pagination, IAdminUserService service, HttpResponse response, CancellationToken token) => (await service.GetUsersAsync(pagination, token)).ToHttpResult(response);
    private static async Task<IResult> CreateUserAsync(AdminCreateUserDto dto, IAdminUserService service, CancellationToken token) => (await service.CreateUserAsync(dto, token)).ToHttpResult();
    private static async Task<IResult> SetBlockedAsync(Guid id, bool blocked, IAdminUserService service, CancellationToken token) => (await service.SetBlockedAsync(id, blocked, token)).ToHttpResult();
    private static async Task<IResult> SetRoleAsync(Guid id, UpdateUserRoleDto dto, IAdminUserService service, CancellationToken token) => (await service.SetRoleAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> ResetPasswordAsync(Guid id, AdminResetPasswordDto dto, IAdminUserService service, CancellationToken token) => (await service.ResetPasswordAsync(id, dto, token)).ToHttpResult();
}
