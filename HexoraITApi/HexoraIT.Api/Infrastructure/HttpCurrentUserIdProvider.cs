namespace HexoraITApi.Infrastructure;

public interface ICurrentUserIdProvider
{
    Guid? UserId { get; }
}

public class HttpCurrentUserIdProvider(IHttpContextAccessor httpContextAccessor) : ICurrentUserIdProvider
{
    public Guid? UserId
    {
        get
        {
            var claim = httpContextAccessor.HttpContext?.User
                .FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}