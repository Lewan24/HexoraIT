using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using Microsoft.Extensions.Configuration;

namespace HexoraIT.Tests.Controllers;

public class JwtTokenServiceTests
{
    private readonly JwtTokenService _sut;

    public JwtTokenServiceTests()
    {
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwt:Issuer"] = "test-issuer",
            ["Jwt:Audience"] = "test-audience",
            ["Jwt:SigningKey"] = "this-is-a-32-byte-minimum-test-signing-key!!",
        }).Build();
        _sut = new JwtTokenService(config);
    }

    [Fact]
    public void CreateToken_EmbedsSystemRoleClaim()
    {
        var userId = Guid.NewGuid();
        var token = _sut.CreateToken(userId, "user@test.local", SystemRole.Admin);

        var parsed = new JwtSecurityTokenHandler().ReadJwtToken(token);
        parsed.Claims.Should().Contain(c => c.Type == "sys_role" && c.Value == "Admin");
        parsed.Claims.Should().Contain(c => c.Type == JwtRegisteredClaimNames.Sub && c.Value == userId.ToString());
    }

    [Fact]
    public void CreateToken_DifferentCalls_ProduceDifferentJtiClaims()
    {
        var userId = Guid.NewGuid();
        var token1 = _sut.CreateToken(userId, "u@test.local", SystemRole.User);
        var token2 = _sut.CreateToken(userId, "u@test.local", SystemRole.User);
        token1.Should().NotBe(token2);
    }
}