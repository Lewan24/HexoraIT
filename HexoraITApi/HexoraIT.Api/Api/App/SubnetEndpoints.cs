using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.App;

public static class SubnetEndpoints
{
    public static IEndpointRouteBuilder MapSubnetEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/subnets").WithTags("Subnets").RequireAuthorization();
        group.MapGet("", GetAllAsync).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>().Produces<List<SubnetDto>>().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden);
        group.MapGet("/{id:guid}", GetByIdAsync).Produces<SubnetDto>().Produces(StatusCodes.Status404NotFound);
        group.MapPost("", CreateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateSubnetDto>>().Produces<SubnetDto>(StatusCodes.Status201Created).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden);
        group.MapPut("/{id:guid}", UpdateAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateSubnetDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{id:guid}", DeleteAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPost("/{subnetId:guid}/ips", AddIpAsync).AddEndpointFilter<DataAnnotationsValidationFilter<CreateIPEntryDto>>().Produces<IPEntryDto>().ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapPut("/{subnetId:guid}/ips/{entryId:guid}", UpdateIpAsync).AddEndpointFilter<DataAnnotationsValidationFilter<UpdateIPEntryDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status400BadRequest).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        group.MapDelete("/{subnetId:guid}/ips/{entryId:guid}", DeleteIpAsync).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status403Forbidden).Produces(StatusCodes.Status404NotFound);
        return endpoints;
    }
    private static async Task<IResult> GetAllAsync(Guid? organizationId, [AsParameters] PaginationParameters pagination, ISubnetService service, HttpResponse response, CancellationToken token) => (await service.GetAllAsync(organizationId, pagination, token)).ToHttpResult(response);
    private static async Task<IResult> GetByIdAsync(Guid id, ISubnetService service, CancellationToken token) => (await service.GetByIdAsync(id, token)).ToHttpResult();
    private static async Task<IResult> CreateAsync(Guid organizationId, CreateSubnetDto dto, ISubnetService service, CancellationToken token) => (await service.CreateAsync(organizationId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateAsync(Guid id, UpdateSubnetDto dto, ISubnetService service, CancellationToken token) => (await service.UpdateAsync(id, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteAsync(Guid id, ISubnetService service, CancellationToken token) => (await service.DeleteAsync(id, token)).ToHttpResult();
    private static async Task<IResult> AddIpAsync(Guid subnetId, CreateIPEntryDto dto, ISubnetService service, CancellationToken token) => (await service.AddIpAsync(subnetId, dto, token)).ToHttpResult();
    private static async Task<IResult> UpdateIpAsync(Guid subnetId, Guid entryId, UpdateIPEntryDto dto, ISubnetService service, CancellationToken token) => (await service.UpdateIpAsync(subnetId, entryId, dto, token)).ToHttpResult();
    private static async Task<IResult> DeleteIpAsync(Guid subnetId, Guid entryId, ISubnetService service, CancellationToken token) => (await service.DeleteIpAsync(subnetId, entryId, token)).ToHttpResult();
}
