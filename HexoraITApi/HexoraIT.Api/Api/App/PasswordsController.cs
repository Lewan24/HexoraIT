using AutoMapper;
using AutoMapper.QueryableExtensions;
using HexoraITApi.Api.Auth;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

[ApiController]
[Route("api/passwords")]
public class PasswordsController(
    AppDbContext db,
    IMapper mapper,
    ICurrentUserContext userContext,
    IPasswordCipher cipher,
    ISecurityAuditLogger? securityAudit = null)
    : OrgScopedController(db, userContext)
{
    [HttpGet]
    public async Task<ActionResult<List<PasswordListDto>>> GetAll(
        [FromQuery] Guid? organizationId,
        [FromQuery] PaginationParameters? pagination = null)
    {
        var paginationError = ResolvePagination(pagination, out var window);
        if (paginationError is not null) return paginationError;

        if (organizationId is { } orgId)
        {
            var check = await CheckReadAccessAsync(orgId);
            if (check is not null) return check;
        }

        var query = Db.Passwords.AsQueryable();
        if (organizationId is { } id) query = query.Where(p => p.OrganizationId == id);

        WritePaginationHeaders(await query.CountAsync(), window);
        return Ok(await query.OrderBy(p => p.Id).Skip(window.Offset).Take(window.PageSize)
            .ProjectTo<PasswordListDto>(mapper.ConfigurationProvider).ToListAsync());
    }

    [HttpGet("{id:guid}/reveal")]
    public async Task<ActionResult<string>> Reveal(Guid id)
    {
        var entry = await Db.Passwords.FirstOrDefaultAsync(p => p.Id == id);
        if (entry is null) return NotFound();
        var plaintext = cipher.Decrypt(entry.EncryptedPassword);
        securityAudit?.SensitiveResourceAccessed(
            "password_revealed", CurrentUserId ?? Guid.Empty, entry.Id, entry.OrganizationId);
        return Ok(plaintext);
    }

    [HttpPost]
    public async Task<ActionResult<PasswordListDto>> Create([FromQuery] Guid organizationId, CreatePasswordDto dto)
    {
        var check = await CheckWriteAccessAsync(organizationId);
        if (check is not null) return check;

        var entry = mapper.Map<PasswordEntry>(dto);
        entry.OrganizationId = organizationId;
        entry.EncryptedPassword = cipher.Encrypt(dto.Password);
        entry.Strength = CalcStrength(dto.Password);
        entry.UpdatedAt = DateTime.UtcNow;
        Db.Passwords.Add(entry);
        await Db.SaveChangesAsync();
        return Ok(mapper.Map<PasswordListDto>(entry));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdatePasswordDto dto)
    {
        var entry = await Db.Passwords.FirstOrDefaultAsync(p => p.Id == id);
        if (entry is null) return NotFound();

        var check = await CheckWriteAccessAsync(entry.OrganizationId, resourceId: entry.Id);
        if (check is not null) return check;

        mapper.Map(dto, entry);
        if (!string.IsNullOrEmpty(dto.Password))
        {
            entry.EncryptedPassword = cipher.Encrypt(dto.Password);
            entry.Strength = CalcStrength(dto.Password);
        }
        entry.UpdatedAt = DateTime.UtcNow;
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var entry = await Db.Passwords.FirstOrDefaultAsync(p => p.Id == id);
        if (entry is null) return NotFound();

        var check = await CheckWriteAccessAsync(entry.OrganizationId, resourceId: entry.Id);
        if (check is not null) return check;

        Db.Passwords.Remove(entry);
        await Db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPatch("{id:guid}/star")]
    public async Task<IActionResult> ToggleStar(Guid id)
    {
        var entry = await Db.Passwords.FirstOrDefaultAsync(p => p.Id == id);
        if (entry is null) return NotFound();

        var check = await CheckWriteAccessAsync(entry.OrganizationId, resourceId: entry.Id);
        if (check is not null) return check;

        entry.Starred = !entry.Starred;
        await Db.SaveChangesAsync();
        return Ok(new { entry.Starred });
    }

    private static PasswordStrength CalcStrength(string pw) =>
        pw.Length >= 16 && pw.Any(char.IsUpper) && pw.Any(char.IsDigit) && pw.Any(c => !char.IsLetterOrDigit(c))
            ? PasswordStrength.Strong
            : pw.Length >= 10 ? PasswordStrength.Medium : PasswordStrength.Weak;
}
