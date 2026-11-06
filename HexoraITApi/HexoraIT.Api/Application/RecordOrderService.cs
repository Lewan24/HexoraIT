using System.Linq.Expressions;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

public sealed class RecordOrderService(AppDbContext db, ICurrentUserContext user)
{
    public static readonly string[] Resources = [.. OrganizationResources.All.Where(resource => resource is not ("dashboard" or "settings" or "data-transfer")), "folders", "ip-entries", "private-notes"];
    private static string Permission(string resource) => resource switch { "folders" => "files", "ip-entries" => "networks", _ => resource };
    private async Task<bool> CanReadAsync(Guid org, string resource, CancellationToken token) =>
        Resources.Contains(resource) && await user.HasAccessAsync(org) &&
        (resource == "private-notes" ? !await db.Users.AnyAsync(u => u.Id == user.UserId && u.SystemRole == SystemRole.Client, token) : await user.HasPermissionAsync(org, Permission(resource)));

    public async Task<ApiOperationResult> GetAsync(Guid org, string resource, PaginationParameters pagination, string? search = null, Guid? parentId = null, CancellationToken token = default)
    {
        if (!await CanReadAsync(org, resource, token)) return new(403);
        if (!Pagination.TryResolve(pagination, out var window) || search?.Length > 200) return new(400);
        var query = Query(org, resource);
        if (parentId is not null) query = query.Where(item => item.ParentId == parentId);
        if (!string.IsNullOrWhiteSpace(search)) { var term = search.Trim().ToLowerInvariant(); query = query.Where(item => item.Name.ToLower().Contains(term)); }
        var count = await query.CountAsync(token);
        var rows = await query.OrderBy(item => item.SortIndex ?? int.MaxValue).ThenBy(item => item.Id).Skip(window.Offset).Take(window.PageSize).ToListAsync(token);
        var writable = resource == "private-notes" ? rows.Select(row => row.Id).ToHashSet()
            : await user.GetWritableResourceIdsAsync(org, Permission(resource), rows.Select(row => PermissionId(resource, row)).Distinct().ToList(), token);
        var result = rows.Select(row => new RecordOrderItemDto { Id = row.Id, Name = row.Name, SortIndex = row.SortIndex,
            CanWrite = resource == "private-notes" || writable.Contains(PermissionId(resource, row)) }).ToList();
        return new(200, result, Pagination: new PaginationMetadata(count, window));
    }

    public async Task<ApiOperationResult> SaveAsync(Guid org, string resource, SaveRecordOrderDto request, CancellationToken token = default)
    {
        if (!await CanReadAsync(org, resource, token)) return new(403);
        if (request.Changes is null || request.Changes.Count is < 1 or > 500 || request.Changes.Any(change => change is null || change.Id == Guid.Empty || change.SortIndex is < 1 or > 1_000_000) || request.Changes.Select(change => change.Id).Distinct().Count() != request.Changes.Count) return new(400, "Invalid record indices.");
        var ids = request.Changes.Select(change => change.Id).ToList();
        var rows = await Query(org, resource).Where(row => ids.Contains(row.Id)).ToListAsync(token);
        if (rows.Count != ids.Count) return new(400, "Some records are unavailable in this organization. Refresh the list.");
        if (resource != "private-notes")
        {
            var writable = await user.GetWritableResourceIdsAsync(org, Permission(resource), rows.Select(row => PermissionId(resource, row)).Distinct().ToList(), token);
            if (rows.Any(row => !writable.Contains(PermissionId(resource, row)))) return new(403);
        }
        var changes = request.Changes.ToDictionary(change => change.Id, change => change.SortIndex);
        try
        {
            switch (resource)
            {
                case "assets": await ApplyAsync(db.Assets.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "passwords": await ApplyAsync(db.Passwords.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "networks": await ApplyAsync(db.Subnets.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "licenses": await ApplyAsync(db.Licenses.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "contacts": await ApplyAsync(db.Contacts.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "contracts": await ApplyAsync(db.Contracts.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "plans": await ApplyAsync(db.Plans.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "incidents": await ApplyAsync(db.Incidents.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "knowledge": await ApplyAsync(db.KnowledgeArticles.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "tasks": await ApplyAsync(db.Tasks.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "projects": await ApplyAsync(db.Projects.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "groups": await ApplyAsync(db.Groups.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "warranty": await ApplyAsync(db.WarrantyItems.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "files": await ApplyAsync(db.StoredFiles.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "folders": await ApplyAsync(db.FileFolders.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "ip-entries": await ApplyAsync(db.IPEntries.Where(x => x.Subnet.OrganizationId == org && db.Subnets.Any(subnet => subnet.Id == x.SubnetId)), changes, x => x.Id, token); break;
                case "diagram": await ApplyAsync(db.DiagramNodes.Where(x => x.OrganizationId == org), changes, x => x.Id, token); break;
                case "private-notes": await ApplyAsync(db.PrivateNotes.Where(x => x.OrganizationId == org && x.UserId == user.UserId), changes, x => x.Id, token); break;
            }
            await db.SaveChangesAsync(token);
        }
        catch (DbUpdateConcurrencyException) { return new(409, "Records changed while saving their order. Refresh and try again."); }
        return new(200, request.Changes);
    }

    private async Task ApplyAsync<T>(IQueryable<T> query, Dictionary<Guid, int?> changes, Expression<Func<T, Guid>> id, CancellationToken token) where T : class, IOrderedRecord
    {
        var ids = changes.Keys.ToList();
        var predicate = Expression.Lambda<Func<T, bool>>(Expression.Call(Expression.Constant(ids), typeof(List<Guid>).GetMethod(nameof(List<Guid>.Contains))!, id.Body), id.Parameters);
        var entries = await query.Where(predicate).ToListAsync(token);
        if (entries.Count != changes.Count) throw new DbUpdateConcurrencyException("Some ordered records are no longer available.");
        var getId = id.Compile();
        foreach (var entry in entries) entry.SortIndex = changes[getId(entry)];
    }

    private static Guid PermissionId(string resource, OrderRow row) => resource == "ip-entries" ? row.ParentId!.Value : resource == "diagram" ? Guid.Empty : row.Id;

    private sealed class OrderRow { public Guid Id { get; set; } public string Name { get; set; } = ""; public int? SortIndex { get; set; } public Guid? ParentId { get; set; } }
    private IQueryable<OrderRow> Query(Guid org, string resource) => resource switch
    {
        "assets" => db.Assets.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "passwords" => db.Passwords.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "networks" => db.Subnets.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "licenses" => db.Licenses.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "contacts" => db.Contacts.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "contracts" => db.Contracts.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "plans" => db.Plans.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "incidents" => db.Incidents.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "knowledge" => db.KnowledgeArticles.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "tasks" => db.Tasks.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "projects" => db.Projects.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "groups" => db.Groups.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "warranty" => db.WarrantyItems.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "files" => db.StoredFiles.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex, ParentId = x.FolderId }),
        "folders" => db.FileFolders.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex, ParentId = x.ParentFolderId }),
        "ip-entries" => db.IPEntries.Where(x => x.Subnet.OrganizationId == org && db.Subnets.Any(subnet => subnet.Id == x.SubnetId)).Select(x => new OrderRow { Id = x.Id, Name = x.Ip + " " + x.Label, SortIndex = x.SortIndex, ParentId = x.SubnetId }),
        "diagram" => db.DiagramNodes.Where(x => x.OrganizationId == org).Select(x => new OrderRow { Id = x.Id, Name = x.Label, SortIndex = x.SortIndex }),
        "private-notes" => db.PrivateNotes.Where(x => x.OrganizationId == org && x.UserId == user.UserId).Select(x => new OrderRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        _ => throw new ArgumentOutOfRangeException(nameof(resource))
    };
}
