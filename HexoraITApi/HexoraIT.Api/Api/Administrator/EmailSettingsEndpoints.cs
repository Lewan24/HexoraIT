using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.Administrator;

public static class EmailSettingsEndpoints
{
    public static IEndpointRouteBuilder MapEmailSettingsEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var admin = endpoints.MapGroup("/api/admin/email-settings").WithTags("Email settings").RequireAuthorization("AdminOnly");
        admin.MapGet("", async (IEmailSettingsService service, CancellationToken token) => (await service.GetGlobalAsync(token)).ToHttpResult()).Produces<GlobalEmailSettingsDto>();
        admin.MapPut("", async (UpdateGlobalEmailSettingsDto dto, IEmailSettingsService service, CancellationToken token) => (await service.UpdateGlobalAsync(dto, token)).ToHttpResult())
            .AddEndpointFilter<DataAnnotationsValidationFilter<UpdateGlobalEmailSettingsDto>>().Produces<GlobalEmailSettingsDto>().ProducesValidationProblem();
        admin.MapPost("/test", async (TestEmailDto dto, IEmailSettingsService service, CancellationToken token) => (await service.SendTestAsync(dto, token)).ToHttpResult())
            .RequireRateLimiting("authentication").AddEndpointFilter<DataAnnotationsValidationFilter<TestEmailDto>>().Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status503ServiceUnavailable);

        var organizations = endpoints.MapGroup("/api/organizations/{organizationId:guid}/notification-settings").WithTags("Email settings").RequireAuthorization();
        organizations.MapGet("", async (Guid organizationId, IEmailSettingsService service, CancellationToken token) => (await service.GetOrganizationAsync(organizationId, token)).ToHttpResult())
            .Produces<OrganizationNotificationSettingsDto>().Produces(StatusCodes.Status403Forbidden);
        organizations.MapPut("", async (Guid organizationId, UpdateOrganizationNotificationSettingsDto dto, IEmailSettingsService service, CancellationToken token) => (await service.UpdateOrganizationAsync(organizationId, dto, token)).ToHttpResult())
            .AddEndpointFilter<DataAnnotationsValidationFilter<UpdateOrganizationNotificationSettingsDto>>().Produces(StatusCodes.Status204NoContent).ProducesValidationProblem().Produces(StatusCodes.Status403Forbidden);
        return endpoints;
    }
}
