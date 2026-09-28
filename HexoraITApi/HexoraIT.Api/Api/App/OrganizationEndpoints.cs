using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class OrganizationEndpoints
{
    public static IEndpointRouteBuilder MapOrganizationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations").WithTags("Organizations").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<OrganizationSummaryDto>>().Produces(StatusCodes.Status400BadRequest);
        group.MapGet("/deleted", GetDeletedAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<OrganizationSummaryDto>>().Produces(StatusCodes.Status400BadRequest);
        group.MapGet("/{id:guid}", GetByIdAsync).Produces<OrganizationDto>().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateOrganizationDto>>().Produces<OrganizationDto>(StatusCodes.Status201Created).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateOrganizationDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapGet("/{id:guid}/members", GetMembersAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<OrgMemberDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapPost("/{id:guid}/members", InviteMemberAsync).AddEndpointFilter<DataAnnotationsValidationFilter<InviteMemberDto>>().Produces<OrgMemberDto>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound).Produces(StatusCodes.Status409Conflict);
        group.MapDelete("/{id:guid}/members/{userId:guid}", RemoveMemberAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPost("/{id:guid}/restore", RestoreAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetAllAsync([AsParameters] PaginationParameters pagination, IOrganizationService service, HttpResponse response, CancellationToken token) => (await service.GetAllAsync(pagination, token)).ToHttpResult(response);
    private static async Task<IResult> GetDeletedAsync([AsParameters] PaginationParameters pagination, IOrganizationService service, HttpResponse response, CancellationToken token) => (await service.GetDeletedAsync(pagination, token)).ToHttpResult(response);
    private static async Task<IResult> GetByIdAsync(Guid id, IOrganizationService service, CancellationToken token) => (await service.GetByIdAsync(id, token)).ToHttpResult();
    private static async Task<IResult> CreateAsync(CreateOrganizationDto dto, IOrganizationService service, CancellationToken token) => (await service.CreateAsync(dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdateOrganizationDto dto, IOrganizationService service, CancellationToken token) => (await service.UpdateAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> GetMembersAsync(Guid id, [AsParameters] PaginationParameters pagination, IOrganizationService service, HttpResponse response, CancellationToken token) => (await service.GetMembersAsync(id, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> InviteMemberAsync(Guid id, InviteMemberDto dto, IOrganizationService service, CancellationToken token) => (await service.InviteMemberAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> RemoveMemberAsync(Guid id, Guid userId, IOrganizationService service, CancellationToken token) => (await service.RemoveMemberAsync(id, userId, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, IOrganizationService service, CancellationToken token) => (await service.DeleteAsync(id, token)).ToHttpResult();
    private static async Task<IResult> RestoreAsync(Guid id, IOrganizationService service, CancellationToken token) => (await service.RestoreAsync(id, token)).ToHttpResult();
}
