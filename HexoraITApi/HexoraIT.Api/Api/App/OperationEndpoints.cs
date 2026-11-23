using System.Text.Json;
using HexoraITApi.Application;
using HexoraITApi.Application.Operations;
using HexoraITApi.Application.Documentation;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Api.App;

public static class OperationEndpoints
{
    public static IEndpointRouteBuilder MapOperationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/operations/{organizationId:guid}").WithTags("IT Operations & Changes").RequireAuthorization();
        group.MapGet("/templates", async (Guid organizationId, OperationService service, CancellationToken token) =>
            (await service.Templates(organizationId, token)).ToHttpResult());
        group.MapPost("/templates/{id:guid}/clone", async (Guid organizationId, Guid id, OperationAdministrationService service, CancellationToken token) =>
            (await service.Clone(organizationId, id, token)).ToHttpResult());
        group.MapPost("/templates/import", async (Guid organizationId, OperationTemplatePublish input, OperationAdministrationService service, CancellationToken token) =>
            (await service.Import(organizationId, input, token)).ToHttpResult()).AddEndpointFilter<DataAnnotationsValidationFilter<OperationTemplatePublish>>();
        group.MapPost("/templates/validate", async (Guid organizationId, OperationTemplatePublish input, OperationAdministrationService service) =>
        {
            if (!await service.CanManage(organizationId)) return Results.Forbid();
            try { return Results.Ok(OperationSchemas.Parse(input.SchemaJson)); }
            catch (Exception ex) when (ex is ArgumentException or JsonException) { return Results.BadRequest(ex.Message); }
        }).AddEndpointFilter<DataAnnotationsValidationFilter<OperationTemplatePublish>>();
        group.MapPost("/templates/{key}/versions", async (Guid organizationId, string key, OperationTemplatePublish input, OperationAdministrationService service, CancellationToken token) =>
            (await service.Publish(organizationId, key, input, token)).ToHttpResult()).AddEndpointFilter<DataAnnotationsValidationFilter<OperationTemplatePublish>>();
        group.MapPut("/templates/{key}/activation", async (Guid organizationId, string key, OperationTemplateActivation input, OperationAdministrationService service, CancellationToken token) =>
            (await service.Activate(organizationId, key, input, token)).ToHttpResult());
        group.MapGet("/settings", async (Guid organizationId, OperationAdministrationService service, CancellationToken token) =>
            (await service.Settings(organizationId, token)).ToHttpResult());
        group.MapPut("/settings", async (Guid organizationId, OperationPolicyInput input, OperationAdministrationService service, CancellationToken token) =>
            (await service.SavePolicy(organizationId, input, token)).ToHttpResult());
        group.MapGet("/members", async (Guid organizationId, OperationAdministrationService service, CancellationToken token) =>
            (await service.Members(organizationId, token)).ToHttpResult());
        group.MapGet("/records", async (Guid organizationId, string? search, string? status, string? risk, string? type, Guid? assetId,
            Guid? requester, Guid? implementer, string? category, DateTime? from, DateTime? to, string? sort, int? page, int? pageSize, bool? pendingApprovals, OperationService service, CancellationToken token) =>
            (await service.List(organizationId, search, status, risk, type, assetId, requester, implementer, category, from, to, sort, page ?? 1, pageSize ?? 25, token, pendingApprovals ?? false)).ToHttpResult());
        group.MapGet("/records/{id:guid}", async (Guid organizationId, Guid id, OperationService service, CancellationToken token) =>
            (await service.Detail(organizationId, id, token)).ToHttpResult());
        group.MapPost("/records", async (Guid organizationId, OperationInput input, OperationService service, CancellationToken token) =>
            (await service.Create(organizationId, input, token)).ToHttpResult()).AddEndpointFilter<DataAnnotationsValidationFilter<OperationInput>>();
        group.MapPut("/records/{id:guid}", async (Guid organizationId, Guid id, OperationInput input, OperationService service, CancellationToken token) =>
            (await service.Update(organizationId, id, input, token)).ToHttpResult()).AddEndpointFilter<DataAnnotationsValidationFilter<OperationInput>>();
        group.MapPost("/records/{id:guid}/transitions", async (Guid organizationId, Guid id, OperationTransition input, OperationService service, CancellationToken token) =>
            (await service.Transition(organizationId, id, input, token)).ToHttpResult()).AddEndpointFilter<DataAnnotationsValidationFilter<OperationTransition>>();
        group.MapGet("/records/{id:guid}/revisions/{revisionId:guid}", async (Guid organizationId, Guid id, Guid revisionId, OperationService service, CancellationToken token) =>
            (await service.Revision(organizationId, id, revisionId, token)).ToHttpResult());
        group.MapGet("/records/{id:guid}/pdf", Export);
        return endpoints;
    }

    public static async Task<IResult> Export(Guid organizationId, Guid id, string? language, OperationService service,
        AppDbContext db, IDocumentationPdfRenderer renderer, CancellationToken token)
    {
        if (language is not (null or "en" or "pl")) return Results.BadRequest("Unsupported language.");
        var detail = await service.Detail(organizationId, id, token);
        if (detail.Value is not OperationDetail d) return detail.ToHttpResult();
        if (d.Record.Status == "Draft") return Results.Conflict("Submit the record before exporting.");
        var pl = language != "en";
        string Label(OperationLabel l) => pl ? l.Pl : l.En;
        string T(string text) => pl && Polish.TryGetValue(text, out var translated) ? translated : text;
        var r = d.Record;
        var actorIds = new[] { r.RequesterId, r.ImplementerId, r.OwnerId }.Concat(d.Activity.Select(a => a.ActorId)).Distinct().ToArray();
        var actors = await db.UserOrganizations.Where(m => m.OrganizationId == organizationId && actorIds.Contains(m.UserId))
            .Select(m => new { m.UserId, m.User.DisplayName }).ToDictionaryAsync(m => m.UserId, m => m.DisplayName, token);
        string Actor(Guid actor) => actors.GetValueOrDefault(actor, actor.ToString());
        var fields = new List<DocumentationField> {
            new("Number", r.Number), new("Status", r.Status), new("Template", $"{d.Schema.Key} · {Label(d.Schema.Name)} · v{d.Template.Version}"),
            new("Created UTC", r.CreatedAt.ToString("O")), new("Modified UTC", r.ModifiedAt.ToString("O")), new("Requester", Actor(r.RequesterId)),
            new("Implementer", Actor(r.ImplementerId)), new("Owner", Actor(r.OwnerId)), new("Risk", r.Risk), new("Type", r.ChangeType), new("Priority", r.Priority),
            new("Revision", r.RevisionToken.ToString()), new("Planned start UTC", r.PlannedStart?.ToString("O") ?? ""), new("Planned end UTC", r.PlannedEnd?.ToString("O") ?? ""),
            new("Actual start UTC", r.ActualStart?.ToString("O") ?? ""), new("Actual end UTC", r.ActualEnd?.ToString("O") ?? "") };
        if (r.AssetId.HasValue)
        {
            var asset = await db.Assets.AsNoTracking().FirstOrDefaultAsync(a => a.Id == r.AssetId && a.OrganizationId == organizationId, token);
            // Individual asset permissions remain effective in exports.
            fields.Add(new("Asset reference", asset is null ? r.AssetId.Value.ToString() : $"{asset.Name} ({asset.Id})"));
        }
        fields = fields.Where(f => !string.IsNullOrWhiteSpace(f.Value)).Select(f => new DocumentationField(T(f.Label), f.Label is "Status" or "Risk" or "Type" or "Priority" ? T(f.Value) : f.Value)).ToList();
        var texts = new List<DocumentationText> { new(T("Description"), r.Description) };
        var rows = new List<DocumentationRecord>();
        foreach (var field in d.Schema.Fields)
        {
            if (field.Sensitivity == "Secret" || !OperationSchemas.Visible(field.VisibleWhen, d.Values, d.Values)) continue;
            if (!d.Values.TryGetProperty(field.Key, out var value) || value.ValueKind == JsonValueKind.Null) continue;
            if (field.Type == "table")
            {
                var index = 0;
                foreach (var row in value.EnumerateArray())
                    rows.Add(new(Guid.NewGuid(), $"{Label(field.Label)} · {++index}", field.Fields!.Where(f => row.TryGetProperty(f.Key, out _))
                        .Where(f => f.Sensitivity != "Secret" && OperationSchemas.Visible(f.VisibleWhen, row, d.Values)).Select(f => new DocumentationField(Label(f.Label), row.GetProperty(f.Key).ToString())).ToList(), []));
            }
            else if (!string.IsNullOrWhiteSpace(value.ToString())) texts.Add(new(Label(field.Label), value.ToString()));
        }
        var records = new List<DocumentationRecord> { new(r.Id, r.Title, fields, texts) };
        records.AddRange(rows);
        foreach (var activity in d.Activity)
        {
            records.Add(new(activity.Id, T(activity.EventType), [new(T("Actor"), Actor(activity.ActorId)), new("UTC", activity.OccurredAt.ToString("yyyy-MM-dd HH:mm:ss")), new(T("From"), T(activity.FromStatus)), new(T("To"), T(activity.ToStatus))], []));
        }
        var revisions = await db.OperationRevisions.AsNoTracking().Where(v => v.RecordId == id && v.OrganizationId == organizationId).OrderBy(v => v.CreatedAt).ToListAsync(token);
        foreach (var revision in revisions)
        {
            using var snapshot = JsonDocument.Parse(revision.SnapshotJson);
            if (snapshot.RootElement.TryGetProperty("Reason", out var reason) && !string.IsNullOrWhiteSpace(reason.GetString()))
                records.Add(new(revision.Id, $"{revision.CreatedAt:yyyy-MM-dd HH:mm} UTC · {Actor(revision.ActorId)}", [], [new(T("Decision / execution notes"), reason.GetString()!)]));
        }
        var orgName = await db.Organizations.Where(o => o.Id == organizationId).Select(o => o.Name).SingleAsync(token);
        var snapshotPdf = new DocumentationSnapshot(orgName, "", Actor(r.RequesterId), DateTime.UtcNow,
            new DocumentationRequestDto([], Title: r.Title, Language: language ?? "pl"), [new(T("IT Operations & Changes"), records)]);
        var content = await renderer.RenderAsync(snapshotPdf, token);
        return Results.File(content, "application/pdf", r.Number + ".pdf");
    }

    private static readonly Dictionary<string, string> Polish = new()
    {
        ["IT Operations & Changes"] = "Operacje i zmiany IT", ["Number"] = "Numer", ["Status"] = "Status", ["Template"] = "Szablon",
        ["Created UTC"] = "Utworzono UTC", ["Modified UTC"] = "Zmodyfikowano UTC", ["Requester"] = "Wnioskodawca", ["Implementer"] = "Wykonawca",
        ["Owner"] = "Właściciel", ["Risk"] = "Ryzyko", ["Type"] = "Typ", ["Priority"] = "Priorytet", ["Revision"] = "Wersja",
        ["Planned start UTC"] = "Planowany początek UTC", ["Planned end UTC"] = "Planowany koniec UTC", ["Actual start UTC"] = "Rzeczywisty początek UTC", ["Actual end UTC"] = "Rzeczywisty koniec UTC",
        ["Asset reference"] = "Powiązany zasób", ["Description"] = "Opis", ["Actor"] = "Użytkownik", ["From"] = "Ze stanu", ["To"] = "Do stanu",
        ["Decision / execution notes"] = "Uwagi do decyzji / wykonania", ["Draft"] = "Szkic", ["Submitted"] = "Wysłany", ["Under Review"] = "W trakcie przeglądu",
        ["Awaiting Approval"] = "Oczekuje na zatwierdzenie", ["Approved"] = "Zatwierdzony", ["Scheduled"] = "Zaplanowany", ["In Progress"] = "W realizacji",
        ["Verification"] = "Weryfikacja", ["Completed"] = "Ukończony", ["Closed"] = "Zamknięty", ["Rejected"] = "Odrzucony", ["Cancelled"] = "Anulowany",
        ["Failed"] = "Niepowodzenie", ["Rolled Back"] = "Wycofany", ["Archived"] = "Zarchiwizowany", ["Created"] = "Utworzono", ["DraftSaved"] = "Zapisano szkic",
        ["RetrospectiveReview"] = "Przegląd po zmianie awaryjnej", ["Low"] = "Niskie", ["Medium"] = "Średnie", ["High"] = "Wysokie",
        ["Standard"] = "Standardowa", ["Normal"] = "Zwykła", ["Emergency"] = "Awaryjna"
    };
}
