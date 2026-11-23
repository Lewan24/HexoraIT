using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text.Json;
using System.Text.Json.Nodes;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.Operations;

public sealed record OperationInput(
    Guid TemplateVersionId, [Required, StringLength(200)] string Title,
    [StringLength(10000)] string Description, JsonElement Values,
    [RegularExpression("^(Standard|Normal|Emergency)$")] string ChangeType = "Normal",
    [RegularExpression("^(Low|Medium|High)$")] string Risk = "Medium",
    [RegularExpression("^(Low|Medium|High)$")] string Priority = "Medium",
    Guid? ImplementerId = null, Guid? OwnerId = null, Guid? AssetId = null,
    DateTime? PlannedStart = null, DateTime? PlannedEnd = null,
    DateTime? ActualStart = null, DateTime? ActualEnd = null, Guid? RevisionToken = null);
public sealed record OperationTransition(Guid RevisionToken, [Required, StringLength(40)] string Target, [StringLength(4000)] string Reason = "", [StringLength(4000)] string ExceptionReason = "");
public sealed record OperationList(List<OperationRecordView> Items, int Total, int Page, int PageSize);
public sealed record OperationDetail(OperationRecordView Record, OperationTemplateVersion Template, OperationSchema Schema,
    JsonElement Values, List<OperationActivity> Activity, List<OperationRevisionInfo> Revisions, string[] AllowedTransitions, bool CanEdit, bool CanPolicyException = false);
public sealed record OperationRevisionInfo(Guid Id, Guid RevisionToken, Guid ActorId, DateTime CreatedAt);

public sealed class OperationService(AppDbContext db, ICurrentUserContext user)
{
    private OperationAdministrationService Administration => new(db, user);
    public async Task<bool> CanRead(Guid org) => await user.HasPermissionAsync(org, "operations");
    private async Task<bool> Active(Guid org) => await db.Organizations.AnyAsync(o => o.Id == org && !o.IsArchived);
    private async Task<bool> Admin(Guid org) => await Active(org) && await user.GetRoleAsync(org) is >= OrgRole.Admin && await user.HasPermissionAsync(org, "operations", true);
    private async Task<bool> Write(OperationRecord r) => await Active(r.OrganizationId) && await user.HasPermissionAsync(r.OrganizationId, "operations", true, r.Id) &&
        (r.RequesterId == user.UserId || r.ImplementerId == user.UserId || await Admin(r.OrganizationId));

    public async Task<ApiOperationResult> Templates(Guid org, CancellationToken token)
    {
        return await Administration.Templates(org, token);
    }

    public async Task<ApiOperationResult> List(Guid org, string? search, string? status, string? risk, string? type, Guid? assetId,
        Guid? requester, Guid? implementer, string? category, DateTime? from, DateTime? to, string? sort, int page, int pageSize, CancellationToken token, bool pendingApprovals = false)
    {
        if (!await CanRead(org)) return new(403);
        if (page < 1 || page > 100000 || pageSize is < 1 or > 100 || search?.Length > 200 || sort is not (null or "modified" or "title" or "number")) return new(400, "Invalid register filters.");
        var query = db.OperationRecords.AsNoTracking().Where(r => r.OrganizationId == org);
        if (pendingApprovals)
        {
            var submittedTemplates = await db.OperationTemplates.AsNoTracking().Where(t => (t.OrganizationId == null || t.OrganizationId == org) &&
                db.OperationRecords.Any(r => r.OrganizationId == org && r.TemplateVersionId == t.Id && r.Status == "Submitted"))
                .Select(t => new { t.Id, t.SchemaJson }).ToListAsync(token);
            var approvalIds = submittedTemplates.Where(t => { var s = OperationSchemas.Parse(t.SchemaJson); return OperationCatalog.IsRecord(s) && s.RequiresApproval; }).Select(t => t.Id).ToArray();
            query = query.Where(r => r.Status == "Awaiting Approval" || r.Status == "Submitted" && approvalIds.Contains(r.TemplateVersionId));
        }
        if (!string.IsNullOrWhiteSpace(search))
        {
            if (db.Database.IsNpgsql()) query = query.Where(r => r.Number.Contains(search) || EF.Functions.ToTsVector("simple", r.Title + " " + r.Description).Matches(EF.Functions.PlainToTsQuery("simple", search)));
            else query = query.Where(r => r.Title.Contains(search) || r.Description.Contains(search) || r.Number.Contains(search));
        }
        if (!string.IsNullOrEmpty(status)) query = query.Where(r => r.Status == status);
        if (!string.IsNullOrEmpty(risk)) query = query.Where(r => r.Risk == risk);
        if (!string.IsNullOrEmpty(type)) query = query.Where(r => r.ChangeType == type);
        if (!string.IsNullOrEmpty(category)) query = query.Where(r => r.Category == category);
        if (assetId.HasValue) query = query.Where(r => r.AssetId == assetId);
        if (requester.HasValue) query = query.Where(r => r.RequesterId == requester);
        if (implementer.HasValue) query = query.Where(r => r.ImplementerId == implementer);
        if (from.HasValue) query = query.Where(r => r.CreatedAt >= from);
        if (to.HasValue) query = query.Where(r => r.CreatedAt <= to);
        var total = await query.CountAsync(token);
        query = sort switch { "title" => query.OrderBy(r => r.Title).ThenBy(r => r.Id), "number" => query.OrderByDescending(r => r.Year).ThenByDescending(r => r.Sequence), _ => query.OrderByDescending(r => r.ModifiedAt).ThenBy(r => r.Id) };
        var records = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(token);
        return new(200, new OperationList(records.Select(OperationRecordView.From).ToList(), total, page, pageSize));
    }

    public async Task<OperationRecord?> Find(Guid org, Guid id, CancellationToken token) =>
        await db.OperationRecords.FirstOrDefaultAsync(r => r.OrganizationId == org && r.Id == id, token);

    public async Task<ApiOperationResult> Detail(Guid org, Guid id, CancellationToken token)
    {
        var r = await Find(org, id, token);
        if (r is null) return new(404);
        var template = await db.OperationTemplates.AsNoTracking().SingleAsync(t => t.Id == r.TemplateVersionId, token);
        var admin = await Admin(org);
        var write = await Write(r);
        var schema = OperationSchemas.Parse(template.SchemaJson);
        var policy = await Administration.Policy(org, token);
        var sensitive = await Administration.Sensitive(org);
        string[] targets = ["Submitted", "Under Review", "Awaiting Approval", "Approved", "Rejected", "Scheduled", "In Progress", "Verification", "Completed", "Failed", "Rolled Back", "Closed", "Cancelled", "Archived"];
        var allowed = targets.Where(t => CanTransition(r, t, schema, policy) &&
            (OperationWorkflow.Administrative(t) ? admin : write) &&
            (t != "Approved" || !OperationAdministrationService.NeedsApproval(r, schema, policy) || OperationAdministrationService.CanSelfApprove(r, policy) || policy.AllowDocumentedExceptions || (r.RequesterId != user.UserId && r.ImplementerId != user.UserId))).ToList();
        if (admin && r.EmergencyBypassed && !r.RetrospectiveReviewed && r.Status is not ("Closed" or "Archived")) allowed.Add("RetrospectiveReview");
        var activity = await db.OperationActivities.AsNoTracking().Where(a => a.OrganizationId == org && a.RecordId == id).OrderBy(a => a.OccurredAt).ThenBy(a => a.Id).ToListAsync(token);
        var revisions = await db.OperationRevisions.AsNoTracking().Where(a => a.OrganizationId == org && a.RecordId == id)
            .OrderBy(a => a.CreatedAt).Select(a => new OperationRevisionInfo(a.Id, a.RevisionToken, a.ActorId, a.CreatedAt)).ToListAsync(token);
        var publicSchema = OperationSchemas.PublicSchema(schema, sensitive);
        var publicTemplate = sensitive ? template : new OperationTemplateVersion { Id = template.Id, Key = template.Key, Version = template.Version, ContentHash = template.ContentHash,
            SchemaJson = OperationSchemas.Serialize(publicSchema), PublishedAt = template.PublishedAt, OrganizationId = template.OrganizationId, PublishedBy = template.PublishedBy };
        return new(200, new OperationDetail(OperationRecordView.From(r), publicTemplate, publicSchema, OperationSchemas.PublicValues(schema, JsonSerializer.Deserialize<JsonElement>(r.ValuesJson), sensitive), activity, revisions, allowed.ToArray(), write && r.Status == "Draft" && (r.RequesterId == user.UserId || admin), admin && policy.AllowDocumentedExceptions));
    }

    private static bool CanTransition(OperationRecord r, string target, OperationSchema schema, OperationPolicy policy) =>
        (!OperationCatalog.IsRecord(schema) && target == "Approved" && r.Status is "Submitted" or "Under Review" && !OperationAdministrationService.NeedsApproval(r, schema, policy)) ||
        OperationWorkflow.CanTransition(r.Status, target, r.ChangeType, OperationCatalog.IsRecord(schema), schema.RequiresApproval);

    public async Task<ApiOperationResult> Revision(Guid org, Guid id, Guid revisionId, CancellationToken token)
    {
        var record = await Find(org, id, token);
        if (record is null) return new(404);
        var revision = await db.OperationRevisions.AsNoTracking().FirstOrDefaultAsync(r => r.OrganizationId == org && r.RecordId == id && r.Id == revisionId, token);
        if (revision is null) return new(404);
        var schema = OperationSchemas.Parse((await db.OperationTemplates.AsNoTracking().SingleAsync(t => t.Id == record.TemplateVersionId, token)).SchemaJson);
        var snapshot = JsonNode.Parse(revision.SnapshotJson)!.AsObject();
        if (snapshot["ValuesJson"] is { } values) snapshot["ValuesJson"] = OperationSchemas.PublicValues(schema, JsonSerializer.Deserialize<JsonElement>(values.GetValue<string>()), await Administration.Sensitive(org)).GetRawText();
        return new(200, new { revision.Id, revision.ActorId, revision.CreatedAt, revision.RevisionToken, SnapshotJson = snapshot.ToJsonString() });
    }

    private async Task<string?> ValidateInput(Guid org, OperationInput input, OperationSchema schema, CancellationToken token)
    {
        if (string.IsNullOrWhiteSpace(input.Title) || input.Title.Length > 200 || input.Description is null || input.Description.Length > 10000 ||
            input.ChangeType is not ("Standard" or "Normal" or "Emergency") || input.Risk is not ("Low" or "Medium" or "High") || input.Priority is not ("Low" or "Medium" or "High")) return "Invalid record fields.";
        foreach (var id in new[] { input.ImplementerId ?? user.UserId, input.OwnerId ?? user.UserId })
            if (!await db.UserOrganizations.AnyAsync(m => m.OrganizationId == org && m.UserId == id && m.User.SystemRole != SystemRole.Client, token)) return "Invalid organization member.";
        if (input.AssetId.HasValue && !await db.Assets.AnyAsync(a => a.OrganizationId == org && a.Id == input.AssetId, token)) return "Invalid related asset.";
        if (input.PlannedEnd < input.PlannedStart || input.ActualEnd < input.ActualStart) return "End must not precede start.";
        if (new[] { input.PlannedStart, input.PlannedEnd, input.ActualStart, input.ActualEnd }.Any(d => d.HasValue && d.Value.Kind != DateTimeKind.Utc)) return "Dates must include the UTC timezone.";
        var errors = OperationSchemas.Validate(schema, input.Values, false);
        return errors.Count == 0 ? null : string.Join(" ", errors.Select(e => e.Key + ": " + e.Value[0]));
    }

    public async Task<ApiOperationResult> Create(Guid org, OperationInput input, CancellationToken token)
    {
        if (!await Active(org) || !await user.HasPermissionAsync(org, "operations", true)) return new(403);
        var template = await db.OperationTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == input.TemplateVersionId && (t.OrganizationId == null || t.OrganizationId == org), token);
        if (template is null) return new(400, "Unknown template version.");
        var schema = OperationSchemas.Parse(template.SchemaJson);
        var rawErrors = OperationSchemas.Validate(schema, input.Values, false);
        if (rawErrors.Count > 0) return new(400, string.Join(" ", rawErrors.Select(e => e.Key + ": " + e.Value[0])));
        var sensitive = await Administration.Sensitive(org);
        if (!sensitive && OperationSchemas.WritesProtected(schema, input.Values)) return new(403);
        input = input with { Values = OperationSchemas.PrepareValues(schema, input.Values, sensitive) };
        var error = await ValidateInput(org, input, schema, token);
        if (error is not null) return new(400, error);
        await using var tx = await db.Database.BeginTransactionAsync(db.Database.IsNpgsql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable, token);
        // Per-organization transaction lock makes sequence allocation safe across server replicas.
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({org.ToString()}, 0))", token);
        if (!await Administration.IsActive(org, template.Key, token) || await db.OperationTemplates.AnyAsync(t => t.Key == template.Key && t.Version > template.Version, token)) return new(409, "Select an active latest template version.");
        var year = DateTime.UtcNow.Year;
        var next = (await db.OperationRecords.IgnoreQueryFilters().Where(r => r.OrganizationId == org && r.Year == year).MaxAsync(r => (int?)r.Sequence, token) ?? 0) + 1;
        var r = new OperationRecord { OrganizationId = org, Year = year, Sequence = next, Number = $"{(OperationCatalog.IsRecord(schema) ? "OPS" : "CHG")}-{year}-{next:0000}", TemplateVersionId = template.Id,
            RequesterId = user.UserId, ModifiedBy = user.UserId, Category = schema.Category ?? (schema.Key.StartsWith("ORG_", StringComparison.Ordinal) ? "E" : schema.Key[..1]) };
        Apply(r, input);
        db.OperationRecords.Add(r);
        await Save(r, "Created", "", token);
        await tx.CommitAsync(token);
        return new(201, new { r.Id }, $"/api/operations/{org}/records/{r.Id}");
    }

    public async Task<ApiOperationResult> Update(Guid org, Guid id, OperationInput input, CancellationToken token)
    {
        var r = await Find(org, id, token);
        if (r is null) return new(404);
        if (!await Write(r)) return new(403);
        if (r.RequesterId != user.UserId && !await Admin(org)) return new(403);
        if (input.RevisionToken != r.RevisionToken) return new(409, "Record changed. Reload before saving.");
        if (r.Status != "Draft") return new(409, "Only drafts can be edited. Execution evidence is recorded with workflow actions.");
        if (input.TemplateVersionId != r.TemplateVersionId) return new(400, "Template version cannot be changed.");
        var template = await db.OperationTemplates.SingleAsync(t => t.Id == r.TemplateVersionId, token);
        var schema = OperationSchemas.Parse(template.SchemaJson);
        var rawErrors = OperationSchemas.Validate(schema, input.Values, false);
        if (rawErrors.Count > 0) return new(400, string.Join(" ", rawErrors.Select(e => e.Key + ": " + e.Value[0])));
        var sensitive = await Administration.Sensitive(org);
        if (!sensitive && OperationSchemas.WritesProtected(schema, input.Values)) return new(403);
        input = input with { Values = OperationSchemas.PrepareValues(schema, input.Values, sensitive, JsonSerializer.Deserialize<JsonElement>(r.ValuesJson)) };
        var error = await ValidateInput(org, input, schema, token);
        if (error is not null) return new(400, error);
        Apply(r, input);
        return await SaveResult(r, "DraftSaved", r.Status, token);
    }

    public async Task<ApiOperationResult> Transition(Guid org, Guid id, OperationTransition input, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(db.Database.IsNpgsql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable, token);
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({org.ToString()}, 0))", token);
        var r = await Find(org, id, token);
        if (r is null) return new(404);
        if (input.RevisionToken != r.RevisionToken) return new(409, "Record changed. Reload before acting.");
        if (input.Reason is null || input.Reason.Length > 4000 || input.ExceptionReason is null || input.ExceptionReason.Length > 4000) return new(400, "Invalid reason.");
        if (OperationWorkflow.Administrative(input.Target) ? !await Admin(org) : !await Write(r)) return new(403);
        var policy = await Administration.Policy(org, token);
        var exception = policy.AllowDocumentedExceptions && await Admin(org) && !string.IsNullOrWhiteSpace(input.ExceptionReason);
        var previous = r.Status;
        if (input.Target == "RetrospectiveReview")
        {
            if (!r.EmergencyBypassed || r.RetrospectiveReviewed || r.Status is "Closed" or "Archived" || string.IsNullOrWhiteSpace(input.Reason)) return new(409, "Retrospective review requires an open emergency and a reason.");
            if ((r.RequesterId == user.UserId || r.ImplementerId == user.UserId) && !exception) return new(403, "Review requires an independent administrator or documented policy exception.");
            r.RetrospectiveReviewed = true;
        }
        else
        {
            var template = await db.OperationTemplates.SingleAsync(t => t.Id == r.TemplateVersionId, token);
            var schema = OperationSchemas.Parse(template.SchemaJson);
            if (!CanTransition(r, input.Target, schema, policy)) return new(409, "Invalid workflow transition.");
            if (!OperationCatalog.IsRecord(schema) && input.Target is "Submitted" or "In Progress" && r.Risk == "High" && policy.SeparateHighRiskDuties && r.RequesterId == r.ImplementerId && !exception) return new(400, "High-risk changes require a separate requester and implementer or an administrator policy exception.");
            if (input.Target == "Submitted")
            {
                var errors = OperationSchemas.Validate(OperationSchemas.Parse(template.SchemaJson), JsonSerializer.Deserialize<JsonElement>(r.ValuesJson), true);
                if (errors.Count != 0) return new(400, string.Join(" ", errors.Select(e => e.Key + ": " + e.Value[0])));
            }
            if (input.Target == "Approved" && OperationAdministrationService.NeedsApproval(r, schema, policy) && (r.RequesterId == user.UserId || r.ImplementerId == user.UserId) && !OperationAdministrationService.CanSelfApprove(r, policy) && !exception) return new(403, "Self-approval is disabled; an independent administrator must approve or document an enabled policy exception.");
            if (input.Target is "Rejected" or "Failed" or "Rolled Back" or "Completed" or "Closed" && string.IsNullOrWhiteSpace(input.Reason)) return new(400, "A decision/result reason is required.");
            if (input.Target == "Scheduled" && (r.PlannedStart is null || r.PlannedEnd is null)) return new(400, "A planned start and end are required.");
            if (input.Target == "In Progress" && r.Status is not ("Approved" or "Scheduled"))
            {
                if (string.IsNullOrWhiteSpace(input.Reason)) return new(400, "An emergency bypass reason is required.");
                var errors = OperationSchemas.Validate(OperationSchemas.Parse(template.SchemaJson), JsonSerializer.Deserialize<JsonElement>(r.ValuesJson), true);
                if (errors.Count > 0) return new(400, "Complete the template before emergency execution.");
                r.EmergencyBypassed = true;
            }
            if (input.Target == "Closed" && r.EmergencyBypassed && !r.RetrospectiveReviewed) return new(409, "An independent retrospective review is required before closure.");
            if (input.Target == "In Progress") r.ActualStart ??= DateTime.UtcNow;
            if (input.Target is "Completed" or "Failed" or "Rolled Back") r.ActualEnd ??= DateTime.UtcNow;
            if (input.Target == "Closed") r.ClosedAt = DateTime.UtcNow;
            r.Status = input.Target;
        }
        if (exception) db.OperationActivities.Add(new() { OrganizationId = org, RecordId = r.Id, ActorId = user.UserId, EventType = "PolicyException", FromStatus = previous, ToStatus = r.Status });
        var decisionNotes = input.Reason + (exception ? "\nPolicy exception: " + input.ExceptionReason : "");
        // Reasons are document content and revisions, not audit diffs. Rendered only as encoded text.
        var saved = await SaveResult(r, input.Target, previous, token, decisionNotes, policy);
        if (saved.StatusCode == 200) await transaction.CommitAsync(token);
        return saved;
    }

    private static void Apply(OperationRecord r, OperationInput i)
    {
        r.Title = i.Title.Trim(); r.Description = i.Description; r.ValuesJson = i.Values.GetRawText();
        r.ChangeType = i.ChangeType; r.Risk = i.Risk; r.Priority = i.Priority;
        r.ImplementerId = i.ImplementerId ?? r.RequesterId; r.OwnerId = i.OwnerId ?? r.RequesterId; r.AssetId = i.AssetId;
        r.PlannedStart = i.PlannedStart; r.PlannedEnd = i.PlannedEnd; r.ActualStart = i.ActualStart; r.ActualEnd = i.ActualEnd;
    }

    private async Task<ApiOperationResult> SaveResult(OperationRecord r, string action, string previous, CancellationToken token, string reason = "", OperationPolicy? policy = null)
    {
        try { await Save(r, action, previous, token, reason, policy); return new(200, new { r.Id, r.RevisionToken }); }
        catch (DbUpdateConcurrencyException) { return new(409, "Record changed. Reload before acting."); }
    }

    private async Task Save(OperationRecord r, string action, string previous, CancellationToken token, string reason = "", OperationPolicy? policy = null)
    {
        r.RevisionToken = Guid.NewGuid(); r.ModifiedAt = DateTime.UtcNow; r.ModifiedBy = user.UserId;
        db.OperationRevisions.Add(new() { OrganizationId = r.OrganizationId, RecordId = r.Id, RevisionToken = r.RevisionToken, ActorId = user.UserId,
            SnapshotJson = JsonSerializer.Serialize(new { r.Title, r.Description, r.Number, r.Status, r.ValuesJson, r.TemplateVersionId, r.AssetId, r.RequesterId, r.ImplementerId, r.OwnerId, r.ChangeType, r.Risk, r.Priority,
                r.PlannedStart, r.PlannedEnd, r.ActualStart, r.ActualEnd, r.ClosedAt, r.EmergencyBypassed, r.RetrospectiveReviewed, Reason = reason, Policy = policy }) });
        db.OperationActivities.Add(new() { OrganizationId = r.OrganizationId, RecordId = r.Id, ActorId = user.UserId, EventType = action, FromStatus = previous, ToStatus = r.Status });
        await db.SaveChangesAsync(token);
    }
}
