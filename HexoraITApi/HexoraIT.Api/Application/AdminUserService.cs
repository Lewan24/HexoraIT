using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IAdminUserService
{
    Task<ApiOperationResult> GetUsersAsync(PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> CreateUserAsync(AdminCreateUserDto dto, CancellationToken token = default);
    Task<ApiOperationResult> SetBlockedAsync(Guid id, bool blocked, CancellationToken token = default);
    Task<ApiOperationResult> SetRoleAsync(Guid id, UpdateUserRoleDto dto, CancellationToken token = default);
    Task<ApiOperationResult> ResetPasswordAsync(Guid id, AdminResetPasswordDto dto, CancellationToken token = default);
}

public sealed class AdminUserService(AppDbContext db, IPasswordHasher hasher, ISecurityAuditLogger securityAudit,
    ICurrentUserIdProvider currentUser) : IAdminUserService
{
    public async Task<ApiOperationResult> GetUsersAsync(PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        var total = await db.Users.CountAsync(token);
        var rows = await db.Users.OrderBy(user => user.Email).ThenBy(user => user.Id).Skip(window.Offset).Take(window.PageSize)
            .Select(user => new { user.Id, user.Email, user.DisplayName, user.SystemRole, user.IsBlocked, user.CreatedAt })
            .ToListAsync(token);
        var users = rows.Select(user => new AdminUserDto(
            user.Id, user.Email, user.DisplayName, user.SystemRole.ToString(), user.IsBlocked, user.CreatedAt)).ToList();
        return new(StatusCodes.Status200OK, users, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> CreateUserAsync(AdminCreateUserDto dto, CancellationToken token = default)
    {
        if (dto.Password.Length < 15) return new(StatusCodes.Status400BadRequest, "Password must be at least 15 characters.");
        if (!Enum.TryParse<SystemRole>(dto.SystemRole, out var role) || !Enum.IsDefined(role) || role == SystemRole.Client)
            return new(StatusCodes.Status400BadRequest, "Invalid role.");
        var email = dto.Email.Trim().ToLowerInvariant();
        if (await db.Users.AnyAsync(user => user.Email == email, token)) return new(StatusCodes.Status400BadRequest, "User with this email already exists.");
        var (hash, salt) = hasher.Hash(dto.Password);
        var user = new User { Email = email, DisplayName = dto.DisplayName.Trim(), PasswordHash = hash, PasswordSalt = salt, SystemRole = role, CreatedAt = DateTime.UtcNow };
        db.Users.Add(user); await db.SaveChangesAsync(token);
        securityAudit.AccountChanged("user_created", ActorId, user.Id);
        return new(StatusCodes.Status200OK, ToDto(user));
    }

    public async Task<ApiOperationResult> SetBlockedAsync(Guid id, bool blocked, CancellationToken token = default)
    {
        var user = await db.Users.FindAsync([id], token); if (user is null) return new(StatusCodes.Status404NotFound);
        if (blocked && user.SystemRole == SystemRole.Admin && await IsLastAdminAsync(user.Id, token)) return new(StatusCodes.Status400BadRequest, "Cannot block the last remaining administrator.");
        user.IsBlocked = blocked; user.SecurityStamp = Guid.NewGuid(); await db.SaveChangesAsync(token);
        securityAudit.AccountChanged(blocked ? "user_blocked" : "user_unblocked", ActorId, user.Id);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> SetRoleAsync(Guid id, UpdateUserRoleDto dto, CancellationToken token = default)
    {
        if (!Enum.TryParse<SystemRole>(dto.SystemRole, out var role) || !Enum.IsDefined(role) || role == SystemRole.Client) return new(StatusCodes.Status400BadRequest, "Invalid role.");
        var user = await db.Users.FindAsync([id], token); if (user is null) return new(StatusCodes.Status404NotFound);
        if (role == SystemRole.User && user.SystemRole == SystemRole.Admin && await IsLastAdminAsync(user.Id, token)) return new(StatusCodes.Status400BadRequest, "Cannot demote the last remaining administrator.");
        if (user.SystemRole == SystemRole.Client) return new(StatusCodes.Status400BadRequest, "Client accounts must remain clients.");
        user.SystemRole = role; user.SecurityStamp = Guid.NewGuid(); await db.SaveChangesAsync(token);
        securityAudit.AccountChanged("system_role_changed", ActorId, user.Id); return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ResetPasswordAsync(Guid id, AdminResetPasswordDto dto, CancellationToken token = default)
    {
        if (dto.NewPassword.Length < 15) return new(StatusCodes.Status400BadRequest, "Password must be at least 15 characters.");
        var user = await db.Users.FindAsync([id], token); if (user is null) return new(StatusCodes.Status404NotFound);
        var (hash, salt) = hasher.Hash(dto.NewPassword); user.PasswordHash = hash; user.PasswordSalt = salt; user.SecurityStamp = Guid.NewGuid();
        await db.SaveChangesAsync(token); securityAudit.AccountChanged("password_reset", ActorId, user.Id); return new(StatusCodes.Status204NoContent);
    }

    private Guid ActorId => currentUser.UserId ?? Guid.Empty;
    private async Task<bool> IsLastAdminAsync(Guid excluded, CancellationToken token) =>
        await db.Users.CountAsync(user => user.SystemRole == SystemRole.Admin && user.Id != excluded, token) == 0;
    private static AdminUserDto ToDto(User user) => new(user.Id, user.Email, user.DisplayName, user.SystemRole.ToString(), user.IsBlocked, user.CreatedAt);
}
