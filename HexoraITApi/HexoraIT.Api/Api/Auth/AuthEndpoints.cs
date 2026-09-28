using System.Security.Claims;
using HexoraITApi.Api;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;

namespace HexoraITApi.Api.Auth;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth").WithTags("Auth");

        group.MapPost("/register", RegisterAsync)
            .RequireRateLimiting("authentication")
            .AddEndpointFilter<DataAnnotationsValidationFilter<RegisterDto>>()
            .Produces(StatusCodes.Status202Accepted)
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status409Conflict)
            .Produces(StatusCodes.Status503ServiceUnavailable);

        group.MapPost("/confirm-email", ConfirmEmailAsync)
            .RequireRateLimiting("authentication")
            .AddEndpointFilter<DataAnnotationsValidationFilter<ConfirmEmailDto>>()
            .Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/forgot-password", ForgotPasswordAsync)
            .RequireRateLimiting("authentication")
            .AddEndpointFilter<DataAnnotationsValidationFilter<EmailAddressDto>>()
            .Produces(StatusCodes.Status202Accepted);

        group.MapPost("/reset-password", ResetPasswordAsync)
            .RequireRateLimiting("authentication")
            .AddEndpointFilter<DataAnnotationsValidationFilter<ResetPasswordWithTokenDto>>()
            .Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest);

        group.MapPost("/login", LoginAsync)
            .RequireRateLimiting("authentication")
            .AddEndpointFilter<DataAnnotationsValidationFilter<LoginDto>>()
            .Produces<AuthResponseDto>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status401Unauthorized);

        group.MapPost("/switch-org", SwitchOrganizationAsync)
            .RequireAuthorization()
            .AddEndpointFilter<DataAnnotationsValidationFilter<SwitchOrgDto>>()
            .Produces<AuthResponseDto>()
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden);

        group.MapGet("/me", GetCurrentUserAsync)
            .RequireAuthorization()
            .Produces<UserDto>()
            .Produces(StatusCodes.Status404NotFound);

        group.MapPut("/me", UpdateProfileAsync)
            .RequireAuthorization()
            .AddEndpointFilter<DataAnnotationsValidationFilter<UpdateProfileDto>>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);

        group.MapPost("/change-password", ChangePasswordAsync)
            .RequireAuthorization()
            .AddEndpointFilter<DataAnnotationsValidationFilter<ChangePasswordDto>>()
            .ProducesValidationProblem()
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status404NotFound);

        return endpoints;
    }

    private static async Task<IResult> RegisterAsync(
        RegisterDto dto,
        IAuthService authService,
        CancellationToken cancellationToken) =>
        (await authService.RegisterAsync(dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> LoginAsync(
        LoginDto dto,
        IAuthService authService,
        CancellationToken cancellationToken) =>
        (await authService.LoginAsync(dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> ConfirmEmailAsync(ConfirmEmailDto dto, IAuthService authService, CancellationToken cancellationToken) =>
        (await authService.ConfirmEmailAsync(dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> ForgotPasswordAsync(EmailAddressDto dto, IAuthService authService, CancellationToken cancellationToken) =>
        (await authService.RequestPasswordResetAsync(dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> ResetPasswordAsync(ResetPasswordWithTokenDto dto, IAuthService authService, CancellationToken cancellationToken) =>
        (await authService.ResetPasswordAsync(dto, cancellationToken)).ToHttpResult();

    private static async Task<IResult> SwitchOrganizationAsync(
        SwitchOrgDto dto,
        ClaimsPrincipal principal,
        IAuthService authService,
        CancellationToken cancellationToken) =>
        TryGetUserId(principal, out var userId)
            ? (await authService.SwitchOrganizationAsync(userId, dto, cancellationToken)).ToHttpResult()
            : TypedResults.Unauthorized();

    private static async Task<IResult> GetCurrentUserAsync(
        ClaimsPrincipal principal,
        IAuthService authService,
        CancellationToken cancellationToken) =>
        TryGetUserId(principal, out var userId)
            ? (await authService.GetCurrentUserAsync(userId, cancellationToken)).ToHttpResult()
            : TypedResults.Unauthorized();

    private static async Task<IResult> UpdateProfileAsync(
        UpdateProfileDto dto,
        ClaimsPrincipal principal,
        IAuthService authService,
        CancellationToken cancellationToken) =>
        TryGetUserId(principal, out var userId)
            ? (await authService.UpdateProfileAsync(userId, dto, cancellationToken)).ToHttpResult()
            : TypedResults.Unauthorized();

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordDto dto,
        ClaimsPrincipal principal,
        IAuthService authService,
        CancellationToken cancellationToken) =>
        TryGetUserId(principal, out var userId)
            ? (await authService.ChangePasswordAsync(userId, dto, cancellationToken)).ToHttpResult()
            : TypedResults.Unauthorized();

    private static bool TryGetUserId(ClaimsPrincipal principal, out Guid userId) =>
        Guid.TryParse(
            principal.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value,
            out userId);

}
