using HexoraITApi.Application;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HexoraITApi.Api.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController(
    AppDbContext db,
    IPasswordHasher hasher,
    IJwtTokenService jwt,
    IOptions<AppSettings> appSettings) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponseDto>> Register(RegisterDto dto)
    {
        if (!appSettings.Value.AllowRegister)
            return Forbid();
        
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest("Email and password are required.");

        if (dto.Password.Length < 8)
            return BadRequest("Password must be at least 8 characters.");

        var email = dto.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(u => u.Email == email))
            return Conflict("An account with this email already exists.");

        var (hash, salt) = hasher.Hash(dto.Password);
        var user = new User
        {
            Email = email,
            DisplayName = string.IsNullOrWhiteSpace(dto.DisplayName) ? email : dto.DisplayName,
            PasswordHash = hash,
            PasswordSalt = salt,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        return Ok(await BuildAuthResponse(user, requestedOrgId: null));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !user.IsActive || !hasher.Verify(dto.Password, user.PasswordHash, user.PasswordSalt))
            return Unauthorized("Invalid email or password.");

        if (user.IsBlocked)
            return Unauthorized("This account has been disabled. Contact your administrator.");
        
        return Ok(await BuildAuthResponse(user, dto.OrganizationId));
    }

    [HttpPost("switch-org")]
    [Authorize]
    public async Task<ActionResult<AuthResponseDto>> SwitchOrg(SwitchOrgDto dto)
    {
        var userId = CurrentUserId();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId);
        if (user is null) return Unauthorized();

        return Ok(await BuildAuthResponse(user, dto.OrganizationId));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = CurrentUserId();
        var user = await db.Users.FindAsync(userId);
        return user is null ? NotFound() : Ok(new UserDto(user.Id, user.Email, user.DisplayName, user.SystemRole.ToString()));
    }

    [HttpPut("me")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile(UpdateProfileDto dto)
    {
        var userId = CurrentUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        if (string.IsNullOrWhiteSpace(dto.DisplayName))
            return BadRequest("Display name cannot be empty.");

        user.DisplayName = dto.DisplayName.Trim();
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        var userId = CurrentUserId();
        var user = await db.Users.FindAsync(userId);
        if (user is null) return NotFound();

        if (!hasher.Verify(dto.CurrentPassword, user.PasswordHash, user.PasswordSalt))
            return BadRequest("Current password is incorrect.");

        if (dto.NewPassword.Length < 8)
            return BadRequest("New password must be at least 8 characters.");

        var (hash, salt) = hasher.Hash(dto.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private Guid CurrentUserId() =>
        Guid.Parse(User.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)!.Value);

    private async Task<AuthResponseDto> BuildAuthResponse(User user, Guid? requestedOrgId)
    {
        var memberships = await db.UserOrganizations
            .Include(uo => uo.Organization)
            .Where(uo => uo.UserId == user.Id)
            .ToListAsync();
        
        if (memberships.Count == 0)
        {
            var org = new Organization
            {
                Name = $"{user.DisplayName}'s Organization",
                Color = "#4f46e5",
                Initials = user.DisplayName.Length >= 2 ? user.DisplayName[..2].ToUpperInvariant() : "OR",
                Description = "",
            };
            db.Organizations.Add(org);
            var membership = new UserOrganization { UserId = user.Id, OrganizationId = org.Id, Role = OrgRole.Owner };
            db.UserOrganizations.Add(membership);
            await db.SaveChangesAsync();

            memberships = [membership];
            memberships[0].Organization = org;
        }

        var active = requestedOrgId.HasValue
            ? memberships.FirstOrDefault(m => m.OrganizationId == requestedOrgId.Value)
            : memberships.First();

        if (active is null)
            throw new InvalidOperationException("User does not belong to the requested organization.");

        var expiresAt = DateTime.UtcNow.AddHours(8);
        var token = jwt.CreateToken(user.Id, user.Email, user.SystemRole);

        return new AuthResponseDto(
            token,
            expiresAt,
            new UserDto(user.Id, user.Email, user.DisplayName, user.SystemRole.ToString()),
            memberships.Select(m => new OrganizationSummaryDto(m.OrganizationId, m.Organization.Name, m.Role.ToString())).ToList());
    }
}