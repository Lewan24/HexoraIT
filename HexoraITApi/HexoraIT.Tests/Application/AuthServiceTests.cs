using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class AuthServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();
    private readonly FakeEmailSender _email = new();

    private AuthService Service(bool allowRegister = true) => new(
        _fixture.Db,
        new Pbkdf2PasswordHasher(),
        new FakeJwtTokenService(),
        Options.Create(new AppSettings { AllowRegister = allowRegister, PublicUrl = "https://app.test" }),
        _email);

    [Fact]
    public async Task Register_CreatesUnconfirmedUserAndSendsConfirmationEmail()
    {
        var result = await Service().RegisterAsync(
            new RegisterDto("User@Test.Local", "password123456789", "John"));

        result.StatusCode.Should().Be(StatusCodes.Status202Accepted);
        var user = _fixture.Db.Users.Single();
        user.Email.Should().Be("user@test.local");
        user.EmailConfirmed.Should().BeFalse();
        _fixture.Db.AccountActionTokens.Should().ContainSingle(token => token.UserId == user.Id && token.Purpose == "confirm_email");
        _email.Messages.Should().ContainSingle(message => message.Recipient == user.Email && message.Subject.Contains("Confirm"));
    }

    [Fact]
    public async Task Register_WhenDisabled_ReturnsForbidden()
    {
        var result = await Service(allowRegister: false).RegisterAsync(
            new RegisterDto("test@test.local", "password123456789", "Test"));

        result.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task Register_WithEmptyEmail_ReturnsBadRequest()
    {
        var result = await Service().RegisterAsync(
            new RegisterDto("", "password123456789", "Test"));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task Register_WithShortPassword_ReturnsBadRequest()
    {
        var result = await Service().RegisterAsync(
            new RegisterDto("test@test.local", "123", "Test"));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task Register_WithExistingEmail_ReturnsConflict()
    {
        _fixture.Db.Users.Add(new User
        {
            Email = "existing@test.local",
            DisplayName = "Existing",
            PasswordHash = [1],
            PasswordSalt = [1]
        });
        await _fixture.Db.SaveChangesAsync();

        var result = await Service().RegisterAsync(
            new RegisterDto("EXISTING@test.local", "password123456789", "New"));

        result.StatusCode.Should().Be(StatusCodes.Status409Conflict);
    }

    [Fact]
    public async Task Login_WithCorrectPassword_ReturnsToken()
    {
        var hasher = new Pbkdf2PasswordHasher();
        var (hash, salt) = hasher.Hash("password123");
        _fixture.Db.Users.Add(new User
        {
            Email = "login@test.local",
            DisplayName = "Login",
            PasswordHash = hash,
            PasswordSalt = salt
        });
        await _fixture.Db.SaveChangesAsync();

        var result = await Service().LoginAsync(new LoginDto("LOGIN@test.local", "password123", null));

        result.StatusCode.Should().Be(StatusCodes.Status200OK);
        result.Value.Should().BeOfType<AuthResponseDto>().Subject.Token.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task Login_WithInvalidPassword_ReturnsUnauthorized()
    {
        var hasher = new Pbkdf2PasswordHasher();
        var (hash, salt) = hasher.Hash("password123");
        _fixture.Db.Users.Add(new User
        {
            Email = "login@test.local",
            DisplayName = "Login",
            PasswordHash = hash,
            PasswordSalt = salt
        });
        await _fixture.Db.SaveChangesAsync();

        var result = await Service().LoginAsync(new LoginDto("login@test.local", "wrong", null));

        result.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task ConfirmEmail_ConsumesTokenAndEnablesLogin()
    {
        await Service().RegisterAsync(new RegisterDto("confirm@test.local", "password123456789", "Confirm"));
        var rawToken = _email.Messages.Single().Body.Split("token=")[1].Split('\n')[0];

        var confirm = await Service().ConfirmEmailAsync(new ConfirmEmailDto(rawToken));
        var login = await Service().LoginAsync(new LoginDto("confirm@test.local", "password123456789", null));

        confirm.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        login.StatusCode.Should().Be(StatusCodes.Status200OK);
        (await _fixture.Db.Users.SingleAsync()).EmailConfirmed.Should().BeTrue();
    }

    [Fact]
    public async Task PasswordReset_IsEnumerationSafeAndTokenIsSingleUse()
    {
        var hasher = new Pbkdf2PasswordHasher();
        var (hash, salt) = hasher.Hash("old-password-123");
        _fixture.Db.Users.Add(new User { Email = "reset@test.local", DisplayName = "Reset", PasswordHash = hash, PasswordSalt = salt });
        await _fixture.Db.SaveChangesAsync();

        var request = await Service().RequestPasswordResetAsync(new EmailAddressDto("reset@test.local"));
        var missing = await Service().RequestPasswordResetAsync(new EmailAddressDto("missing@test.local"));
        var rawToken = _email.Messages.Single().Body.Split("token=")[1].Split('\n')[0];
        var reset = await Service().ResetPasswordAsync(new ResetPasswordWithTokenDto(rawToken, "new-password-123"));
        var reused = await Service().ResetPasswordAsync(new ResetPasswordWithTokenDto(rawToken, "another-password-123"));

        request.StatusCode.Should().Be(StatusCodes.Status202Accepted);
        missing.StatusCode.Should().Be(StatusCodes.Status202Accepted);
        reset.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        reused.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task SwitchOrganization_OutsideMembership_ReturnsForbiddenInsteadOfThrowing()
    {
        var (user, _) = _fixture.SeedUserWithOrg();

        var result = await Service().SwitchOrganizationAsync(user.Id, new SwitchOrgDto(Guid.NewGuid()));

        result.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task Login_BlockedUser_ReturnsUnauthorized()
    {
        var hasher = new Pbkdf2PasswordHasher();
        var (hash, salt) = hasher.Hash("password123");
        _fixture.Db.Users.Add(new User
        {
            Email = "blocked@test.local",
            DisplayName = "Blocked",
            PasswordHash = hash,
            PasswordSalt = salt,
            IsBlocked = true
        });
        await _fixture.Db.SaveChangesAsync();

        var result = await Service().LoginAsync(new LoginDto("blocked@test.local", "password123", null));

        result.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task GetCurrentUser_ReturnsCurrentUser()
    {
        var (user, _) = _fixture.SeedUserWithOrg();

        var result = await Service().GetCurrentUserAsync(user.Id);

        result.StatusCode.Should().Be(StatusCodes.Status200OK);
        result.Value.Should().BeOfType<UserDto>().Subject.Email.Should().Be(user.Email);
    }

    [Fact]
    public async Task UpdateProfile_ChangesDisplayName()
    {
        var (user, _) = _fixture.SeedUserWithOrg();

        var result = await Service().UpdateProfileAsync(user.Id, new UpdateProfileDto("New Name"));

        result.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await _fixture.Db.Users.FindAsync(user.Id))!.DisplayName.Should().Be("New Name");
    }

    [Fact]
    public async Task UpdateProfile_WithEmptyName_ReturnsBadRequest()
    {
        var (user, _) = _fixture.SeedUserWithOrg();

        var result = await Service().UpdateProfileAsync(user.Id, new UpdateProfileDto(" "));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task ChangePassword_WithCorrectPassword_UpdatesPasswordAndSecurityStamp()
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
        _fixture.Db.Users.Add(user);
        await _fixture.Db.SaveChangesAsync();
        var originalSecurityStamp = user.SecurityStamp;

        var result = await Service().ChangePasswordAsync(
            user.Id,
            new ChangePasswordDto("oldpassword", "new-password-123"));

        result.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        var updated = await _fixture.Db.Users.FindAsync(user.Id);
        hasher.Verify("new-password-123", updated!.PasswordHash, updated.PasswordSalt).Should().BeTrue();
        updated.SecurityStamp.Should().NotBe(originalSecurityStamp);
    }

    [Fact]
    public async Task ChangePassword_WithWrongCurrentPassword_ReturnsBadRequest()
    {
        var (user, _) = _fixture.SeedUserWithOrg();

        var result = await Service().ChangePasswordAsync(
            user.Id,
            new ChangePasswordDto("wrong", "new-password-123"));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    public void Dispose() => _fixture.Dispose();

    private sealed class FakeJwtTokenService : IJwtTokenService
    {
        public string CreateToken(Guid userId, string email, SystemRole systemRole, Guid securityStamp) =>
            "fake-token";
    }
}
