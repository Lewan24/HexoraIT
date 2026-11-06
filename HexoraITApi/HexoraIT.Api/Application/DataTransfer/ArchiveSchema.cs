using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.DataTransfer;

// Explicit, versioned allowlist. Adding an entity column never silently adds it to a backup.
public sealed record ArchiveEntity(string Kind, Type Type, string[] Fields,
    Func<AppDbContext, Guid, IReadOnlyCollection<Guid>?, CancellationToken, IAsyncEnumerable<object>> Load,
    Func<AppDbContext, Guid, CancellationToken, Task<bool>> Any,
    Func<AppDbContext, Guid, CancellationToken, Task<int>> Count)
{
    public PropertyInfo Property(string name) => Type.GetProperty(name)!;
}

public static class ArchiveSchema
{
    public const long MaxArchiveBytes = 64L * 1024 * 1024 * 1024;
    public const long MaxExpandedBytes = 64L * 1024 * 1024 * 1024;
    public const long MaxFileBytes = 8L * 1024 * 1024 * 1024;
    public const int MaxManifestBytes = 16 * 1024 * 1024;
    public const int MaxRecords = 50_000;
    public const int MaxFiles = 5_000;
    public static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
        MaxDepth = 24,
        WriteIndented = true
    };

    public static readonly ArchiveEntity[] Entities =
    [
        Entity<Asset>("assets", "SortIndex Name Type Status Location Owner Ip UpdatedAt Starred Tags Notes Serial"),
        Entity<Subnet>("networks", "SortIndex Name Cidr Vlan Type Gateway Dns Description"),
        Entity<IPEntry>("ip-entries", "SortIndex SubnetId Ip Label Status AssetId PlainText Notes IsAutoManaged"),
        Entity<PasswordEntry>("passwords", "SortIndex Name Username Category Tags UpdatedAt Strength Starred Notes"),
        Entity<License>("licenses", "SortIndex Name Vendor Category Type Seats SeatsUsed PurchaseDate ExpiryDate Cost Currency LicenseKey Notes Starred Status"),
        Entity<Contact>("contacts", "SortIndex Name Company Role Phone Email Description Tags Starred"),
        Entity<Contract>("contracts", "SortIndex Name Vendor Category StartDate EndDate Value Currency AutoRenew Notes Starred Status DocumentName DocumentMimeType DocumentSize"),
        Entity<KnowledgeArticle>("knowledge", "SortIndex Title Category Content Tags UpdatedAt Starred"),
        Entity<Project>("projects", "SortIndex Name Description Color CreatedAt"),
        Entity<WorkTask>("tasks", "SortIndex Title Description Priority Status Assignee DueDate Tags CreatedAt ProjectId"),
        Entity<Plan>("plans", "SortIndex Title Description Priority Status TargetDate Tags AssetIds SubnetIds EstimatedCost CreatedAt"),
        Entity<Incident>("incidents", "SortIndex Title Severity Status Description Resolution AffectedSystems OccurredAt ResolvedAt Tags"),
        Entity<Group>("groups", "SortIndex Name Type Description Purpose Members LinkedAssets Tags CreatedAt"),
        Entity<WarrantyItem>("warranty", "SortIndex Name Vendor SerialNumber PurchaseDate WarrantyEndDate WarrantyType ContactName ContactPhone ContactEmail Notes AssetId Starred Status DocumentName DocumentMimeType DocumentSize"),
        Entity<FileFolder>("folders", "SortIndex Name ParentFolderId CreatedAt"),
        Entity<StoredFile>("files", "SortIndex Name MimeType Size FolderId UploadedAt"),
        Entity<DiagramNode>("diagram-nodes", "SortIndex DeviceType Label Ip AssetId X Y Color"),
        Entity<DiagramEdge>("diagram-edges", "SourceNodeId TargetNodeId Label ConnectionType")
    ];

    private static ArchiveEntity Entity<T>(string kind, string fields) where T : class => new(kind, typeof(T), fields.Split(' '),
        (db, org, ids, token) => Stream<T>(db, org, ids, token),
        (db, org, token) => Query<T>(db, org).AnyAsync(token),
        (db, org, token) => Query<T>(db, org).CountAsync(token));

    private static async IAsyncEnumerable<object> Stream<T>(AppDbContext db, Guid org, IReadOnlyCollection<Guid>? ids,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken token) where T : class
    {
        var query = Query<T>(db, org).AsNoTracking();
        if (ids is not null) query = query.Where(item => ids.Contains(EF.Property<Guid>(item, "Id")));
        await foreach (var item in query.AsAsyncEnumerable().WithCancellation(token)) yield return item;
    }

    // Authorization is checked separately for the whole archive, including otherwise hidden modules.
    private static IQueryable<T> Query<T>(AppDbContext db, Guid org) where T : class => typeof(T) == typeof(IPEntry)
        ? db.Set<T>().IgnoreQueryFilters().Where(item => db.Subnets.IgnoreQueryFilters().Any(s =>
            s.OrganizationId == org && s.Id == EF.Property<Guid>(item, "SubnetId")))
        : db.Set<T>().IgnoreQueryFilters().Where(item => EF.Property<Guid>(item, "OrganizationId") == org);

    public static string FileEntry(string kind, Guid id) => $"files/{kind}-{id:N}.bin";
}
