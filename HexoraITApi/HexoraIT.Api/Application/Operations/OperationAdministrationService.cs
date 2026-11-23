using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Text;
using System.Text.Json;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.Operations;

public sealed record OperationTemplateView(Guid Id, string Key, int Version, string ContentHash, string SchemaJson,
    DateTime PublishedAt, Guid? OrganizationId, bool Active, Guid SettingToken);
public sealed record OperationTemplatePublish(Guid? ExpectedVersionId, [Required, StringLength(128000)] string SchemaJson);
public sealed record OperationTemplateActivation(Guid RevisionToken, bool Active);
public sealed record OperationPolicyInput(Guid RevisionToken, bool StandardPreApproved = false, bool RequireLowRiskApproval = true,
    bool RequireNormalApproval = true, bool SeparateHighRiskDuties = true, bool AllowLowRiskSelfApproval = false,
    bool AllowDocumentedExceptions = false, int RetentionDays = 2555, string ReportingRulesJson = "{}");
public sealed record OperationSettingsView(OperationPolicy Policy, bool CanManage);

public sealed class OperationAdministrationService(AppDbContext db, ICurrentUserContext user)
{
    public async Task<bool> CanManage(Guid org) => await user.GetRoleAsync(org) is >= OrgRole.Admin &&
        await user.HasPermissionAsync(org, "operations", true) && await db.Organizations.AnyAsync(o => o.Id == org && !o.IsArchived);
    public async Task<bool> Sensitive(Guid org) => await user.GetRoleAsync(org) is >= OrgRole.Admin && await user.HasPermissionAsync(org, "operations");
    public async Task<OperationPolicy> Policy(Guid org, CancellationToken token = default) =>
        await db.OperationPolicies.AsNoTracking().FirstOrDefaultAsync(p => p.OrganizationId == org, token) ??
        new() { OrganizationId = org, RevisionToken = Guid.Empty, ModifiedAt = DateTime.UnixEpoch };
    public async Task<bool> IsActive(Guid org, string key, CancellationToken token) =>
        !await db.OperationTemplateSettings.AnyAsync(s => s.OrganizationId == org && s.TemplateKey == key && !s.Active, token);
    public static bool NeedsApproval(OperationRecord record, OperationSchema schema, OperationPolicy policy) =>
        OperationCatalog.IsRecord(schema) ? schema.RequiresApproval : schema.RequiresApproval || record.Risk == "High" ||
        (record.ChangeType == "Standard" ? !policy.StandardPreApproved : record.Risk == "Low" ? policy.RequireLowRiskApproval : policy.RequireNormalApproval);
    public static bool CanSelfApprove(OperationRecord record, OperationPolicy policy) => record.Risk == "Low" && policy.AllowLowRiskSelfApproval;

    public async Task<ApiOperationResult> Templates(Guid org, CancellationToken token)
    {
        if (!await user.HasPermissionAsync(org, "operations")) return new(403);
        var templates = await db.OperationTemplates.AsNoTracking().Where(t => t.OrganizationId == null || t.OrganizationId == org)
            .OrderBy(t => t.Key).ThenByDescending(t => t.Version).ToListAsync(token);
        var settings = await db.OperationTemplateSettings.AsNoTracking().Where(s => s.OrganizationId == org).ToDictionaryAsync(s => s.TemplateKey, token);
        var sensitive = await Sensitive(org);
        return new(200, templates.Select(t => new OperationTemplateView(t.Id, t.Key, t.Version, t.ContentHash, sensitive ? t.SchemaJson : OperationSchemas.Serialize(OperationSchemas.PublicSchema(OperationSchemas.Parse(t.SchemaJson), false)), t.PublishedAt, t.OrganizationId,
            !settings.TryGetValue(t.Key, out var setting) || setting.Active, settings.GetValueOrDefault(t.Key)?.RevisionToken ?? Guid.Empty)).ToList());
    }

    public async Task<ApiOperationResult> Clone(Guid org, Guid sourceId, CancellationToken token)
    {
        if (!await CanManage(org)) return new(403);
        var source = await db.OperationTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == sourceId && (t.OrganizationId == null || t.OrganizationId == org), token);
        if (source is null) return new(404);
        var schema = OperationSchemas.Parse(source.SchemaJson);
        return await Publish(org, null, new(null, OperationSchemas.Serialize(OrganizationCopy(schema))), token);
    }

    // Import creates an organization-owned key. Client-supplied organization/publisher metadata is never used.
    public async Task<ApiOperationResult> Import(Guid org, OperationTemplatePublish input, CancellationToken token)
    {
        if (!await CanManage(org)) return new(403);
        try
        {
            var schema = OperationSchemas.Parse(input.SchemaJson);
            return await Publish(org, null, new(null, OperationSchemas.Serialize(OrganizationCopy(schema))), token);
        }
        catch (Exception ex) when (ex is ArgumentException or JsonException) { return new(400, ex.Message); }
    }

    public async Task<ApiOperationResult> Publish(Guid org, string? key, OperationTemplatePublish input, CancellationToken token)
    {
        if (!await CanManage(org)) return new(403);
        OperationSchema schema;
        try { schema = OperationSchemas.Parse(input.SchemaJson); }
        catch (Exception ex) when (ex is ArgumentException or JsonException) { return new(400, ex.Message); }
        if (!schema.Key.StartsWith("ORG_", StringComparison.Ordinal) || key is not null && schema.Key != key) return new(400, "Organization template key cannot be changed.");
        await using var tx = await db.Database.BeginTransactionAsync(db.Database.IsNpgsql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable, token);
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({org.ToString()}, 0))", token);
        var previous = await db.OperationTemplates.AsNoTracking().Where(t => t.Key == schema.Key).OrderByDescending(t => t.Version).FirstOrDefaultAsync(token);
        if (key is not null && (previous is null || previous.OrganizationId != org)) return new(404);
        if (previous is not null && previous.OrganizationId != org) return new(404);
        if (input.ExpectedVersionId != previous?.Id) return new(409, "The template changed. Reload its latest version.");
        var json = OperationSchemas.Serialize(schema);
        var hash = OperationSchemas.Hash(json);
        if (previous?.ContentHash == hash) return new(200, new { previous.Id, previous.Key, previous.Version });
        // Reusing an older definition is a no-op, never mutation of an immutable published version.
        if (await db.OperationTemplates.AnyAsync(t => t.Key == schema.Key && t.ContentHash == hash, token)) return new(409, "This definition was already published; clone it before reuse.");
        var version = new OperationTemplateVersion { OrganizationId = org, PublishedBy = user.UserId, Key = schema.Key,
            Version = (previous?.Version ?? 0) + 1, SchemaJson = json, ContentHash = hash };
        db.OperationTemplates.Add(version);
        Audit(org, new { Action = "TemplatePublished", version.Id, version.Key, version.Version, version.ContentHash });
        await db.SaveChangesAsync(token); await tx.CommitAsync(token);
        return new(201, new { version.Id, version.Key, version.Version });
    }

    public async Task<ApiOperationResult> Activate(Guid org, string key, OperationTemplateActivation input, CancellationToken token)
    {
        if (!await CanManage(org)) return new(403);
        if (!await db.OperationTemplates.AnyAsync(t => t.Key == key && (t.OrganizationId == null || t.OrganizationId == org), token)) return new(404);
        await using var tx = await db.Database.BeginTransactionAsync(db.Database.IsNpgsql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable, token);
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({org.ToString()}, 0))", token);
        var setting = await db.OperationTemplateSettings.FirstOrDefaultAsync(s => s.OrganizationId == org && s.TemplateKey == key, token);
        if (input.RevisionToken != (setting?.RevisionToken ?? Guid.Empty)) return new(409, "Template availability changed. Reload.");
        if (setting is null) { setting = new() { OrganizationId = org, TemplateKey = key }; db.OperationTemplateSettings.Add(setting); }
        setting.Active = input.Active; setting.ModifiedAt = DateTime.UtcNow; setting.ModifiedBy = user.UserId; setting.RevisionToken = Guid.NewGuid();
        Audit(org, new { Action = "TemplateAvailability", TemplateKey = key, input.Active });
        try { await db.SaveChangesAsync(token); await tx.CommitAsync(token); return new(200, new { setting.RevisionToken }); }
        catch (DbUpdateConcurrencyException) { return new(409, "Template availability changed. Reload."); }
    }

    public async Task<ApiOperationResult> Settings(Guid org, CancellationToken token)
    {
        if (!await user.HasPermissionAsync(org, "operations")) return new(403);
        return new(200, new OperationSettingsView(await Policy(org, token), await CanManage(org)));
    }

    public async Task<ApiOperationResult> SavePolicy(Guid org, OperationPolicyInput input, CancellationToken token)
    {
        if (!await CanManage(org)) return new(403);
        if (input.RetentionDays is < 1 or > 36500 || input.ReportingRulesJson is null || Encoding.UTF8.GetByteCount(input.ReportingRulesJson) > 16000) return new(400, "Invalid retention/reporting policy.");
        try
        {
            using var rules = JsonDocument.Parse(input.ReportingRulesJson, new JsonDocumentOptions { MaxDepth = 8 });
            if (rules.RootElement.ValueKind is not (JsonValueKind.Object or JsonValueKind.Array)) return new(400, "Reporting rules must be structured JSON data.");
        }
        catch (JsonException) { return new(400, "Invalid reporting rules JSON."); }
        await using var tx = await db.Database.BeginTransactionAsync(db.Database.IsNpgsql() ? IsolationLevel.ReadCommitted : IsolationLevel.Serializable, token);
        if (db.Database.IsNpgsql()) await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock(hashtextextended({org.ToString()}, 0))", token);
        var policy = await db.OperationPolicies.FirstOrDefaultAsync(p => p.OrganizationId == org, token);
        if (input.RevisionToken != (policy?.RevisionToken ?? Guid.Empty)) return new(409, "Organization policy changed. Reload.");
        if (policy is null) { policy = new() { OrganizationId = org }; db.OperationPolicies.Add(policy); }
        policy.StandardPreApproved = input.StandardPreApproved; policy.RequireLowRiskApproval = input.RequireLowRiskApproval;
        policy.RequireNormalApproval = input.RequireNormalApproval; policy.SeparateHighRiskDuties = input.SeparateHighRiskDuties;
        policy.AllowLowRiskSelfApproval = input.AllowLowRiskSelfApproval; policy.AllowDocumentedExceptions = input.AllowDocumentedExceptions;
        policy.RetentionDays = input.RetentionDays; policy.ReportingRulesJson = input.ReportingRulesJson;
        policy.ModifiedAt = DateTime.UtcNow; policy.ModifiedBy = user.UserId; policy.RevisionToken = Guid.NewGuid();
        Audit(org, new { Action = "PolicyUpdated", Policy = policy });
        try { await db.SaveChangesAsync(token); await tx.CommitAsync(token); return new(200, policy); }
        catch (DbUpdateConcurrencyException) { return new(409, "Organization policy changed. Reload."); }
    }

    public async Task<ApiOperationResult> Members(Guid org, CancellationToken token)
    {
        if (!await user.HasPermissionAsync(org, "operations")) return new(403);
        return new(200, await db.UserOrganizations.AsNoTracking().Where(m => m.OrganizationId == org && m.User.SystemRole != SystemRole.Client)
            .OrderBy(m => m.User.DisplayName).ThenBy(m => m.UserId).Take(250).Select(m => new { Id = m.UserId, Name = m.User.DisplayName }).ToListAsync(token));
    }
    private void Audit(Guid org, object data) => db.OperationPolicyRevisions.Add(new() { OrganizationId = org, ActorId = user.UserId, SnapshotJson = JsonSerializer.Serialize(data) });
    private static OperationSchema OrganizationCopy(OperationSchema schema) => schema with
    {
        Key = "ORG_" + Guid.NewGuid().ToString("N").ToUpperInvariant(), Kind = OperationCatalog.IsRecord(schema) ? "Record" : "Change",
        ValidationProfile = schema.Key == "D02" ? "RestoreTest" : schema.ValidationProfile,
        Category = schema.Category ?? (schema.Key[0] is >= 'A' and <= 'F' ? schema.Key[..1] : "E")
    };
}
