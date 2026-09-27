using System.ComponentModel.DataAnnotations;
using HexoraITApi.Application;
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
    public async Task<IActionResult> GetAll(Guid organizationId, [FromQuery] PaginationParameters? pagination = null)
    {
        if (!await userContext.HasAccessAsync(organizationId) || await db.Users.AnyAsync(u => u.Id == userContext.UserId && u.SystemRole == SystemRole.Client)) return Forbid();
        if (!Pagination.TryResolve(pagination, out var window))
            return BadRequest("Both page and pageSize must be supplied together.");

        var query = OwnedNotes(organizationId).AsNoTracking();
        var totalCount = await query.CountAsync();
        var notes = await query
            .OrderByDescending(n => n.UpdatedAt)
            .ThenBy(n => n.Id)
            .Skip(window.Offset)
            .Take(window.PageSize)
            .ToListAsync();
        if (ControllerContext.HttpContext is { } context)
        {
            Pagination.WriteHeaders(context.Response, totalCount, window.Page, window.PageSize);
            if (window.IsLegacy && totalCount > window.PageSize)
                context.Response.Headers["X-Result-Capped"] = "true";
        }
        return Ok(notes);
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
