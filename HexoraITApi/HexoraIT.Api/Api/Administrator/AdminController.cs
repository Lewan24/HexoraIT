using System.ComponentModel.DataAnnotations;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.Administrator;
public record AdminUserDto(Guid Id, string Email, string DisplayName, string SystemRole, bool IsBlocked, DateTime CreatedAt);
public record AdminCreateUserDto(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(200)] string DisplayName,
    [Required, StringLength(200, MinimumLength = 15)] string Password,
    [Required, StringLength(20)] string SystemRole);
public record UpdateUserRoleDto([Required, StringLength(20)] string SystemRole);
public record AdminResetPasswordDto([Required, StringLength(200, MinimumLength = 15)] string NewPassword);

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db, IPasswordHasher hasher, ISecurityAuditLogger? securityAudit = null) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers([FromQuery] PaginationParameters? pagination = null)
    {
        if (!Pagination.TryResolve(pagination, out var window))
            return BadRequest("Both page and pageSize must be supplied together.");

        var totalCount = await db.Users.CountAsync();
        var users = await db.Users
            .OrderBy(u => u.Email)
            .ThenBy(u => u.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .Select(u => new AdminUserDto(u.Id, u.Email, u.DisplayName, u.SystemRole.ToString(), u.IsBlocked, u.CreatedAt))
            .ToListAsync();
        if (ControllerContext.HttpContext is { } context)
        {
            Pagination.WriteHeaders(context.Response, totalCount, window.Page, window.PageSize);
            if (window.IsLegacy && totalCount > window.PageSize)
                context.Response.Headers["X-Result-Capped"] = "true";
        }
        return Ok(users);
    }

    [HttpPost("users")]
    public async Task<ActionResult<AdminUserDto>> CreateUser(AdminCreateUserDto dto)
    {
        if (dto.Password.Length < 15)
            return BadRequest("Password must be at least 15 characters.");

        if (!Enum.TryParse<SystemRole>(dto.SystemRole, out var role) || !Enum.IsDefined(role) || role == SystemRole.Client)
            return BadRequest("Invalid role.");

        if (await db.Users.AnyAsync(x => x.Email == dto.Email))
            return BadRequest("User with this email already exists.");

        var (hash, salt) = hasher.Hash(dto.Password);

        var user = new User
        {
            Id = Guid.NewGuid(),
            Email = dto.Email.Trim(),
            DisplayName = dto.DisplayName.Trim(),
            PasswordHash = hash,
            PasswordSalt = salt,
            SystemRole = role,
            CreatedAt = DateTime.UtcNow,
            IsBlocked = false
        };

        db.Users.Add(user);
        await db.SaveChangesAsync();
        securityAudit?.AccountChanged("user_created", CurrentActorId(), user.Id);

        return Ok(new AdminUserDto(
            user.Id,
            user.Email,
            user.DisplayName,
            user.SystemRole.ToString(),
            user.IsBlocked,
            user.CreatedAt));
    }
    
    [HttpPatch("users/{id:guid}/block")]
    public async Task<IActionResult> SetBlocked(Guid id, [FromQuery] bool blocked)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) 
            return NotFound();

        if (blocked && user.SystemRole == SystemRole.Admin && await IsLastAdmin(user.Id))
            return BadRequest("Cannot block the last remaining administrator.");

        user.IsBlocked = blocked;
        user.SecurityStamp = Guid.NewGuid();
        await db.SaveChangesAsync();
        securityAudit?.AccountChanged(blocked ? "user_blocked" : "user_unblocked", CurrentActorId(), user.Id);
        return NoContent();
    }

    [HttpPatch("users/{id:guid}/role")]
    public async Task<IActionResult> SetRole(Guid id, UpdateUserRoleDto dto)
    {
        if (!Enum.TryParse<SystemRole>(dto.SystemRole, out var role) || !Enum.IsDefined(role) || role == SystemRole.Client)
            return BadRequest("Invalid role.");

        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        if (role == SystemRole.User && user.SystemRole == SystemRole.Admin && await IsLastAdmin(user.Id))
            return BadRequest("Cannot demote the last remaining administrator.");

        if (user.SystemRole == SystemRole.Client) return BadRequest("Client accounts must remain clients.");
        user.SystemRole = role;
        user.SecurityStamp = Guid.NewGuid();
        await db.SaveChangesAsync();
        securityAudit?.AccountChanged("system_role_changed", CurrentActorId(), user.Id);
        return NoContent();
    }

    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, AdminResetPasswordDto dto)
    {
        if (dto.NewPassword.Length < 15)
            return BadRequest("Password must be at least 15 characters.");

        var user = await db.Users.FindAsync(id);
        if (user is null) 
            return NotFound();

        var (hash, salt) = hasher.Hash(dto.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        user.SecurityStamp = Guid.NewGuid();
        await db.SaveChangesAsync();
        securityAudit?.AccountChanged("password_reset", CurrentActorId(), user.Id);
        return NoContent();
    }

    private async Task<bool> IsLastAdmin(Guid excludingUserId) =>
        await db.Users.CountAsync(u => u.SystemRole == SystemRole.Admin && u.Id != excludingUserId) == 0;

    private Guid CurrentActorId()
    {
        var value = ControllerContext.HttpContext?.User
            .FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
        return Guid.TryParse(value, out var actorId) ? actorId : Guid.Empty;
    }
}
