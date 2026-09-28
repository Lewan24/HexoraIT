using HexoraITApi.Domain;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Cryptography;

namespace HexoraITApi.Application;

public interface IAuthService
{
    Task<ApiOperationResult> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> SwitchOrganizationAsync(Guid userId, SwitchOrgDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateProfileAsync(Guid userId, UpdateProfileDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ChangePasswordAsync(Guid userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ConfirmEmailAsync(ConfirmEmailDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> RequestPasswordResetAsync(EmailAddressDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ResetPasswordAsync(ResetPasswordWithTokenDto dto, CancellationToken cancellationToken = default);
}

public sealed class AuthService(
    AppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenService jwt,
    IOptions<AppSettings> appSettings,
    IEmailSender? emailSender = null,
    ISecurityAuditLogger? securityAudit = null) : IAuthService
{
    public async Task<ApiOperationResult> RegisterAsync(
        RegisterDto dto,
        CancellationToken cancellationToken = default)
    {
        if (!appSettings.Value.AllowRegister)
            return new(StatusCodes.Status403Forbidden);

        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return new(StatusCodes.Status400BadRequest, "Email and password are required.");

        if (dto.Password.Length < 15)
            return new(StatusCodes.Status400BadRequest, "Password must be at least 15 characters.");

        var email = dto.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(user => user.Email == email, cancellationToken))
            return new(StatusCodes.Status409Conflict, "An account with this email already exists.");

        var (hash, salt) = hasher.Hash(dto.Password);
        var user = new User
        {
            Email = email,
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? email : dto.DisplayName,
            PasswordHash = hash,
            PasswordSalt = salt,
            EmailConfirmed = false,
        };
        db.Users.Add(user);
        var rawToken = CreateToken();
        db.AccountActionTokens.Add(NewActionToken(user.Id, "confirm_email", rawToken, TimeSpan.FromHours(24)));
        await db.SaveChangesAsync(cancellationToken);
        var sent = emailSender is not null && await emailSender.SendAsync(user.Email, "Confirm your HexoraIT account",
            $"Confirm your email by opening: {BuildActionUrl("confirm-email", rawToken)}\nThis link expires in 24 hours.", cancellationToken);
        if (!sent)
        {
            db.Users.Remove(user);
            await db.SaveChangesAsync(cancellationToken);
            return new(StatusCodes.Status503ServiceUnavailable, "Confirmation email could not be sent. Try again later or contact an administrator.");
        }
        securityAudit?.AccountChanged("account_registered", user.Id, user.Id);
        return new(StatusCodes.Status202Accepted, "Check your email to confirm your account.");
    }

    public async Task<ApiOperationResult> LoginAsync(
        LoginDto dto,
        CancellationToken cancellationToken = default)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Email == email, cancellationToken);

        if (user is null || !user.IsActive || !user.EmailConfirmed || !hasher.Verify(dto.Password, user.PasswordHash, user.PasswordSalt))
        {
            securityAudit?.AuthenticationFailed(email, user?.Id);
            return new(StatusCodes.Status401Unauthorized, "Invalid email or password.");
        }

        if (user.IsBlocked)
        {
            securityAudit?.AuthenticationFailed(email, user.Id);
            return new(StatusCodes.Status401Unauthorized, "Invalid email or password.");
        }

        if (dto.OrganizationId is { } organizationId &&
            !await db.UserOrganizations.AnyAsync(
                membership => membership.UserId == user.Id && membership.OrganizationId == organizationId,
                cancellationToken))
        {
            securityAudit?.AuthenticationFailed(email, user?.Id);
            return new(StatusCodes.Status401Unauthorized, "Invalid email or password.");
        }

        securityAudit?.AuthenticationSucceeded(user.Id);
        return new(StatusCodes.Status200OK,
            await BuildAuthResponseAsync(user, dto.OrganizationId, cancellationToken));
    }

    public async Task<ApiOperationResult> SwitchOrganizationAsync(
        Guid userId,
        SwitchOrgDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);
        if (user is null) return new(StatusCodes.Status401Unauthorized);

        if (!await db.UserOrganizations.AnyAsync(
                membership => membership.UserId == userId &&
                              membership.OrganizationId == dto.OrganizationId &&
                              !membership.Organization.IsDeleted,
                cancellationToken))
            return new(StatusCodes.Status403Forbidden);

        return new(StatusCodes.Status200OK,
            await BuildAuthResponseAsync(user, dto.OrganizationId, cancellationToken));
    }

    public async Task<ApiOperationResult> GetCurrentUserAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([userId], cancellationToken);
        return user is null
            ? new(StatusCodes.Status404NotFound)
            : new(StatusCodes.Status200OK,
                new UserDto(user.Id, user.Email, user.DisplayName, user.SystemRole.ToString()));
    }

    public async Task<ApiOperationResult> UpdateProfileAsync(
        Guid userId,
        UpdateProfileDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([userId], cancellationToken);
        if (user is null) return new(StatusCodes.Status404NotFound);

        if (string.IsNullOrWhiteSpace(dto.DisplayName))
            return new(StatusCodes.Status400BadRequest, "Display name cannot be empty.");

        user.DisplayName = dto.DisplayName.Trim();
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ChangePasswordAsync(
        Guid userId,
        ChangePasswordDto dto,
        CancellationToken cancellationToken = default)
    {
        var user = await db.Users.FindAsync([userId], cancellationToken);
        if (user is null) return new(StatusCodes.Status404NotFound);

        if (!hasher.Verify(dto.CurrentPassword, user.PasswordHash, user.PasswordSalt))
            return new(StatusCodes.Status400BadRequest, "Current password is incorrect.");

        if (dto.NewPassword.Length < 15)
            return new(StatusCodes.Status400BadRequest, "New password must be at least 15 characters.");

        var (hash, salt) = hasher.Hash(dto.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        user.SecurityStamp = Guid.NewGuid();
        await db.SaveChangesAsync(cancellationToken);
        securityAudit?.AccountChanged("password_changed", user.Id, user.Id);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ConfirmEmailAsync(ConfirmEmailDto dto, CancellationToken cancellationToken = default)
    {
        var action = await FindValidTokenAsync(dto.Token, "confirm_email", cancellationToken);
        if (action is null) return new(StatusCodes.Status400BadRequest, "The confirmation token is invalid or expired.");
        action.User.EmailConfirmed = true;
        action.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        securityAudit?.AccountChanged("email_confirmed", action.UserId, action.UserId);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> RequestPasswordResetAsync(EmailAddressDto dto, CancellationToken cancellationToken = default)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(x => x.Email == email && x.IsActive && !x.IsBlocked && x.EmailConfirmed, cancellationToken);
        if (user is not null && emailSender is not null)
        {
            var oldTokens = await db.AccountActionTokens.Where(x => x.UserId == user.Id && x.Purpose == "reset_password" && x.UsedAt == null).ToListAsync(cancellationToken);
            foreach (var old in oldTokens) old.UsedAt = DateTime.UtcNow;
            var rawToken = CreateToken();
            db.AccountActionTokens.Add(NewActionToken(user.Id, "reset_password", rawToken, TimeSpan.FromHours(1)));
            await db.SaveChangesAsync(cancellationToken);
            await emailSender.SendAsync(user.Email, "Reset your HexoraIT password",
                $"Reset your password by opening: {BuildActionUrl("reset-password", rawToken)}\nThis link expires in 1 hour.", cancellationToken);
        }
        return new(StatusCodes.Status202Accepted, "If the account exists, a password reset email has been sent.");
    }

    public async Task<ApiOperationResult> ResetPasswordAsync(ResetPasswordWithTokenDto dto, CancellationToken cancellationToken = default)
    {
        if (dto.NewPassword.Length < 15)
            return new(StatusCodes.Status400BadRequest, "New password must be at least 15 characters.");
        var action = await FindValidTokenAsync(dto.Token, "reset_password", cancellationToken);
        if (action is null) return new(StatusCodes.Status400BadRequest, "The reset token is invalid or expired.");
        var (hash, salt) = hasher.Hash(dto.NewPassword);
        action.User.PasswordHash = hash; action.User.PasswordSalt = salt; action.User.SecurityStamp = Guid.NewGuid(); action.UsedAt = DateTime.UtcNow;
        var otherTokens = await db.AccountActionTokens.Where(x => x.UserId == action.UserId && x.Purpose == "reset_password" && x.UsedAt == null && x.Id != action.Id).ToListAsync(cancellationToken);
        foreach (var other in otherTokens) other.UsedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        securityAudit?.AccountChanged("password_reset", action.UserId, action.UserId);
        return new(StatusCodes.Status204NoContent);
    }

    private async Task<AccountActionToken?> FindValidTokenAsync(string rawToken, string purpose, CancellationToken cancellationToken)
    {
        byte[] hash;
        try { hash = SHA256.HashData(Convert.FromBase64String(rawToken.Replace('-', '+').Replace('_', '/') + new string('=', (4 - rawToken.Length % 4) % 4))); }
        catch (FormatException) { return null; }
        var candidate = await db.AccountActionTokens.Include(x => x.User)
            .SingleOrDefaultAsync(x => x.Purpose == purpose && x.UsedAt == null && x.ExpiresAt > DateTime.UtcNow && x.TokenHash == hash,
                cancellationToken);
        return candidate is not null && CryptographicOperations.FixedTimeEquals(candidate.TokenHash, hash) ? candidate : null;
    }

    private static string CreateToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static AccountActionToken NewActionToken(Guid userId, string purpose, string rawToken, TimeSpan lifetime) => new()
    {
        UserId = userId, Purpose = purpose,
        TokenHash = SHA256.HashData(Convert.FromBase64String(rawToken.Replace('-', '+').Replace('_', '/') + new string('=', (4 - rawToken.Length % 4) % 4))),
        ExpiresAt = DateTime.UtcNow.Add(lifetime)
    };
    private string BuildActionUrl(string path, string token) =>
        $"{appSettings.Value.PublicUrl.TrimEnd('/')}/{path}?token={Uri.EscapeDataString(token)}";

    private async Task<AuthResponseDto> BuildAuthResponseAsync(
        User user,
        Guid? requestedOrgId,
        CancellationToken cancellationToken)
    {
        var memberships = await db.UserOrganizations
            .Include(membership => membership.Organization)
            .Where(membership => membership.UserId == user.Id)
            .ToListAsync(cancellationToken);

        if (memberships.Count == 0)
        {
            var organization = new Organization
            {
                Name = $"{user.DisplayName}'s Organization",
                Color = "#4f46e5",
                Initials = user.DisplayName.Length >= 2 ? user.DisplayName[..2].ToUpperInvariant() : "OR",
                Description = "",
            };
            db.Organizations.Add(organization);
            var membership = new UserOrganization
            {
                UserId = user.Id,
                OrganizationId = organization.Id,
                Role = OrgRole.Owner,
                Organization = organization
            };
            db.UserOrganizations.Add(membership);
            await db.SaveChangesAsync(cancellationToken);
            memberships = [membership];
        }

        var active = requestedOrgId.HasValue
            ? memberships.FirstOrDefault(membership => membership.OrganizationId == requestedOrgId.Value)
            : memberships.First();
        if (active is null)
            throw new InvalidOperationException("User does not belong to the requested organization.");

        return new AuthResponseDto(
            jwt.CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp),
            DateTime.UtcNow.AddHours(8),
            new UserDto(user.Id, user.Email, user.DisplayName, user.SystemRole.ToString()),
            memberships.Select(membership => new OrganizationSummaryDto(
                membership.OrganizationId,
                membership.Organization.Name,
                membership.Role.ToString())).ToList());
    }
}
