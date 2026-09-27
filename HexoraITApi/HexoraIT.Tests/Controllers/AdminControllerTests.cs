using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

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

        var service = new AdminUserService(_fixture.Db, hasher,
            new SecurityAuditLogger(NullLoggerFactory.Instance, new HttpContextAccessor()), _fixture.IdProvider);
        var initialStamp = user.SecurityStamp;

        (await service.SetBlockedAsync(user.Id, true)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        var blockedStamp = user.SecurityStamp;
        blockedStamp.Should().NotBe(initialStamp);

        (await service.SetRoleAsync(user.Id, new UpdateUserRoleDto(nameof(SystemRole.Admin))))
            .StatusCode.Should().Be(StatusCodes.Status204NoContent);
        var roleStamp = user.SecurityStamp;
        roleStamp.Should().NotBe(blockedStamp);

        (await service.ResetPasswordAsync(user.Id, new AdminResetPasswordDto("replacement-password")))
            .StatusCode.Should().Be(StatusCodes.Status204NoContent);
        user.SecurityStamp.Should().NotBe(roleStamp);
    }

    [Fact]
    public async Task LastAdministrator_CannotBeBlockedOrDemoted()
    {
        var admin = new User { Email = "last-admin@test.local", DisplayName = "Admin", PasswordHash = [1], PasswordSalt = [1], SystemRole = SystemRole.Admin };
        _fixture.Db.Users.Add(admin);
        await _fixture.Db.SaveChangesAsync();
        var service = Service(new Pbkdf2PasswordHasher());

        (await service.SetBlockedAsync(admin.Id, true)).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await service.SetRoleAsync(admin.Id, new(nameof(SystemRole.User)))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        admin.IsBlocked.Should().BeFalse();
        admin.SystemRole.Should().Be(SystemRole.Admin);
    }

    [Fact]
    public async Task CreateUser_RejectsShortPasswordClientRoleAndDuplicateEmail()
    {
        var service = Service(new Pbkdf2PasswordHasher());
        (await service.CreateUserAsync(new("user@test.local", "User", "too-short", nameof(SystemRole.User)))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await service.CreateUserAsync(new("client@test.local", "Client", "valid-password-123", nameof(SystemRole.Client)))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await service.CreateUserAsync(new("user@test.local", "User", "valid-password-123", nameof(SystemRole.User)))).StatusCode.Should().Be(StatusCodes.Status200OK);
        (await service.CreateUserAsync(new("USER@test.local", "Other", "valid-password-123", nameof(SystemRole.User)))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    private AdminUserService Service(IPasswordHasher hasher) => new(
        _fixture.Db, hasher,
        new SecurityAuditLogger(NullLoggerFactory.Instance, new HttpContextAccessor()), _fixture.IdProvider);

    public void Dispose() => _fixture.Dispose();
}
