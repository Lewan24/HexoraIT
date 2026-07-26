using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Application;

public interface IJwtTokenService
{
    string CreateToken(Guid userId, string email, SystemRole systemRole);
}