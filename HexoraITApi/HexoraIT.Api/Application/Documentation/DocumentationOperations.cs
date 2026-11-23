using System.Text.Json;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Dtos;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.Documentation;

public sealed partial class DocumentationService
{
    private async Task<List<DocumentationRecord>> ReadOperationsAsync(Guid org, DocumentationSelectionDto selection,
        DocumentationRequestDto options, CancellationToken token)
    {
        var query = db.OperationRecords.AsNoTracking().Where(r => r.OrganizationId == org);
        if (selection.ItemIds is not null) query = query.Where(r => selection.ItemIds.Contains(r.Id));
        var items = await query.OrderBy(r => r.Number).ThenBy(r => r.Id).Take(DocumentationCatalog.MaxRecords + 1).ToListAsync(token);
        if (items.Count > DocumentationCatalog.MaxRecords) throw new DocumentationTooLargeException();
        var templateIds = items.Select(r => r.TemplateVersionId).Distinct().ToArray();
        var templates = await db.OperationTemplates.AsNoTracking().Where(t => templateIds.Contains(t.Id) &&
            (t.OrganizationId == null || t.OrganizationId == org)).ToDictionaryAsync(t => t.Id, token);
        var actorIds = items.SelectMany(r => new[] { r.RequesterId, r.ImplementerId, r.OwnerId }).Distinct().ToArray();
        var actors = await db.UserOrganizations.Where(m => m.OrganizationId == org && actorIds.Contains(m.UserId))
            .Select(m => new { m.UserId, m.User.DisplayName }).ToDictionaryAsync(m => m.UserId, m => m.DisplayName, token);
        var assetIds = items.Where(r => r.AssetId.HasValue).Select(r => r.AssetId!.Value).Distinct().ToArray();
        var assets = await db.Assets.AsNoTracking().Where(a => a.OrganizationId == org && assetIds.Contains(a.Id))
            .ToDictionaryAsync(a => a.Id, a => a.Name, token);
        var sensitive = await new OperationAdministrationService(db, user).Sensitive(org);
        var pl = options.Language == "pl";
        string Label(OperationLabel label) => pl ? label.Pl : label.En;
        string Actor(Guid id) => actors.GetValueOrDefault(id, id.ToString());
        var records = new List<DocumentationRecord>();
        foreach (var item in items)
        {
            // A missing/foreign template must not result in exporting an unrelated definition.
            if (!templates.TryGetValue(item.TemplateVersionId, out var template)) continue;
            var original = OperationSchemas.Parse(template.SchemaJson);
            var schema = OperationSchemas.PublicSchema(original, sensitive);
            var values = OperationSchemas.PublicValues(original, JsonSerializer.Deserialize<JsonElement>(item.ValuesJson), sensitive);
            var fields = new List<DocumentationField>
            {
                F("Number", item.Number), new("Status", item.Status, true),
                F("Template", $"{schema.Key} · {Label(schema.Name)} · v{template.Version}"),
                F("Created", item.CreatedAt), F("Updated", item.ModifiedAt), F("Requester", Actor(item.RequesterId)),
                F("Revision", item.RevisionToken), F("Planned start", item.PlannedStart), F("Planned end", item.PlannedEnd),
                F("Actual start", item.ActualStart), F("Actual end", item.ActualEnd), F("Closed", item.ClosedAt)
            };
            if (schema.Key != "BASIC") fields.AddRange([F("Implementer", Actor(item.ImplementerId)), F("Owner", Actor(item.OwnerId)),
                new("Risk", item.Risk, true), new("Priority", item.Priority, true)]);
            if (item.AssetId is { } assetId && assets.TryGetValue(assetId, out var asset)) fields.Add(F("Related asset", asset));
            var record = new DocumentationRecord(item.Id, $"{item.Number} — {item.Title}", fields.Where(f => f.Value.Length > 0).ToList(), []);
            Text(record, "Description", item.Description);
            foreach (var field in schema.Fields)
            {
                if (field.Sensitivity == "Secret" || !OperationSchemas.Visible(field.VisibleWhen, values, values) ||
                    !values.TryGetProperty(field.Key, out var value) || value.ValueKind == JsonValueKind.Null) continue;
                if (field.Type == "table")
                {
                    var index = 0;
                    foreach (var row in value.EnumerateArray())
                    {
                        var lines = field.Fields!.Where(f => f.Sensitivity != "Secret" && row.TryGetProperty(f.Key, out _) && OperationSchemas.Visible(f.VisibleWhen, row, values))
                            .Select(f => $"{Label(f.Label)}: {Display(row.GetProperty(f.Key))}");
                        Text(record, $"{Label(field.Label)} · {++index}", string.Join("\n", lines));
                    }
                }
                else Text(record, Label(field.Label), Display(value));
            }
            records.Add(record);
        }
        return records;

        string Display(JsonElement value) => value.ValueKind switch
        {
            JsonValueKind.True => DocumentationLabels.Get("Yes", pl),
            JsonValueKind.False => DocumentationLabels.Get("No", pl),
            JsonValueKind.Array => string.Join(", ", value.EnumerateArray().Select(Display)),
            _ => value.ToString()
        };
    }
}
