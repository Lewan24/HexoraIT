using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IPasswordVaultService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> RevealAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreatePasswordDto dto, CancellationToken token = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdatePasswordDto dto, CancellationToken token = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken token = default);
}

public sealed class PasswordVaultService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext,
    IPasswordCipher cipher, ISecurityAuditLogger securityAudit) : IPasswordVaultService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "passwords")) return new(StatusCodes.Status403Forbidden);
        var query = db.Passwords.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<PasswordListDto>(mapper.ConfigurationProvider).ToListAsync(token);
        return new(StatusCodes.Status200OK, items, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> RevealAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.Passwords.FirstOrDefaultAsync(candidate => candidate.Id == id, token);
        if (item is null) return new(StatusCodes.Status404NotFound);
        var plaintext = cipher.Decrypt(item.EncryptedPassword);
        securityAudit.SensitiveResourceAccessed("password_revealed", userContext.UserId, item.Id, item.OrganizationId);
        return new(StatusCodes.Status200OK, plaintext);
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, CreatePasswordDto dto, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "passwords", write: true)) return new(StatusCodes.Status403Forbidden);
        var item = mapper.Map<PasswordEntry>(dto);
        item.OrganizationId = organizationId;
        item.EncryptedPassword = cipher.Encrypt(dto.Password);
        item.Strength = CalculateStrength(dto.Password);
        item.UpdatedAt = DateTime.UtcNow;
        db.Passwords.Add(item);
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status200OK, mapper.Map<PasswordListDto>(item));
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdatePasswordDto dto, CancellationToken token = default)
    {
        var item = await db.Passwords.FirstOrDefaultAsync(candidate => candidate.Id == id, token);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "passwords", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        mapper.Map(dto, item);
        if (!string.IsNullOrEmpty(dto.Password))
        {
            item.EncryptedPassword = cipher.Encrypt(dto.Password);
            item.Strength = CalculateStrength(dto.Password);
        }
        item.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.Passwords.FirstOrDefaultAsync(candidate => candidate.Id == id, token);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "passwords", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        db.Passwords.Remove(item);
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status204NoContent);
    }

    public async Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken token = default)
    {
        var item = await db.Passwords.FirstOrDefaultAsync(candidate => candidate.Id == id, token);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "passwords", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        item.Starred = !item.Starred;
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status200OK, new PasswordStarredDto(item.Starred));
    }

    private static PasswordStrength CalculateStrength(string password) =>
        password.Length >= 16 && password.Any(char.IsUpper) && password.Any(char.IsDigit) && password.Any(character => !char.IsLetterOrDigit(character))
            ? PasswordStrength.Strong : password.Length >= 10 ? PasswordStrength.Medium : PasswordStrength.Weak;
}

public sealed record PasswordStarredDto(bool Starred);
