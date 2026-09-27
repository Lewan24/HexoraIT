using FluentAssertions;
using HexoraITApi.Api.Administrator;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public sealed class AdminControllerTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    [Fact]
    public async Task SecuritySensitiveAccountChanges_RotateSecurityStamp()
    {
        var hasher = new Pbkdf2PasswordHasher();
        var (hash, salt) = hasher.Hash("initial-password");
        var user = new User
        {
            Email = "managed-user@test.local",
            DisplayName = "Managed User",
            PasswordHash = hash,
            PasswordSalt = salt
        };
        _fixture.Db.Users.Add(user);
        await _fixture.Db.SaveChangesAsync();

        var controller = new AdminController(_fixture.Db, hasher);
        var initialStamp = user.SecurityStamp;

        (await controller.SetBlocked(user.Id, true)).Should().BeOfType<NoContentResult>();
        var blockedStamp = user.SecurityStamp;
        blockedStamp.Should().NotBe(initialStamp);

        (await controller.SetRole(user.Id, new UpdateUserRoleDto(nameof(SystemRole.Admin))))
            .Should().BeOfType<NoContentResult>();
        var roleStamp = user.SecurityStamp;
        roleStamp.Should().NotBe(blockedStamp);

        (await controller.ResetPassword(user.Id, new AdminResetPasswordDto("replacement-password")))
            .Should().BeOfType<NoContentResult>();
        user.SecurityStamp.Should().NotBe(roleStamp);
    }

    public void Dispose() => _fixture.Dispose();
}
