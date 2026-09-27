using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class OrganizationRoleEndpoints
{
    public static IEndpointRouteBuilder MapOrganizationRoleEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations/{organizationId:guid}").WithTags("Organization roles").RequireAuthorization();
        group.MapGet("/permissions", GetAccessAsync).Produces<OrganizationAccessDto>().Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/roles", GetRolesAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<OrganizationRoleDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPost("/roles", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<SaveOrganizationRoleDto>>().Produces<OrganizationRoleDto>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/roles/{roleId:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<SaveOrganizationRoleDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/roles/{roleId:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound).Produces(StatusCodes.Status409Conflict);
        group.MapPut("/members/{userId:guid}/role", AssignAsync).AddEndpointFilter<DataAnnotationsValidationFilter<AssignOrganizationRoleDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapGet("/role-resources/{resource}", GetResourcesAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<ResourceOptionDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPost("/clients", CreateClientAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateClientDto>>().Produces<ClientSummaryDto>().ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status409Conflict);
        group.MapGet("/clients", GetClientsAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<ClientSummaryDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/clients/{clientId:guid}/permissions", GetClientPermissionsAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<PermissionDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPut("/clients/{clientId:guid}/permissions", SaveClientPermissionsAsync).AddEndpointFilter<DataAnnotationsValidationFilter<SaveOrganizationRoleDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPost("/roles/{roleId:guid}/copy", CopyAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CopyRoleDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound).Produces(StatusCodes.Status409Conflict);
        return endpoints;
    }

    private static async Task<IResult> GetAccessAsync(Guid organizationId, IOrganizationRoleService service, CancellationToken token) => (await service.GetAccessAsync(organizationId, token)).ToHttpResult();
    private static async Task<IResult> GetRolesAsync(Guid organizationId, [AsParameters] PaginationParameters pagination, IOrganizationRoleService service, HttpResponse response, CancellationToken token) => (await service.GetRolesAsync(organizationId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> CreateAsync(Guid organizationId, SaveOrganizationRoleDto dto, IOrganizationRoleService service, CancellationToken token) => (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid organizationId, Guid roleId, SaveOrganizationRoleDto dto, IOrganizationRoleService service, CancellationToken token) => (await service.UpdateAsync(organizationId, roleId, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid organizationId, Guid roleId, IOrganizationRoleService service, CancellationToken token) => (await service.DeleteAsync(organizationId, roleId, token)).ToHttpResult();
    private static async Task<IResult> AssignAsync(Guid organizationId, Guid userId, AssignOrganizationRoleDto dto, IOrganizationRoleService service, CancellationToken token) => (await service.AssignAsync(organizationId, userId, dto, token)).ToHttpResult();
    private static async Task<IResult> GetResourcesAsync(Guid organizationId, string resource, [AsParameters] PaginationParameters pagination, IOrganizationRoleService service, HttpResponse response, CancellationToken token) => (await service.GetResourcesAsync(organizationId, resource, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> CreateClientAsync(Guid organizationId, CreateClientDto dto, IOrganizationRoleService service, CancellationToken token) => (await service.CreateClientAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> GetClientsAsync(Guid organizationId, [AsParameters] PaginationParameters pagination, IOrganizationRoleService service, HttpResponse response, CancellationToken token) => (await service.GetClientsAsync(organizationId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> GetClientPermissionsAsync(Guid organizationId, Guid clientId, [AsParameters] PaginationParameters pagination, IOrganizationRoleService service, HttpResponse response, CancellationToken token) => (await service.GetClientPermissionsAsync(organizationId, clientId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> SaveClientPermissionsAsync(Guid organizationId, Guid clientId, SaveOrganizationRoleDto dto, IOrganizationRoleService service, CancellationToken token) => (await service.SaveClientPermissionsAsync(organizationId, clientId, dto, token)).ToHttpResult();
    private static async Task<IResult> CopyAsync(Guid organizationId, Guid roleId, CopyRoleDto dto, IOrganizationRoleService service, CancellationToken token) => (await service.CopyAsync(organizationId, roleId, dto, token)).ToHttpResult();
}
