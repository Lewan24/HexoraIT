using HexoraITApi.Infrastructure;

namespace HexoraITApi.Application;

public class HttpCurrentOrgAccessor(IHttpContextAccessor httpContextAccessor) : ICurrentOrgAccessor
{
    public Guid? OrganizationId
    {
        get
        {
            var claim = httpContextAccessor.HttpContext?.User.FindFirst("org_id")?.Value;
            return Guid.TryParse(claim, out var id) ? id : null;
        }
    }
}