using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

public record SavePrivateNoteDto(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [Required(AllowEmptyStrings = true), StringLength(100000)] string Content);

[Authorize]
[ApiController]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
[Route("api/organizations/{organizationId:guid}/private-notes")]
public class PrivateNotesController(AppDbContext db, ICurrentUserContext userContext) : ControllerBase
{
    private IQueryable<PrivateNote> OwnedNotes(Guid organizationId) => db.PrivateNotes
        .Where(n => n.OrganizationId == organizationId && n.UserId == userContext.UserId);

    [HttpGet]
    public async Task<IActionResult> GetAll(Guid organizationId)
    {
        if (!await userContext.HasAccessAsync(organizationId) || await db.Users.AnyAsync(u => u.Id == userContext.UserId && u.SystemRole == SystemRole.Client)) return Forbid();
        return Ok(await OwnedNotes(organizationId).AsNoTracking().OrderByDescending(n => n.UpdatedAt).ToListAsync());
    }

    [HttpPost]
    public async Task<IActionResult> Create(Guid organizationId, SavePrivateNoteDto dto)
    {
        if (!await userContext.HasAccessAsync(organizationId) || await db.Users.AnyAsync(u => u.Id == userContext.UserId && u.SystemRole == SystemRole.Client)) return Forbid();
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
        var note = new PrivateNote
        {
            OrganizationId = organizationId,
            UserId = userContext.UserId,
            Title = dto.Title.Trim(),
            Content = dto.Content
        };
        db.PrivateNotes.Add(note);
        await db.SaveChangesAsync();
        return Ok(note);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid organizationId, Guid id, SavePrivateNoteDto dto)
    {
        if (!await userContext.HasAccessAsync(organizationId) || await db.Users.AnyAsync(u => u.Id == userContext.UserId && u.SystemRole == SystemRole.Client)) return Forbid();
        var note = await OwnedNotes(organizationId).SingleOrDefaultAsync(n => n.Id == id);
        if (note is null) return NotFound();
        if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title is required.");
        note.Title = dto.Title.Trim();
        note.Content = dto.Content;
        note.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(note);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid organizationId, Guid id)
    {
        if (!await userContext.HasAccessAsync(organizationId) || await db.Users.AnyAsync(u => u.Id == userContext.UserId && u.SystemRole == SystemRole.Client)) return Forbid();
        var note = await OwnedNotes(organizationId).SingleOrDefaultAsync(n => n.Id == id);
        if (note is null) return NotFound();
        db.PrivateNotes.Remove(note);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
