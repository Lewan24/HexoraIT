using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public interface IPrivateNoteService
{
    Task<ApiOperationResult> GetAllAsync(Guid organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> CreateAsync(Guid organizationId, SavePrivateNoteDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> UpdateAsync(Guid organizationId, Guid id, SavePrivateNoteDto dto, CancellationToken cancellationToken = default);
    Task<ApiOperationResult> DeleteAsync(Guid organizationId, Guid id, CancellationToken cancellationToken = default);
}

public sealed class PrivateNoteService(AppDbContext db, ICurrentUserContext userContext) : IPrivateNoteService
{
    public async Task<ApiOperationResult> GetAllAsync(Guid organizationId, PaginationParameters? pagination, CancellationToken cancellationToken = default)
    {
        if (!await CanUseAsync(organizationId, cancellationToken)) return new(StatusCodes.Status403Forbidden);
        if (!Pagination.TryResolve(pagination, out var window)) return new(StatusCodes.Status400BadRequest, "Both page and pageSize must be supplied together.");
        var query = OwnedNotes(organizationId).AsNoTracking();
        var total = await query.CountAsync(cancellationToken);
        var notes = await query.OrderByDescending(note => note.UpdatedAt).ThenBy(note => note.Id)
            .Skip(window.Offset).Take(window.PageSize).ToListAsync(cancellationToken);
        return new(StatusCodes.Status200OK, notes, Pagination: new PaginationMetadata(total, window));
    }

    public async Task<ApiOperationResult> CreateAsync(Guid organizationId, SavePrivateNoteDto dto, CancellationToken cancellationToken = default)
    {
        if (!await CanUseAsync(organizationId, cancellationToken)) return new(StatusCodes.Status403Forbidden);
        if (string.IsNullOrWhiteSpace(dto.Title)) return new(StatusCodes.Status400BadRequest, "Title is required.");
        var note = new PrivateNote { OrganizationId = organizationId, UserId = userContext.UserId, Title = dto.Title.Trim(), Content = dto.Content };
        db.PrivateNotes.Add(note);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status200OK, note);
    }

    public async Task<ApiOperationResult> UpdateAsync(Guid organizationId, Guid id, SavePrivateNoteDto dto, CancellationToken cancellationToken = default)
    {
        if (!await CanUseAsync(organizationId, cancellationToken)) return new(StatusCodes.Status403Forbidden);
        var note = await OwnedNotes(organizationId).SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (note is null) return new(StatusCodes.Status404NotFound);
        if (string.IsNullOrWhiteSpace(dto.Title)) return new(StatusCodes.Status400BadRequest, "Title is required.");
        note.Title = dto.Title.Trim();
        note.Content = dto.Content;
        note.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status200OK, note);
    }

    public async Task<ApiOperationResult> DeleteAsync(Guid organizationId, Guid id, CancellationToken cancellationToken = default)
    {
        if (!await CanUseAsync(organizationId, cancellationToken)) return new(StatusCodes.Status403Forbidden);
        var note = await OwnedNotes(organizationId).SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (note is null) return new(StatusCodes.Status404NotFound);
        db.PrivateNotes.Remove(note);
        await db.SaveChangesAsync(cancellationToken);
        return new(StatusCodes.Status204NoContent);
    }

    private IQueryable<PrivateNote> OwnedNotes(Guid organizationId) => db.PrivateNotes
        .Where(note => note.OrganizationId == organizationId && note.UserId == userContext.UserId);

    private async Task<bool> CanUseAsync(Guid organizationId, CancellationToken cancellationToken) =>
        await userContext.HasAccessAsync(organizationId) &&
        !await db.Users.AnyAsync(user => user.Id == userContext.UserId && user.SystemRole == SystemRole.Client, cancellationToken);
}
