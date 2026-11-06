using System.Globalization;
using System.Linq.Expressions;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.Documentation;

public sealed class DocumentationService(AppDbContext db, ICurrentUserContext user, IPasswordCipher cipher, IDocumentationPdfRenderer renderer)
{
    public async Task<ApiOperationResult> GetOptionsAsync(Guid organizationId, CancellationToken token = default)
    {
        if (!await CanExportAsync(organizationId)) return Forbidden();
        var hidden = await db.Organizations.Where(o => o.Id == organizationId).Select(o => o.HiddenModules).SingleAsync(token);
        var sections = new List<DocumentationSectionOptionDto>();
        foreach (var key in DocumentationCatalog.Sections)
        {
            var count = await ItemQuery(organizationId, key).CountAsync(token);
            sections.Add(new(key, count, count > 0 && DocumentationCatalog.Defaults.Contains(key) && !hidden.Contains(key)));
        }
        return new(200, new DocumentationOptionsDto(sections));
    }

    public async Task<ApiOperationResult> GetItemsAsync(Guid organizationId, string key, PaginationParameters pagination, CancellationToken token = default, string? search = null)
    {
        if (!await CanExportAsync(organizationId)) return Forbidden();
        if (!DocumentationCatalog.Sections.Contains(key) || !Pagination.TryResolve(pagination, out var window)) return new(400);
        if (search?.Length > 200) return new(400);
        var query = ItemQuery(organizationId, key);
        if (!string.IsNullOrWhiteSpace(search)) { var term = search.Trim().ToLowerInvariant(); query = query.Where(item => item.Name.ToLower().Contains(term)); }
        var count = await query.CountAsync(token);
        var items = await query.OrderBy(item => item.SortIndex ?? int.MaxValue).ThenBy(item => item.Id).Skip(window.Offset).Take(window.PageSize).ToListAsync(token);
        return new(200, items.Select(item => new ResourceOptionDto(item.Id, item.Name)).ToList(), Pagination: new PaginationMetadata(count, window));
    }

    public async Task<ApiOperationResult> GenerateAsync(Guid organizationId, DocumentationRequestDto options, CancellationToken token = default)
    {
        if (!await CanExportAsync(organizationId)) return Forbidden();
        var error = Validate(options);
        if (error is not null) return new(400, error);
        var org = await db.Organizations.AsNoTracking().SingleAsync(o => o.Id == organizationId, token);
        var sections = new List<DocumentationSection>();
        var count = 0;
        long characters = 0;
        foreach (var selection in options.Sections)
        {
            token.ThrowIfCancellationRequested();
            List<DocumentationRecord> records;
            try { records = await ReadSectionAsync(organizationId, selection, options, token); }
            catch (DocumentationTooLargeException) { return new(413, "The selected documentation is too large for one PDF. Select fewer records or sections."); }
            // Reject stale/foreign selections instead of silently exporting a different scope.
            if (selection.ItemIds is not null && records.Select(item => item.Id).Distinct().Count() != selection.ItemIds.Distinct().Count())
                return new(400, "Some selected records are unavailable in this organization. Refresh the selection.");
            count += records.Count;
            characters += records.Sum(record => (long)record.Title.Length + record.Fields.Sum(field => (long)field.Value.Length) + record.Texts.Sum(text => (long)text.Content.Length));
            if (count > DocumentationCatalog.MaxRecords || characters > DocumentationCatalog.MaxCharacters)
                return new(413, "The selected documentation is too large for one PDF. Select fewer records or sections.");
            sections.Add(new(selection.Key, records));
        }
        var preparedBy = await db.Users.Where(u => u.Id == user.UserId).Select(u => u.DisplayName).SingleAsync(token);
        var snapshot = new DocumentationSnapshot(org.Name, options.IncludeOrganizationDescription ? org.Description : "", preparedBy, DateTime.UtcNow, options, sections);
        var pdf = await renderer.RenderAsync(snapshot, token);
        if (!await CanExportAsync(organizationId)) return Forbidden();
        return new(200, new DocumentationPdf(pdf, $"documentation-{organizationId:N}-{snapshot.GeneratedAt:yyyyMMdd}.pdf"));
    }

    private async Task<bool> CanExportAsync(Guid id) => await user.HasAccessAsync(id) && await user.GetRoleAsync(id) is OrgRole.Owner or OrgRole.Admin;
    private static ApiOperationResult Forbidden() => new(403);
    private static string? Validate(DocumentationRequestDto options)
    {
        if (options.Sections is null || options.Sections.Count is < 1 or > 16 || options.Language is not ("pl" or "en") ||
            options.Title is null || options.Title.Length > 200 || options.Recipient is null || options.Recipient.Length > 200)
            return "Invalid report options.";
        if (options.IncludeSecrets && !options.ConfirmSensitiveData) return "Explicit confirmation is required to export passwords or license keys.";
        if (options.Sections.Any(section => section is null || !DocumentationCatalog.Sections.Contains(section.Key) || section.ItemIds?.Count > DocumentationCatalog.MaxRecords || section.ItemIds?.Contains(Guid.Empty) == true) ||
            options.Sections.Select(section => section.Key).Distinct().Count() != options.Sections.Count)
            return "Invalid report sections or record selection.";
        return null;
    }

    private sealed class DocumentationItemRow { public Guid Id { get; set; } public string Name { get; set; } = ""; public int? SortIndex { get; set; } }

    private IQueryable<DocumentationItemRow> ItemQuery(Guid org, string key) => key switch
    {
        "assets" => db.Assets.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "networks" => db.Subnets.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "passwords" => db.Passwords.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "licenses" => db.Licenses.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "contacts" => db.Contacts.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "contracts" => db.Contracts.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "knowledge" => db.KnowledgeArticles.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "warranty" => db.WarrantyItems.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "files" => db.StoredFiles.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "groups" => db.Groups.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "projects" => db.Projects.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Name, SortIndex = x.SortIndex }),
        "plans" => db.Plans.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "incidents" => db.Incidents.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "tasks" => db.Tasks.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        "diagram" => db.DiagramNodes.Where(x => x.OrganizationId == org).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Label, SortIndex = x.SortIndex }),
        "private-notes" => db.PrivateNotes.Where(x => x.OrganizationId == org && x.UserId == user.UserId).Select(x => new DocumentationItemRow { Id = x.Id, Name = x.Title, SortIndex = x.SortIndex }),
        _ => throw new ArgumentOutOfRangeException(nameof(key))
    };

    private async Task<List<T>> ReadAsync<T>(IQueryable<T> query, DocumentationSelectionDto selection, Expression<Func<T, Guid>> id, CancellationToken token) where T : class, IOrderedRecord
    {
        if (selection.ItemIds is not null)
        {
            var contains = Expression.Call(Expression.Constant(selection.ItemIds), typeof(List<Guid>).GetMethod(nameof(List<Guid>.Contains))!, id.Body);
            query = query.Where(Expression.Lambda<Func<T, bool>>(contains, id.Parameters));
        }
        return await query.AsNoTracking().OrderBy(item => item.SortIndex ?? int.MaxValue).ThenBy(id).Take(DocumentationCatalog.MaxRecords + 1).ToListAsync(token);
    }

    private static DocumentationField F(string label, object? value) => new(label, value switch
    {
        null => "", DateOnly date => date == DateOnly.MinValue ? "" : date.ToString("yyyy-MM-dd"),
        DateTime date => date == DateTime.MinValue ? "" : date.ToUniversalTime().ToString("yyyy-MM-dd HH:mm 'UTC'"),
        bool flag => flag ? "Yes" : "No", IFormattable number => number.ToString(null, CultureInfo.InvariantCulture), _ => value.ToString() ?? ""
    }, value is bool or Enum);
    private static DocumentationRecord R(IOrderedRecord source, Guid id, string title, params DocumentationField[] fields) => new(id, title, fields.Where(field => field.Value.Length > 0).ToList(), [], source.SortIndex);
    private static DocumentationRecord Text(DocumentationRecord record, string label, string? value, bool include = true)
    {
        if (include && !string.IsNullOrWhiteSpace(value)) record.Texts.Add(new(label, value));
        return record;
    }
    private async Task<List<DocumentationRecord>> ReadSectionAsync(Guid org, DocumentationSelectionDto selection, DocumentationRequestDto options, CancellationToken token)
    {
        var records = new List<DocumentationRecord>();
        switch (selection.Key)
        {
            case "assets":
                foreach (var x in await ReadAsync(db.Assets.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(R(x, x.Id, x.Name, F("Type", x.Type), F("Status", x.Status), F("Location", x.Location), F("Owner", x.Owner), F("IP address", x.Ip), F("Serial number", x.Serial), F("Tags", string.Join(", ", x.Tags)), F("Updated", x.UpdatedAt)), "Notes", x.Notes, options.IncludeNotes));
                break;
            case "passwords":
                foreach (var x in await ReadAsync(db.Passwords.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                {
                    var record = Text(R(x, x.Id, x.Name, F("Username", x.Username), F("Category", x.Category), F("Updated", x.UpdatedAt)), "Notes", x.Notes, options.IncludeNotes);
                    if (options.IncludeSecrets) record.Fields.Add(F("Password", cipher.Decrypt(x.EncryptedPassword)));
                    records.Add(record);
                }
                break;
            case "licenses":
                foreach (var x in await ReadAsync(db.Licenses.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                {
                    var record = Text(R(x, x.Id, x.Name, F("Vendor", x.Vendor), F("Category", x.Category), F("Type", x.Type), F("Status", x.Status), F("Seats", x.Seats), F("Seats used", x.SeatsUsed), F("Purchase date", x.PurchaseDate), F("Expiry date", x.ExpiryDate)), "Notes", x.Notes, options.IncludeNotes);
                    if (options.IncludeSecrets) record.Fields.Add(F("License key", x.LicenseKey));
                    if (options.IncludeFinancials) record.Fields.Add(F("Cost", $"{x.Cost} {x.Currency}"));
                    records.Add(record);
                }
                break;
            case "contacts":
                foreach (var x in await ReadAsync(db.Contacts.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(R(x, x.Id, x.Name, F("Company", x.Company), F("Role", x.Role), F("Phone", x.Phone), F("Email", x.Email)), "Description", x.Description, options.IncludeNotes));
                break;
            case "contracts":
                foreach (var x in await ReadAsync(db.Contracts.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                {
                    var record = Text(R(x, x.Id, x.Name, F("Vendor", x.Vendor), F("Category", x.Category), F("Status", x.Status), F("Start date", x.StartDate), F("End date", x.EndDate), F("Auto-renewal", x.AutoRenew), F("Attachment", x.DocumentName)), "Notes", x.Notes, options.IncludeNotes);
                    if (options.IncludeFinancials) record.Fields.Add(F("Value", $"{x.Value} {x.Currency}"));
                    records.Add(record);
                }
                break;
            case "knowledge":
                foreach (var x in await ReadAsync(db.KnowledgeArticles.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(R(x, x.Id, x.Title, F("Category", x.Category), F("Tags", string.Join(", ", x.Tags)), F("Updated", x.UpdatedAt)), "Content", x.Content, options.IncludeKnowledgeContent));
                break;
            case "warranty":
                foreach (var x in await ReadAsync(db.WarrantyItems.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(R(x, x.Id, x.Name, F("Vendor", x.Vendor), F("Serial number", x.SerialNumber), F("Type", x.WarrantyType), F("Status", x.Status), F("Purchase date", x.PurchaseDate), F("Warranty end", x.WarrantyEndDate), F("Contact", x.ContactName), F("Phone", x.ContactPhone), F("Email", x.ContactEmail), F("Attachment", x.DocumentName)), "Notes", x.Notes, options.IncludeNotes));
                break;
            case "tasks":
                foreach (var x in await ReadAsync(db.Tasks.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(R(x, x.Id, x.Title, F("Status", x.Status), F("Priority", x.Priority), F("Assignee", x.Assignee), F("Due date", x.DueDate)), "Description", x.Description));
                break;
            case "plans":
                foreach (var x in await ReadAsync(db.Plans.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                {
                    var record = Text(R(x, x.Id, x.Title, F("Status", x.Status), F("Priority", x.Priority), F("Target date", x.TargetDate)), "Description", x.Description);
                    if (options.IncludeFinancials) record.Fields.Add(F("Estimated cost", x.EstimatedCost));
                    records.Add(record);
                }
                break;
            case "incidents":
                foreach (var x in await ReadAsync(db.Incidents.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(Text(R(x, x.Id, x.Title, F("Status", x.Status), F("Severity", x.Severity), F("Occurred", x.OccurredAt), F("Resolved", x.ResolvedAt), F("Affected systems", string.Join(", ", x.AffectedSystems))), "Description", x.Description), "Resolution", x.Resolution));
                break;
            case "projects":
                foreach (var x in await ReadAsync(db.Projects.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(R(x, x.Id, x.Name, F("Created", x.CreatedAt)), "Description", x.Description));
                break;
            case "groups":
                foreach (var x in await ReadAsync(db.Groups.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                    records.Add(Text(Text(R(x, x.Id, x.Name, F("Type", x.Type), F("Members", string.Join(", ", x.Members))), "Description", x.Description), "Purpose", x.Purpose));
                break;
            case "private-notes":
                foreach (var x in await ReadAsync(db.PrivateNotes.Where(x => x.OrganizationId == org && x.UserId == user.UserId), selection, x => x.Id, token))
                    records.Add(Text(R(x, x.Id, x.Title, F("Updated", x.UpdatedAt)), "Content", x.Content));
                break;
            case "files":
                var folders = await db.FileFolders.Where(x => x.OrganizationId == org).AsNoTracking().ToDictionaryAsync(x => x.Id, token);
                foreach (var x in await ReadAsync(db.StoredFiles.Where(x => x.OrganizationId == org), selection, x => x.Id, token))
                {
                    var path = new List<string>(); var visited = new HashSet<Guid>(); var parent = x.FolderId;
                    while (parent is { } folderId && folders.TryGetValue(folderId, out var folder) && visited.Add(folderId)) { path.Insert(0, folder.Name); parent = folder.ParentFolderId; }
                    records.Add(R(x, x.Id, x.Name, F("Folder", string.Join(" / ", path)), F("File type", x.MimeType), F("Size (bytes)", x.Size), F("Uploaded", x.UploadedAt)));
                }
                break;
            case "networks":
                var networks = await ReadAsync(db.Subnets.Where(x => x.OrganizationId == org), selection, x => x.Id, token);
                var networkIds = networks.Select(x => x.Id).ToList();
                var ips = await db.IPEntries.AsNoTracking().Where(x => networkIds.Contains(x.SubnetId) && x.Subnet.OrganizationId == org).OrderBy(x => x.SortIndex ?? int.MaxValue).ThenBy(x => x.Id).Take(DocumentationCatalog.MaxRecords + 1).ToListAsync(token);
                if (ips.Count > DocumentationCatalog.MaxRecords) throw new DocumentationTooLargeException();
                var ipsByNetwork = ips.ToLookup(ip => ip.SubnetId);
                foreach (var x in networks)
                {
                    var record = Text(R(x, x.Id, x.Name, F("CIDR", x.Cidr), F("VLAN", x.Vlan), F("Type", x.Type), F("Gateway", x.Gateway), F("DNS", x.Dns)), "Description", x.Description);
                    foreach (var ip in ipsByNetwork[x.Id])
                    {
                        record.Fields.Add(F("IP entry", $"{ip.Ip} — {ip.Label} ({ip.Status})"));
                        if (options.IncludeNotes) Text(record, "IP notes", ip.Notes);
                        if (options.IncludeNotes) Text(record, "IP details", ip.PlainText);
                    }
                    records.Add(record);
                }
                break;
            case "diagram":
                var nodes = await ReadAsync(db.DiagramNodes.Where(x => x.OrganizationId == org), selection, x => x.Id, token);
                var nodeIds = nodes.Select(x => x.Id).ToList();
                var edges = await db.DiagramEdges.AsNoTracking().Where(x => x.OrganizationId == org && nodeIds.Contains(x.SourceNodeId) && nodeIds.Contains(x.TargetNodeId)).Take(DocumentationCatalog.MaxRecords + 1).ToListAsync(token);
                if (edges.Count > DocumentationCatalog.MaxRecords) throw new DocumentationTooLargeException();
                var nodesById = nodes.ToDictionary(node => node.Id);
                var edgesBySource = edges.ToLookup(edge => edge.SourceNodeId);
                foreach (var x in nodes)
                {
                    var record = R(x, x.Id, x.Label, F("Device type", x.DeviceType), F("IP address", x.Ip));
                    foreach (var edge in edgesBySource[x.Id]) record.Fields.Add(F("Connection", $"{nodesById[edge.TargetNodeId].Label} — {edge.ConnectionType} {edge.Label}"));
                    records.Add(record);
                }
                break;
        }
        return records;
    }
}
