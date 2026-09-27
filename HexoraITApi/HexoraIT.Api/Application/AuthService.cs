using HexoraITApi.Domain;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HexoraITApi.Application;

public interface IAuthService
{
    Task<ApiOperationResult> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> SwitchOrganizationAsync(Guid userId, SwitchOrgDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> GetCurrentUserAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateProfileAsync(Guid userId, UpdateProfileDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> ChangePasswordAsync(Guid userId, ChangePasswordDto dto, CancellationToken cancellationToken = default);
}

public sealed class AuthService(
    AppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenService jwt,
    IOptions<AppSettings> appSettings,
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
        };
        db.Users.Add(user);
        await db.SaveChangesAsync(cancellationToken);
        securityAudit?.AccountChanged("account_registered", user.Id, user.Id);

        return new(StatusCodes.Status200OK,
            await BuildAuthResponseAsync(user, requestedOrgId: null, cancellationToken));
    }

    public async Task<ApiOperationResult> LoginAsync(
        LoginDto dto,
        CancellationToken cancellationToken = default)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(candidate => candidate.Email == email, cancellationToken);

        if (user is null || !user.IsActive || !hasher.Verify(dto.Password, user.PasswordHash, user.PasswordSalt))
            return new(StatusCodes.Status401Unauthorized, "Invalid email or password.");

        if (user.IsBlocked)
            return new(StatusCodes.Status401Unauthorized, "This account has been disabled. Contact your administrator.");

        if (dto.OrganizationId is { } organizationId &&
            !await db.UserOrganizations.AnyAsync(
                membership => membership.UserId == user.Id && membership.OrganizationId == organizationId,
                cancellationToken))
            return new(StatusCodes.Status401Unauthorized, "Invalid email or password.");

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
