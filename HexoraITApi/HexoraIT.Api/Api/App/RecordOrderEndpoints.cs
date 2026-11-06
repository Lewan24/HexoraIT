using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace HexoraITApi.Api.App;

public static class RecordOrderEndpoints
{
    public static IEndpointRouteBuilder MapRecordOrderEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations/{organizationId:guid}/record-order/{resource}").RequireAuthorization().WithTags("Record order");
        group.MapGet("", async (Guid organizationId, string resource, [AsParameters] PaginationParameters pagination, string? search, Guid? parentId, RecordOrderService service, HttpResponse response, CancellationToken token) =>
            (await service.GetAsync(organizationId, resource, pagination, search, parentId, token)).ToHttpResult(response)).AddEndpointFilter<DataAnnotationsValidationFilter<PaginationParameters>>();
        group.MapPatch("", async (Guid organizationId, string resource, SaveRecordOrderDto request, RecordOrderService service, CancellationToken token) =>
            (await service.SaveAsync(organizationId, resource, request, token)).ToHttpResult()).AddEndpointFilter<DataAnnotationsValidationFilter<SaveRecordOrderDto>>()
            .WithMetadata(new RequestSizeLimitAttribute(100_000));
        return endpoints;
    }
}
