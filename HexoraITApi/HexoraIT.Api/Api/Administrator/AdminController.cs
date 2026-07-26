using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.Administrator;
public record AdminUserDto(Guid Id, string Email, string DisplayName, string SystemRole, bool IsBlocked, DateTime CreatedAt);
public record AdminCreateUserDto(string Email, string DisplayName, string Password, string SystemRole);
public record UpdateUserRoleDto(string SystemRole);
public record AdminResetPasswordDto(string NewPassword);

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "AdminOnly")]
public class AdminController(AppDbContext db, IPasswordHasher hasher) : ControllerBase
{
    [HttpGet("users")]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers()
    {
        var users = await db.Users
            .OrderBy(u => u.Email)
            .Select(u => new AdminUserDto(u.Id, u.Email, u.DisplayName, u.SystemRole.ToString(), u.IsBlocked, u.CreatedAt))
            .ToListAsync();
        return Ok(users);
    }

    [HttpPost("users")]
    public async Task<ActionResult<AdminUserDto>> CreateUser(AdminCreateUserDto dto)
    {
        if (dto.Password.Length < 8)
            return BadRequest("Password must be be at least 8 characters.");

        if (!Enum.TryParse<SystemRole>(dto.SystemRole, out var role))
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
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("users/{id:guid}/role")]
    public async Task<IActionResult> SetRole(Guid id, UpdateUserRoleDto dto)
    {
        if (!Enum.TryParse<SystemRole>(dto.SystemRole, out var role))
            return BadRequest("Invalid role.");

        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();

        if (role == SystemRole.User && user.SystemRole == SystemRole.Admin && await IsLastAdmin(user.Id))
            return BadRequest("Cannot demote the last remaining administrator.");

        user.SystemRole = role;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("users/{id:guid}/reset-password")]
    public async Task<IActionResult> ResetPassword(Guid id, AdminResetPasswordDto dto)
    {
        if (dto.NewPassword.Length < 8) 
            return BadRequest("Password must be at least 8 characters.");

        var user = await db.Users.FindAsync(id);
        if (user is null) 
            return NotFound();

        var (hash, salt) = hasher.Hash(dto.NewPassword);
        user.PasswordHash = hash;
        user.PasswordSalt = salt;
        await db.SaveChangesAsync();
        return NoContent();
    }

    private async Task<bool> IsLastAdmin(Guid excludingUserId) =>
        await db.Users.CountAsync(u => u.SystemRole == SystemRole.Admin && u.Id != excludingUserId) == 0;
}