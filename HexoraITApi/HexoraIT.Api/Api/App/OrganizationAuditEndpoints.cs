using System.Globalization;
using System.Text.Json;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

public static class OrganizationAuditEndpoints
{
    private const string Resource = "audit-history";
    private const string ArchivedStatus = "archived";
    private const int PageSize = 25;
    private const int MaxFileBytes = 10 * 1024 * 1024;
    private const int MaxFiles = 2;
    private const int MaxRequestBytes = MaxFiles * MaxFileBytes + 64 * 1024;

    public static void MapOrganizationAuditEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/organizations/{organizationId:guid}/audit-history")
            .WithTags("Organization audits").RequireAuthorization();
        group.MapGet("", ListAsync);
        group.MapGet("/{auditId:guid}/updates", UpdatesAsync);
        group.MapGet("/{auditId:guid}/attachments/{attachmentId:guid}", DownloadAsync);
        group.MapPost("/{auditId:guid}/updates/{updateId:guid}", AppendAsync)
            .WithMetadata(new RequestSizeLimitAttribute(MaxRequestBytes));
    }

    private static async Task<bool> AllowedAsync(Guid id, bool write, ICurrentUserContext user, AppDbContext db, CancellationToken token)
    {
        if (!await user.HasPermissionAsync(id, Resource, write, Guid.Empty)) return false;
        var organization = await db.Organizations.AsNoTracking().SingleOrDefaultAsync(o => o.Id == id, token);
        return organization is { IsArchived: false } && !organization.HiddenModules.Contains(Resource);
    }

    private static async Task<IResult> ListAsync(Guid organizationId, int? page, bool? archived,
        ICurrentUserContext user, AppDbContext db, CancellationToken token)
    {
        if (!await AllowedAsync(organizationId, false, user, db, token)) return Results.Forbid();
        if (page is < 1 or > 10000) return Results.BadRequest("Invalid page.");

        var audits = await db.OrganizationAudits.AsNoTracking().Where(a => a.OrganizationId == organizationId)
            .Select(a => new
            {
                a.Id,
                a.Title,
                a.AuditDate,
                Status = a.Updates.OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id).Select(u => u.Status).First()
            })
            .Where(a => (a.Status == ArchivedStatus) == (archived == true))
            .OrderByDescending(a => a.AuditDate).ThenByDescending(a => a.Id)
            .Skip(((page ?? 1) - 1) * PageSize).Take(PageSize + 1)
            .ToListAsync(token);
        return Results.Ok(new { Items = audits.Take(PageSize), More = audits.Count > PageSize });
    }

    private static async Task<IResult> UpdatesAsync(Guid organizationId, Guid auditId, int? page, ICurrentUserContext user, AppDbContext db, CancellationToken token)
    {
        if (!await AllowedAsync(organizationId, false, user, db, token)) return Results.Forbid();
        if (page is < 1 or > 10000) return Results.BadRequest("Invalid page.");
        if (!await db.OrganizationAudits.AnyAsync(a => a.Id == auditId && a.OrganizationId == organizationId, token))
            return Results.NotFound();

        var updates = await db.OrganizationAuditUpdates.AsNoTracking()
            .Where(u => u.AuditId == auditId && u.Audit.OrganizationId == organizationId)
            .OrderByDescending(u => u.CreatedAt).ThenByDescending(u => u.Id)
            .Skip(((page ?? 1) - 1) * PageSize).Take(PageSize + 1)
            .Select(u => new
            {
                u.Id, u.Author, u.CreatedAt, u.Status, u.Note,
                Attachments = u.Attachments.OrderBy(f => f.FileName).ThenBy(f => f.Id)
                    .Select(f => new { f.Id, f.FileName, f.Size }).ToList()
            }).ToListAsync(token);
        return Results.Ok(new { Items = updates.Take(PageSize), More = updates.Count > PageSize });
    }

    private static async Task<IResult> AppendAsync(Guid organizationId, Guid auditId, Guid updateId, HttpRequest request,
        ICurrentUserContext user, AppDbContext db, CancellationToken token)
    {
        if (!await AllowedAsync(organizationId, true, user, db, token)) return Results.Forbid();
        if (auditId == Guid.Empty || updateId == Guid.Empty || !request.HasFormContentType)
            return Results.BadRequest("Expected an audit update form.");

        var audit = await db.OrganizationAudits.SingleOrDefaultAsync(a => a.Id == auditId && a.OrganizationId == organizationId, token);
        if (await WasSavedAsync()) return Results.NoContent();

        IFormCollection form;
        try { form = await request.ReadFormAsync(token); }
        catch (InvalidDataException) { return Results.BadRequest("Invalid audit update form."); }

        var title = form["title"].ToString().Trim();
        var note = form["note"].ToString().Trim();
        var status = form["status"].ToString();
        if (status is not ("planned" or "in-progress" or "completed" or ArchivedStatus) || note.Length > 4000 || form.Files.Count > MaxFiles)
            return Results.BadRequest("Invalid audit status, note or attachment count.");

        if (form.ContainsKey("title"))
        {
            if (status == ArchivedStatus) return Results.BadRequest("Archive an existing audit.");
            if (title.Length is < 1 or > 160 || !DateOnly.TryParseExact(form["auditDate"], "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var auditDate))
                return Results.BadRequest("Enter a valid audit title and date.");
            if (audit is not null) return Results.Conflict();
            audit = new OrganizationAudit { Id = auditId, OrganizationId = organizationId, Title = title, AuditDate = auditDate };
            db.OrganizationAudits.Add(audit);
        }
        else if (audit is null) return Results.NotFound();

        var update = new OrganizationAuditUpdate
        {
            Id = updateId, Audit = audit, Status = status, Note = note, CreatedAt = DateTime.UtcNow,
            AuthorId = user.UserId,
            Author = await db.Users.Where(u => u.Id == user.UserId).Select(u => u.DisplayName).SingleAsync(token)
        };

        try
        {
            foreach (var file in form.Files)
                update.Attachments.Add(await ReadAttachmentAsync(file, token));
        }
        catch (InvalidDataException error) { return Results.BadRequest(error.Message); }
        catch (JsonException) { return Results.BadRequest("The JSON attachment is invalid."); }

        db.OrganizationAuditUpdates.Add(update);
        try { await db.SaveChangesAsync(token); }
        catch (DbUpdateException)
        {
            if (!await WasSavedAsync()) throw;
        }
        return Results.NoContent();

        Task<bool> WasSavedAsync() => db.OrganizationAuditUpdates.AsNoTracking().AnyAsync(u =>
            u.Id == updateId && u.AuditId == auditId && u.Audit.OrganizationId == organizationId && u.AuthorId == user.UserId, token);
    }

    private static async Task<OrganizationAuditAttachment> ReadAttachmentAsync(IFormFile file, CancellationToken token)
    {
        var name = FileUploadSecurity.NormalizeFileName(file.FileName);
        var extension = Path.GetExtension(name).ToLowerInvariant();
        if (extension is not (".pdf" or ".json") || file.Length is <= 0 or > MaxFileBytes)
            throw new InvalidDataException("Attach a non-empty JSON or PDF file up to 10 MB.");

        var content = new byte[(int)file.Length];
        await using var stream = file.OpenReadStream();
        await stream.ReadExactlyAsync(content, token);
        if (extension == ".pdf" && !content.AsSpan().StartsWith("%PDF-"u8))
            throw new InvalidDataException("The PDF attachment is invalid.");
        if (extension == ".json")
        {
            var json = content.AsMemory();
            if (json.Span.StartsWith(new byte[] { 0xEF, 0xBB, 0xBF })) json = json[3..];
            using var document = JsonDocument.Parse(json);
        }

        return new OrganizationAuditAttachment { FileName = name, Content = content, Size = content.Length };
    }

    private static async Task<IResult> DownloadAsync(Guid organizationId, Guid auditId, Guid attachmentId,
        ICurrentUserContext user, AppDbContext db, CancellationToken token)
    {
        if (!await AllowedAsync(organizationId, false, user, db, token)) return Results.Forbid();
        var file = await db.OrganizationAuditAttachments.AsNoTracking()
            .Where(f => f.Id == attachmentId && f.Update.AuditId == auditId && f.Update.Audit.OrganizationId == organizationId)
            .Select(f => new { f.Content, f.FileName }).SingleOrDefaultAsync(token);

        return file is null ? Results.NotFound() : Results.File(file.Content, "application/octet-stream", file.FileName);
    }
}
