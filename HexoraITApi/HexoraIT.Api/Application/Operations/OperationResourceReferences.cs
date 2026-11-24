using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.Operations;

public sealed record OperationResourceReference(string Resource, Guid Id);
public sealed record OperationResourceView(string Resource, Guid Id, string Name);

internal sealed class OperationResourceReferences(AppDbContext db, ICurrentUserContext user)
{
    public const int Maximum = 50;

    public async Task<OperationResourceView?> Read(Guid org, OperationResourceReference reference, CancellationToken token)
    {
        var id = reference.Id;
        var resource = reference.Resource;

        if (resource == "ip-entries")
        {
            var entry = await db.IPEntries.AsNoTracking().Where(ip => ip.Id == id &&
                db.Subnets.Any(subnet => subnet.Id == ip.SubnetId && subnet.OrganizationId == org))
                .Select(ip => new { ip.SubnetId, ip.Ip }).SingleOrDefaultAsync(token);
            return entry is not null && await user.HasPermissionAsync(org, "networks", false, entry.SubnetId)
                ? new(resource, id, entry.Ip) : null;
        }

        var permission = resource switch { "folders" => "files", "diagram-nodes" or "diagram-edges" => "diagram", _ => resource };
        if (!await user.HasPermissionAsync(org, permission, false, permission == "diagram" ? Guid.Empty : id)) return null;

        var names = resource switch
        {
            "assets" => db.Assets.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "passwords" => db.Passwords.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "networks" => db.Subnets.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "files" => db.StoredFiles.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "folders" => db.FileFolders.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "licenses" => db.Licenses.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "contacts" => db.Contacts.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "contracts" => db.Contracts.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "plans" => db.Plans.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Title),
            "incidents" => db.Incidents.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Title),
            "knowledge" => db.KnowledgeArticles.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Title),
            "tasks" => db.Tasks.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Title),
            "projects" => db.Projects.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "groups" => db.Groups.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "warranty" => db.WarrantyItems.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Name),
            "operations" => db.OperationRecords.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Number + " · " + x.Title),
            "diagram-nodes" => db.DiagramNodes.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Label),
            "diagram-edges" => db.DiagramEdges.Where(x => x.OrganizationId == org && x.Id == id).Select(x => x.Label ?? ""),
            _ => null
        };
        var name = names is null ? null : await names.FirstOrDefaultAsync(token);
        return name is null ? null : new(resource, id, name);
    }

    public async Task<List<OperationResourceView>> Read(Guid org, IEnumerable<OperationResourceReference> references, CancellationToken token)
    {
        var views = new List<OperationResourceView>();
        foreach (var reference in references)
            if (await Read(org, reference, token) is { } view) views.Add(view);
        return views;
    }

    public async Task<bool> Apply(OperationRecord record, IReadOnlyList<OperationResourceReference>? references, CancellationToken token)
    {
        if (references is null) return true;
        if (references.Count > Maximum || references.Any(r => r is null || r.Id == Guid.Empty || string.IsNullOrWhiteSpace(r.Resource) ||
            r.Resource.Length > 32 || (r.Resource == "operations" && r.Id == record.Id))) return false;
        var submitted = references.ToHashSet();
        if (submitted.Count != references.Count) return false;

        var existing = record.ResourceLinks.ToDictionary(link => new OperationResourceReference(link.Resource, link.ResourceId));
        var additions = submitted.Except(existing.Keys).ToList();
        foreach (var reference in additions)
            if (await Read(record.OrganizationId, reference, token) is null) return false;

        // A reader may lack access to a previously linked resource. Keep such links when saving the visible subset.
        var removals = new List<OperationResourceLink>();
        foreach (var (reference, link) in existing)
            if (!submitted.Contains(reference) && await Read(record.OrganizationId, reference, token) is not null) removals.Add(link);
        if (existing.Count - removals.Count + additions.Count > Maximum) return false;
        foreach (var link in removals)
        {
            record.ResourceLinks.Remove(link);
            db.Remove(link);
        }
        foreach (var reference in additions)
            record.ResourceLinks.Add(new() { RecordId = record.Id, OrganizationId = record.OrganizationId, Resource = reference.Resource, ResourceId = reference.Id });
        return true;
    }
}
