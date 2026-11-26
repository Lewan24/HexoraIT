using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace HexoraITApi.Application;

public interface IPasswordVaultService
{
    Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default);
    Task<ApiOperationResult> RevealAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, CreatePasswordDto dto, CancellationToken token = default);
    Task<ApiOperationResult> ImportAsync(Guid organizationId, List<ImportPasswordDto?> entries, CancellationToken token = default);
    Task<ApiOperationResult> UpdateAsync(Guid id, UpdatePasswordDto dto, CancellationToken token = default);
    Task<ApiOperationResult> DeleteAsync(Guid id, CancellationToken token = default);
    Task<ApiOperationResult> ToggleStarAsync(Guid id, CancellationToken token = default);
}

public sealed class PasswordVaultService(AppDbContext db, IMapper mapper, ICurrentUserContext userContext,
    IPasswordCipher cipher, ISecurityAuditLogger securityAudit) : IPasswordVaultService
{
    private const string ImportConflict = "The vault contains conflicting entries. Review the preview and try again.";

    public async Task<ApiOperationResult> GetAllAsync(Guid? organizationId, PaginationParameters? pagination, CancellationToken token = default)
    {
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        if (organizationId is { } organization && !await userContext.HasPermissionAsync(organization, "passwords")) return new(StatusCodes.Status403Forbidden);
        var query = db.Passwords.AsQueryable();
        if (organizationId is { } id) query = query.Where(item => item.OrganizationId == id);
        var total = await query.CountAsync(token);
        var items = await query.OrderBy(item => item.SortIndex ?? int.MaxValue).ThenBy(item => item.Id).Skip(window.Offset).Take(window.PageSize)
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
        await using var transaction = await LockTitleWritesAsync(organizationId, token);
        var item = mapper.Map<PasswordEntry>(dto);
        item.OrganizationId = organizationId;
        SetPassword(item, dto.Password);
        db.Passwords.Add(item);
        await db.SaveChangesAsync(token);
        if (transaction is not null) await transaction.CommitAsync(token);
        return new(StatusCodes.Status200OK, mapper.Map<PasswordListDto>(item));
    }

    public async Task<ApiOperationResult> ImportAsync(Guid organizationId, List<ImportPasswordDto?> entries, CancellationToken token = default)
    {
        if (!await userContext.HasPermissionAsync(organizationId, "passwords", write: true)) return new(StatusCodes.Status403Forbidden);
        if (entries.Count is < 1 or > 5000 || entries.Any(entry => entry is null ||
            string.IsNullOrWhiteSpace(entry.Name) || entry.Name.Length > 200 ||
            entry.Username is null || entry.Username.Length > 500 ||
            string.IsNullOrEmpty(entry.Password) || entry.Password.Length > 10000 ||
            string.IsNullOrWhiteSpace(entry.Category) || entry.Category.Length > 200 ||
            entry.Name.Contains('\0') || entry.Username.Contains('\0') || entry.Category.Contains('\0') ||
            entry.ReplaceId.HasValue != entry.ExpectedUpdatedAt.HasValue || entry.ExpectedTitleCount is < 0))
            return new(StatusCodes.Status400BadRequest, "Invalid password import entries.");

        var incoming = entries.Select(entry => entry!).ToList();
        var newEntriesByTitle = incoming.Where(entry => entry.ReplaceId is null)
            .ToLookup(entry => ImportTitle(entry.Name), StringComparer.OrdinalIgnoreCase);
        var replacedIds = incoming.Where(entry => entry.ReplaceId.HasValue)
            .ToLookup(entry => entry.ReplaceId!.Value);
        if (replacedIds.Any(group => group.Count() > 1)) return new(StatusCodes.Status409Conflict, ImportConflict);

        await using var transaction = await LockTitleWritesAsync(organizationId, token);
        // Check the organization's complete title set without exposing records hidden by item permissions.
        var existingTitles = await db.Passwords.IgnoreQueryFilters().Where(item => item.OrganizationId == organizationId)
            .Select(item => new { item.Id, item.Name }).ToListAsync(token);
        var matches = existingTitles.ToLookup(item => ImportTitle(item.Name), StringComparer.OrdinalIgnoreCase);
        var conflicts = new List<int>();
        for (var index = 0; index < incoming.Count; index++)
        {
            var entry = incoming[index];
            var title = ImportTitle(entry.Name);
            var matchingEntries = matches[title];
            var existingCount = matchingEntries.Count();
            // The preview authorizes duplicate titles against a specific number of existing entries.
            var titleConflict = entry.ExpectedTitleCount is { } expected
                ? existingCount != expected
                : existingCount + newEntriesByTitle[title].Count() > 1;
            if (titleConflict || (entry.ReplaceId is { } target && !matchingEntries.Any(item => item.Id == target)))
                conflicts.Add(index);
        }
        if (conflicts.Count > 0) return new(StatusCodes.Status409Conflict, new PasswordImportConflictDto(ImportConflict, conflicts));

        var replaceIds = replacedIds.Select(group => group.Key).ToArray();
        var writable = await userContext.GetWritableResourceIdsAsync(organizationId, "passwords", replaceIds, token);
        if (writable.Count != replaceIds.Length) return new(StatusCodes.Status403Forbidden);
        var replacements = await db.Passwords.Where(item => item.OrganizationId == organizationId && replaceIds.Contains(item.Id))
            .ToDictionaryAsync(item => item.Id, token);
        if (incoming.Any(entry => entry.ReplaceId is { } target &&
            (!replacements.TryGetValue(target, out var item) || item.UpdatedAt != entry.ExpectedUpdatedAt)))
            return new(StatusCodes.Status409Conflict, ImportConflict);

        var saved = new List<PasswordEntry>(incoming.Count);
        foreach (var entry in incoming)
        {
            var item = entry.ReplaceId is { } target
                ? replacements[target]
                : new PasswordEntry { OrganizationId = organizationId, Category = entry.Category };
            item.Name = entry.Name.Trim();
            item.Username = entry.Username;
            SetPassword(item, entry.Password);
            if (!entry.ReplaceId.HasValue) db.Passwords.Add(item);
            saved.Add(item);
        }

        try
        {
            await db.SaveChangesAsync(token);
            if (transaction is not null) await transaction.CommitAsync(token);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new(StatusCodes.Status409Conflict, ImportConflict);
        }
        return new(StatusCodes.Status200OK, mapper.Map<List<PasswordListDto>>(saved));
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid id, UpdatePasswordDto dto, CancellationToken token = default)
    {
        var item = await db.Passwords.FirstOrDefaultAsync(candidate => candidate.Id == id, token);
        if (item is null) return new(StatusCodes.Status404NotFound);
        if (!await userContext.HasPermissionAsync(item.OrganizationId, "passwords", true, item.Id)) return new(StatusCodes.Status403Forbidden);
        await using var transaction = await LockTitleWritesAsync(item.OrganizationId, token);
        mapper.Map(dto, item);
        if (!string.IsNullOrEmpty(dto.Password))
            SetPassword(item, dto.Password);
        else
            item.UpdatedAt = DateTime.UtcNow;
        try
        {
            await db.SaveChangesAsync(token);
            if (transaction is not null) await transaction.CommitAsync(token);
        }
        catch (DbUpdateConcurrencyException)
        {
            return new(StatusCodes.Status409Conflict, "Password entry changed while saving. Refresh and try again.");
        }
        return new(StatusCodes.Status204NoContent);
    }

    private static string ImportTitle(string title) => title.Trim().Normalize();

    private async Task<IDbContextTransaction?> LockTitleWritesAsync(Guid organizationId, CancellationToken token)
    {
        if (!db.Database.IsNpgsql()) return null;
        var transaction = await db.Database.BeginTransactionAsync(token);
        try
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({$"passwords:{organizationId}"}, 0))", token);
            return transaction;
        }
        catch
        {
            await transaction.DisposeAsync();
            throw;
        }
    }

    private void SetPassword(PasswordEntry item, string password)
    {
        item.EncryptedPassword = cipher.Encrypt(password);
        item.Strength = CalculateStrength(password);
        item.UpdatedAt = DateTime.UtcNow;
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
