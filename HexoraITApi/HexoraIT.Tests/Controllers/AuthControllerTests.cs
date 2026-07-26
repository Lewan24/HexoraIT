using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using HexoraITApi.Api.Auth;
using HexoraITApi.Application;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;

namespace HexoraIT.Tests.Controllers;

public class AuthControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private AuthController Controller(Guid? userId = null, bool allowRegister = true)
    {
        var controller = new AuthController(
            _fx.Db,
            new Pbkdf2PasswordHasher(),
            new FakeJwtTokenService(),
            Options.Create(new AppSettings
            {
                AllowRegister = allowRegister
            }));

        if (userId.HasValue)
        {
            controller.ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(
                        new ClaimsIdentity(
                        [
                            new Claim(
                                JwtRegisteredClaimNames.Sub,
                                userId.Value.ToString())
                        ],
                        "test"))
                }
            };
        }

        return controller;
    }


    [Fact]
    public async Task Register_CreatesUserAndDefaultOrganization()
    {
        var sut = Controller();

        var result = await sut.Register(
            new RegisterDto(
                "User@Test.Local",
                "password123",
                "John"));

        result.Result.Should().BeOfType<OkObjectResult>();

        var response = result.Result
            .As<OkObjectResult>()
            .Value
            .As<AuthResponseDto>();

        response.User.Email
            .Should()
            .Be("user@test.local");

        response.Organizations
            .Should()
            .ContainSingle();

        var user = _fx.Db.Users.Single();

        user.Email.Should().Be("user@test.local");

        _fx.Db.UserOrganizations
            .Should()
            .ContainSingle(x => x.UserId == user.Id);
    }


    [Fact]
    public async Task Register_WhenDisabled_ReturnsForbid()
    {
        var sut = Controller(null, false);

        var result = await sut.Register(
            new RegisterDto(
                "test@test.local",
                "password123",
                "Test"));

        result.Result.Should()
            .BeOfType<ForbidResult>();
    }


    [Fact]
    public async Task Register_WithEmptyEmail_ReturnsBadRequest()
    {
        var sut = Controller();

        var result = await sut.Register(
            new RegisterDto(
                "",
                "password123",
                "Test"));

        result.Result.Should()
            .BeOfType<BadRequestObjectResult>();
    }


    [Fact]
    public async Task Register_WithShortPassword_ReturnsBadRequest()
    {
        var sut = Controller();

        var result = await sut.Register(
            new RegisterDto(
                "test@test.local",
                "123",
                "Test"));

        result.Result.Should()
            .BeOfType<BadRequestObjectResult>();
    }


    [Fact]
    public async Task Register_WithExistingEmail_ReturnsConflict()
    {
        var user = new User
        {
            Email = "existing@test.local",
            DisplayName = "Existing",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(user);
        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        var result = await sut.Register(
            new RegisterDto(
                "EXISTING@test.local",
                "password123",
                "New"));

        result.Result.Should()
            .BeOfType<ConflictObjectResult>();
    }


    [Fact]
    public async Task Login_WithCorrectPassword_ReturnsToken()
    {
        var hasher = new Pbkdf2PasswordHasher();

        var (hash, salt) = hasher.Hash("password123");

        var user = new User
        {
            Email = "login@test.local",
            DisplayName = "Login",
            PasswordHash = hash,
            PasswordSalt = salt
        };

        _fx.Db.Users.Add(user);
        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        var result = await sut.Login(
            new LoginDto(
                "LOGIN@test.local",
                "password123",
                null));

        result.Result.Should()
            .BeOfType<OkObjectResult>();

        result.Result
            .As<OkObjectResult>()
            .Value
            .As<AuthResponseDto>()
            .Token.Should()
            .NotBeNullOrWhiteSpace();
    }


    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
    {
        var hasher = new Pbkdf2PasswordHasher();

        var (hash, salt) = hasher.Hash("password123");

        _fx.Db.Users.Add(new User
        {
            Email = "login@test.local",
            DisplayName = "Login",
            PasswordHash = hash,
            PasswordSalt = salt
        });

        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        var result = await sut.Login(
            new LoginDto(
                "login@test.local",
                "wrong",
                null));

        result.Result.Should()
            .BeOfType<UnauthorizedObjectResult>();
    }


    [Fact]
    public async Task Login_BlockedUser_ReturnsUnauthorized()
    {
        var hasher = new Pbkdf2PasswordHasher();

        var (hash, salt) = hasher.Hash("password123");

        _fx.Db.Users.Add(new User
        {
            Email = "blocked@test.local",
            DisplayName = "Blocked",
            PasswordHash = hash,
            PasswordSalt = salt,
            IsBlocked = true
        });

        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        var result = await sut.Login(
            new LoginDto(
                "blocked@test.local",
                "password123",
                null));

        result.Result.Should()
            .BeOfType<UnauthorizedObjectResult>();
    }


    [Fact]
    public async Task Me_ReturnsCurrentUser()
    {
        var (user, _) = _fx.SeedUserWithOrg();

        var sut = Controller(user.Id);

        var result = await sut.Me();

        result.Result.Should()
            .BeOfType<OkObjectResult>();

        var dto = result.Result
            .As<OkObjectResult>()
            .Value
            .As<UserDto>();

        dto.Email.Should()
            .Be(user.Email);
    }


    [Fact]
    public async Task UpdateProfile_ChangesDisplayName()
    {
        var (user, _) = _fx.SeedUserWithOrg();

        var sut = Controller(user.Id);

        var result = await sut.UpdateProfile(
            new UpdateProfileDto("New Name"));

        result.Should()
            .BeOfType<NoContentResult>();

        var updated = await _fx.Db.Users.FindAsync(user.Id);

        updated!.DisplayName
            .Should()
            .Be("New Name");
    }


    [Fact]
    public async Task UpdateProfile_WithEmptyName_ReturnsBadRequest()
    {
        var (user, _) = _fx.SeedUserWithOrg();

        var sut = Controller(user.Id);

        var result = await sut.UpdateProfile(
            new UpdateProfileDto(" "));

        result.Should()
            .BeOfType<BadRequestObjectResult>();
    }


    [Fact]
    public async Task ChangePassword_WithCorrectPassword_UpdatesPassword()
    {
        var hasher = new Pbkdf2PasswordHasher();

        var (hash, salt) = hasher.Hash("oldpassword");

        var user = new User
        {
            Email = "change@test.local",
            DisplayName = "Change",
            PasswordHash = hash,
            PasswordSalt = salt
        };

        _fx.Db.Users.Add(user);
        await _fx.Db.SaveChangesAsync();

        var sut = Controller(user.Id);

        var result = await sut.ChangePassword(
            new ChangePasswordDto(
                "oldpassword",
                "newpassword"));

        result.Should()
            .BeOfType<NoContentResult>();

        var updated = await _fx.Db.Users.FindAsync(user.Id);

        hasher.Verify(
                "newpassword",
                updated!.PasswordHash,
                updated.PasswordSalt)
            .Should()
            .BeTrue();
    }


    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_ReturnsBadRequest()
    {
        var (user, _) = _fx.SeedUserWithOrg();

        var sut = Controller(user.Id);

        var result = await sut.ChangePassword(
            new ChangePasswordDto(
                "wrong",
                "newpassword"));

        result.Should()
            .BeOfType<BadRequestObjectResult>();
    }


    public void Dispose()
        => _fx.Dispose();


    private sealed class FakeJwtTokenService : IJwtTokenService
    {
        public string CreateToken(
            Guid userId,
            string email,
            SystemRole systemRole)
            => "fake-token";
    }
}