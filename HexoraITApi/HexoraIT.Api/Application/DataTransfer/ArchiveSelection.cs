using System.Text.Json;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;

namespace HexoraITApi.Application.DataTransfer;

internal static class ArchiveSelection
{
    public static readonly string[] Sections = ["assets", "networks", "passwords", "licenses", "contacts", "contracts", "knowledge",
        "projects", "tasks", "plans", "incidents", "groups", "warranty", "files", "diagram"];

    public static async Task<List<ImportedRecord>> LoadAsync(AppDbContext db, Guid orgId, ArchiveExportRequest request, CancellationToken token)
    {
        var sections = request.Sections ?? Sections.ToList();
        if (sections.Count == 0 || sections.Count > Sections.Length || sections.Distinct().Count() != sections.Count || sections.Any(s => !Sections.Contains(s)))
            throw new ArchiveValidationException("Select at least one valid export section.");
        if (request.FileIds is { } files && (files.Count > ArchiveSchema.MaxFiles || files.Any(id => id == Guid.Empty) || files.Distinct().Count() != files.Count || !sections.Contains("files")))
            throw new ArchiveValidationException("Invalid file selection.");
        var selected = new Dictionary<(string Kind, Guid Id), ImportedRecord>();
        long bytes = 0;
        async Task Load(string kind, IReadOnlyCollection<Guid>? ids = null)
        {
            if (ids?.Count == 0) return;
            var schema = ArchiveSchema.Entities.Single(s => s.Kind == kind);
            var found = new HashSet<Guid>();
            await foreach (var entity in schema.Load(db, orgId, ids, token))
            {
                var id = (Guid)schema.Property("Id").GetValue(entity)!;
                found.Add(id);
                if (selected.ContainsKey((kind, id))) continue;
                if (!request.IncludeAttachments)
                    switch (entity)
                    {
                        case Contract c: c.DocumentName = null; c.DocumentSize = null; c.DocumentMimeType = null; c.DocumentBlobPath = null; break;
                        case WarrantyItem w: w.DocumentName = null; w.DocumentSize = null; w.DocumentMimeType = null; w.DocumentBlobPath = null; break;
                    }
                bytes += JsonSerializer.SerializeToUtf8Bytes(schema.Fields.ToDictionary(f => f, f => schema.Property(f).GetValue(entity)), ArchiveSchema.Json).Length;
                if (bytes > ArchiveSchema.MaxManifestBytes || selected.Count >= ArchiveSchema.MaxRecords)
                    throw new ArchiveValidationException("The selected metadata exceeds the archive limit.", 413);
                selected.Add((kind, id), new(schema, id, entity));
            }
            if (ids is not null && ids.Any(id => !found.Contains(id)))
                throw new ArchiveValidationException("A selected or related record is missing from this organization.");
        }
        foreach (var section in sections)
            switch (section)
            {
                case "networks": await Load("networks"); await Load("ip-entries"); break;
                case "diagram": await Load("diagram-nodes"); await Load("diagram-edges"); break;
                case "files": await Load("files", request.FileIds); if (request.FileIds is null) await Load("folders"); break;
                default: await Load(section); break;
            }

        for (var depth = 0; ; depth++)
        {
            var missing = new Dictionary<string, HashSet<Guid>>();
            void Need(string kind, Guid? id)
            {
                if (id is not { } value || selected.ContainsKey((kind, value))) return;
                if (!missing.TryGetValue(kind, out var set)) missing.Add(kind, set = []);
                set.Add(value);
            }
            foreach (var record in selected.Values)
                switch (record.Entity)
                {
                    case IPEntry ip: Need("networks", ip.SubnetId); Need("assets", ip.AssetId); break;
                    case WorkTask task: Need("projects", task.ProjectId); break;
                    case Plan plan: foreach (var id in plan.AssetIds) Need("assets", id); foreach (var id in plan.SubnetIds) Need("networks", id); break;
                    case Group group: foreach (var id in group.LinkedAssets) Need("assets", id); break;
                    case WarrantyItem warranty: Need("assets", warranty.AssetId); break;
                    case StoredFile file: Need("folders", file.FolderId); break;
                    case FileFolder folder: Need("folders", folder.ParentFolderId); break;
                    case DiagramNode node: Need("assets", node.AssetId); break;
                    case DiagramEdge edge: Need("diagram-nodes", edge.SourceNodeId); Need("diagram-nodes", edge.TargetNodeId); break;
                }
            if (missing.Count == 0) break;
            if (depth >= 100) throw new ArchiveValidationException("Related records exceed the maximum nesting depth.");
            foreach (var group in missing) await Load(group.Key, group.Value);
        }
        return selected.Values.ToList();
    }
}
