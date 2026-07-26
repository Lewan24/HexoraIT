using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HexoraITApi.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace HexoraITApi.Application;

public class JwtTokenService(IConfiguration config) : IJwtTokenService
{
    public string CreateToken(Guid userId, string email, SystemRole systemRole)
    {
        var jwt = config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["SigningKey"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("sys_role", systemRole.ToString()),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        var token = new JwtSecurityToken(jwt["Issuer"], jwt["Audience"], claims,
            expires: DateTime.UtcNow.AddHours(8), signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}