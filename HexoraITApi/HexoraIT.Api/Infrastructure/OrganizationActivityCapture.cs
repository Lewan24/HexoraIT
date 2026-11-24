using System.Text;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace HexoraITApi.Infrastructure;

internal static class OrganizationActivityCapture
{
    public static List<OrganizationActivity> Collect(ChangeTracker tracker, Guid actor)
    {
        var entries = tracker.Entries().ToList();
        var subnetOrganizations = entries.Where(entry => entry.Entity is Subnet)
            .Select(entry => (Subnet)entry.Entity).ToDictionary(subnet => subnet.Id, subnet => subnet.OrganizationId);
        var roles = entries.Where(entry => entry.Entity is OrganizationRole)
            .Select(entry => (OrganizationRole)entry.Entity).ToDictionary(role => role.Id);
        var now = DateTime.UtcNow;
        var result = new List<OrganizationActivity>();
        foreach (var entry in entries)
        {
            if (entry.State is not (EntityState.Added or EntityState.Modified or EntityState.Deleted)) continue;
            var target = entry.Entity switch
            {
                Organization org => (org.Id, org.Id, nameof(Organization)),
                BaseEntity item => (item.OrganizationId, item.Id, entry.Metadata.ClrType.Name),
                IPEntry ip => (subnetOrganizations.GetValueOrDefault(ip.SubnetId), ip.Id, nameof(IPEntry)),
                DiagramNode node => (node.OrganizationId, node.Id, nameof(DiagramNode)),
                DiagramEdge edge => (edge.OrganizationId, edge.Id, nameof(DiagramEdge)),
                UserOrganization member => (member.OrganizationId, member.UserId, nameof(UserOrganization)),
                OrganizationRole role => (role.OrganizationId, role.Id, nameof(OrganizationRole)),
                RolePermission permission when roles.TryGetValue(permission.RoleId, out var role)
                    => (role.OrganizationId, permission.Id, nameof(RolePermission)),
                ClientPermission permission => (permission.OrganizationId, permission.UserId, nameof(ClientPermission)),
                OrganizationNotificationSettings settings => (settings.OrganizationId, settings.OrganizationId, nameof(OrganizationNotificationSettings)),
                OperationTemplateVersion { OrganizationId: { } org } template => (org, template.Id, nameof(OperationTemplateVersion)),
                OperationTemplateSetting setting => (setting.OrganizationId, setting.OrganizationId, nameof(OperationTemplateSetting)),
                OperationResourceLink link => (link.OrganizationId, link.RecordId, nameof(OperationResourceLink)),
                OperationPolicy policy => (policy.OrganizationId, policy.OrganizationId, nameof(OperationPolicy)),
                _ => (Guid.Empty, Guid.Empty, "")
            };
            var (organizationId, resourceId, resource) = target;
            if (organizationId == Guid.Empty) continue;

            // Keep identifiers and explicitly selected labels only. Domain properties,
            // passwords, document contents and personal notes never enter the activity log.
            var nameProperty = entry.Entity switch
            {
                PasswordEntry => null,
                IPEntry => nameof(IPEntry.Ip),
                RolePermission => nameof(RolePermission.Resource),
                ClientPermission => nameof(ClientPermission.Resource),
                OperationTemplateVersion => nameof(OperationTemplateVersion.Key),
                OperationTemplateSetting => nameof(OperationTemplateSetting.TemplateKey),
                DiagramNode => nameof(DiagramNode.Label),
                DiagramEdge => nameof(DiagramEdge.Label),
                _ => entry.Metadata.FindProperty("Name") is not null ? "Name"
                    : entry.Metadata.FindProperty("Title") is not null ? "Title" : null
            };
            var name = nameProperty is null ? null : entry.Property(nameProperty);
            var currentName = Label(entry.State == EntityState.Deleted ? name?.OriginalValue : name?.CurrentValue);
            foreach (var action in Actions(entry, nameProperty))
            {
                result.Add(new OrganizationActivity
                {
                    OrganizationId = organizationId, ResourceId = resourceId, Resource = resource, ActorId = actor,
                    OccurredAt = now, Action = action, ResourceName = currentName,
                    PreviousName = action is "renamed" or "address-updated" ? Label(name?.OriginalValue) : null
                });
            }
        }
        return result;
    }

    private static IEnumerable<string> Actions(EntityEntry entry, string? nameProperty)
    {
        if (entry.State != EntityState.Modified)
        {
            if (entry.Entity is OperationResourceLink)
                yield return entry.State == EntityState.Added ? "linked" : "unlinked";
            else yield return entry.State == EntityState.Added ? "created" : "deleted";
            yield break;
        }

        var changes = entry.Properties.Where(property => property.IsModified &&
            !property.Metadata.GetValueComparer().Equals(property.OriginalValue, property.CurrentValue))
            .Select(property => property.Metadata.Name).ToHashSet();
        changes.ExceptWith(["xmin", "SyncRevision", "RevisionToken", "ModifiedAt", "ModifiedBy", "UpdatedAt"]);
        if (changes.Remove("IsDeleted") && entry.Entity is Organization organization)
        {
            changes.Remove("DeletedAt");
            yield return organization.IsDeleted ? "deleted" : "restored";
        }
        if (changes.Remove("IsArchived") && entry.Entity is Organization archived)
        {
            changes.Remove("ArchivedAt");
            yield return archived.IsArchived ? "archived" : "restored";
        }
        if (nameProperty is "Name" or "Title" or "Label" && changes.Remove(nameProperty)) yield return "renamed";
        if (entry.Entity is IPEntry && changes.Remove(nameof(IPEntry.Ip))) yield return "address-updated";
        if (entry.Entity is DiagramNode && (changes.Remove("X") | changes.Remove("Y"))) yield return "moved";
        if (changes.Remove("FolderId") | changes.Remove("ParentFolderId") | changes.Remove("SubnetId"))
            yield return "moved";
        if (changes.Remove("BlobPath") | changes.Remove("DocumentBlobPath"))
        {
            changes.ExceptWith(["Size", "MimeType", "DocumentSize", "DocumentName", "DocumentMimeType"]);
            yield return "content-updated";
        }
        if (changes.Remove("SortIndex")) yield return "reordered";
        if (changes.Remove(nameof(Organization.ActivityRetentionDays)) && entry.Entity is Organization)
            yield return "retention-updated";
        if (changes.Count > 0) yield return "updated";
    }

    private static string? Label(object? value)
    {
        if (value is not string text) return null;
        var label = new StringBuilder();
        foreach (var rune in text.EnumerateRunes())
        {
            if (label.Length + rune.Utf16SequenceLength > 260) break;
            if (!Rune.IsControl(rune)) label.Append(rune.ToString());
        }
        return label.ToString();
    }
}
