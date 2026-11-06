using System.IO.Compression;
using System.Security.Cryptography;
using System.Text.Json;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;

namespace HexoraITApi.Application.DataTransfer;

public sealed record ImportedRecord(ArchiveEntity Schema, Guid OriginalId, object Entity);

// No ZIP paths are extracted. Temporary files always receive server-generated names.
public sealed class ArchivePackage : IAsyncDisposable
{
    public ArchiveManifest Manifest { get; private set; } = null!;
    public List<ImportedRecord> Records { get; } = [];
    public Dictionary<(string Kind, Guid Id), ImportedRecord> Index { get; } = [];
    public Dictionary<string, (string Path, ValidatedUpload Upload)> Files { get; } = [];
    private readonly List<string> temporaryPaths = [];

    public static async Task<ArchivePackage> ReadAsync(Stream input, AppDbContext db, CancellationToken token, string? archivePassword = null)
    {
        var package = new ArchivePackage();
        try
        {
            ArchiveZipGuard.Validate(input, token);
            using var zip = new ArchiveZipReader(input, archivePassword);
            if (zip.Entries.Count is < 1 or > ArchiveSchema.MaxFiles + 1) Invalid("Invalid archive entry count.");
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            long declaredBytes = 0;
            foreach (var entry in zip.Entries)
            {
                if (!names.Add(entry.FullName) || entry.FullName.Contains('\\') || entry.FullName.Contains("..") ||
                    entry.FullName.StartsWith('/') || entry.FullName.Contains(':') ||
                    ((entry.ExternalAttributes >> 16) & 0xF000) == 0xA000)
                    Invalid("Duplicate, unsafe or symbolic-link archive entry.");
                if (entry.Length < 0 || entry.Length > ArchiveSchema.MaxExpandedBytes - declaredBytes) Invalid("Archive expands beyond the size limit.", 413);
                declaredBytes += entry.Length;
            }
            var manifestEntry = zip.GetEntry("data.json") ?? throw new ArchiveValidationException("The archive has no data.json manifest.");
            await using (var data = manifestEntry.Open())
            {
                using var bytes = new MemoryStream();
                await CopyBoundedAsync(data, bytes, ArchiveSchema.MaxManifestBytes, token);
                using var json = JsonDocument.Parse(bytes.ToArray(), new JsonDocumentOptions { MaxDepth = 24 });
                RejectDuplicateProperties(json.RootElement);
                package.Manifest = json.RootElement.Deserialize<ArchiveManifest>(ArchiveSchema.Json)
                    ?? throw new ArchiveValidationException("Invalid archive manifest.");
            }
            package.ValidateRecords(db);
            var expected = new HashSet<string>(StringComparer.Ordinal) { "data.json" };
            long actualBytes = manifestEntry.Length;
            foreach (var file in package.Manifest.Files)
            {
                if (file is null) Invalid("Invalid file descriptor.");
                if (file.Size > ArchiveSchema.MaxFileBytes) Invalid("File exceeds the 8 GiB size limit.", 413);
                var entryName = ArchiveSchema.FileEntry(file.Kind, file.RecordId);
                if (file.Entry != entryName || !expected.Add(entryName) || file.Size is < 0 or > ArchiveSchema.MaxFileBytes ||
                    file.Sha256 is null || file.Sha256.Length != 64)
                    Invalid("Invalid or duplicate file descriptor.");
                var entry = zip.GetEntry(entryName) ?? throw new ArchiveValidationException("A file listed in the manifest is missing.");
                if (entry.Length != file.Size) Invalid("File size does not match the manifest.");
                var path = Path.GetTempFileName();
                package.temporaryPaths.Add(path);
                await using (var source = entry.Open())
                await using (var destination = File.Create(path))
                {
                    var copied = await CopyBoundedAsync(source, destination, Math.Min(ArchiveSchema.MaxFileBytes, ArchiveSchema.MaxExpandedBytes - actualBytes), token);
                    if (copied != file.Size) Invalid("File content size does not match the manifest.");
                    actualBytes += copied;
                }
                await using var staged = File.OpenRead(path);
                var hash = Convert.ToHexString(await SHA256.HashDataAsync(staged, token));
                if (!hash.Equals(file.Sha256, StringComparison.OrdinalIgnoreCase)) Invalid("File checksum mismatch.");
                if (!package.Index.TryGetValue((file.Kind, file.RecordId), out var owner))
                    Invalid("Attachment owner does not exist.");
                var name = owner.Entity switch
                {
                    StoredFile stored => stored.Name,
                    Contract contract => contract.DocumentName,
                    WarrantyItem warranty => warranty.DocumentName,
                    _ => throw new ArchiveValidationException("Unsupported attachment owner.")
                };
                if (string.IsNullOrEmpty(name)) Invalid("Missing attachment file name.");
                staged.Position = 0;
                var upload = await FileUploadSecurity.ValidateAsync(new FormFile(staged, 0, staged.Length, "file", name!), ArchiveSchema.MaxFileBytes, token);
                if (upload.FileName != name) Invalid("Unsafe attachment file name.");
                // The signature validator, never archive-supplied MIME, determines preview behavior.
                switch (owner.Entity)
                {
                    case StoredFile stored: stored.MimeType = upload.ContentType; break;
                    case Contract contract: contract.DocumentMimeType = upload.ContentType; break;
                    case WarrantyItem warranty: warranty.DocumentMimeType = upload.ContentType; break;
                }
                package.Files.Add(entryName, (path, upload));
            }
            if (zip.Entries.Any(entry => !expected.Contains(entry.FullName))) Invalid("The archive contains unexpected entries.");
            var attachments = package.Manifest.Files.ToDictionary(f => (f.Kind, f.RecordId));
            foreach (var record in package.Records)
            {
                var size = record.Entity switch
                {
                    StoredFile stored => stored.Size,
                    Contract contract => contract.DocumentSize,
                    WarrantyItem warranty => warranty.DocumentSize,
                    _ => null
                };
                var hasAttachment = record.Entity is StoredFile || record.Entity is Contract { DocumentName: not null } ||
                    record.Entity is WarrantyItem { DocumentName: not null };
                attachments.TryGetValue((record.Schema.Kind, record.OriginalId), out var file);
                if (hasAttachment != (file is not null) || (file is not null && size != file.Size)) Invalid("Attachment metadata is incomplete or inconsistent.");
            }
            return package;
        }
        catch
        {
            await package.DisposeAsync();
            throw;
        }
    }

    private void ValidateRecords(AppDbContext db)
    {
        var manifest = Manifest;
        if (manifest.Format != "hexorait-organization" || manifest.Version != 1 || manifest.Records is null || manifest.Files is null ||
            string.IsNullOrWhiteSpace(manifest.OrganizationName) || manifest.OrganizationName.Length > 200 ||
            manifest.Records.Count != ArchiveSchema.Entities.Length || manifest.Files.Count > ArchiveSchema.MaxFiles)
            Invalid("Unsupported or incomplete archive manifest.");
        var count = 0;
        foreach (var schema in ArchiveSchema.Entities)
        {
            if (!manifest.Records.TryGetValue(schema.Kind, out var items) || items is null) Invalid("Missing data section.");
            count += items!.Count;
            if (count > ArchiveSchema.MaxRecords) Invalid("Too many records in the archive.", 413);
            var seen = new HashSet<Guid>();
            foreach (var item in items)
            {
                if (item is null || item.Id == Guid.Empty || !seen.Add(item.Id) || item.Data is null) Invalid("Invalid or duplicate record identifier.");
                var fields = schema.Fields.Concat(schema.Type == typeof(PasswordEntry) ? ["Password"] : Array.Empty<string>()).ToHashSet(StringComparer.Ordinal);
                if (!fields.SetEquals(item!.Data.Keys)) Invalid("Unexpected or missing record fields.");
                var entity = Activator.CreateInstance(schema.Type)!;
                schema.Property("Id").SetValue(entity, item.Id);
                foreach (var field in schema.Fields)
                {
                    var property = schema.Property(field);
                    var value = item.Data[field].Deserialize(property.PropertyType, ArchiveSchema.Json);
                    var metadata = db.Model.FindEntityType(schema.Type)!.FindProperty(field)!;
                    if (value is null && !metadata.IsNullable) Invalid("A required field is null.");
                    if (value is string text && (text.Length > (metadata.GetMaxLength() ?? 100_000))) Invalid("A text field exceeds its size limit.");
                    var type = Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType;
                    if (value is not null && type.IsEnum && !Enum.IsDefined(type, value)) Invalid("Invalid enum value.");
                    if (value is double number && !double.IsFinite(number)) Invalid("Invalid numeric value.");
                    if (value is decimal money && (Math.Abs(money) >= 10_000_000_000_000_000m || decimal.Round(money, 2) != money)) Invalid("Invalid financial value.");
                    if (value is List<string> strings && (strings.Count > ArchiveSchema.MaxRecords || strings.Any(s => s is null || s.Length > 100_000))) Invalid("Invalid string collection.");
                    if (value is List<Guid> ids && (ids.Count > ArchiveSchema.MaxRecords || ids.Any(id => id == Guid.Empty))) Invalid("Invalid identifier collection.");
                    property.SetValue(entity, value);
                }
                if (schema.Type == typeof(PasswordEntry) && (item.Data["Password"].ValueKind != JsonValueKind.String || item.Data["Password"].GetString()!.Length > 100_000))
                    Invalid("Invalid credential value.");
                var record = new ImportedRecord(schema, item.Id, entity);
                Records.Add(record);
                Index.Add((schema.Kind, item.Id), record);
            }
        }
        if (count == 0) Invalid("The archive contains no documentation records.");
        ValidateRelations();
    }

    public void ValidateRelations()
    {
        var ids = Records.GroupBy(r => r.Schema.Kind).ToDictionary(g => g.Key, g => g.Select(r => r.OriginalId).ToHashSet());
        void Reference(string kind, Guid? id)
        {
            if (id is { } value && (!ids.TryGetValue(kind, out var set) || !set.Contains(value))) Invalid("An archive relationship refers to a missing or foreign record.");
        }
        foreach (var record in Records)
        {
            switch (record.Entity)
            {
                case IPEntry ip: Reference("networks", ip.SubnetId); Reference("assets", ip.AssetId); break;
                case WorkTask task: Reference("projects", task.ProjectId); break;
                case Plan plan: foreach (var id in plan.AssetIds) Reference("assets", id); foreach (var id in plan.SubnetIds) Reference("networks", id); break;
                case Group group: foreach (var id in group.LinkedAssets) Reference("assets", id); break;
                case WarrantyItem warranty: Reference("assets", warranty.AssetId); break;
                case FileFolder folder: Reference("folders", folder.ParentFolderId); break;
                case StoredFile file: Reference("folders", file.FolderId); break;
                case DiagramNode node: Reference("assets", node.AssetId); break;
                case DiagramEdge edge: Reference("diagram-nodes", edge.SourceNodeId); Reference("diagram-nodes", edge.TargetNodeId); break;
            }
        }
        var folders = Records.Where(r => r.Entity is FileFolder).Select(r => (FileFolder)r.Entity).ToDictionary(f => f.Id);
        foreach (var folder in folders.Values)
        {
            var seen = new HashSet<Guid> { folder.Id };
            var parent = folder.ParentFolderId;
            while (parent is { } id)
            {
                if (!seen.Add(id) || seen.Count > 100) Invalid("Folder hierarchy is cyclic or exceeds 100 levels.");
                parent = folders[id].ParentFolderId;
            }
        }
        var automatic = Records.Select(r => r.Entity).OfType<IPEntry>().Where(ip => ip.IsAutoManaged && ip.AssetId.HasValue);
        if (automatic.GroupBy(ip => ip.AssetId).Any(group => group.Count() > 1)) Invalid("Duplicate automatically managed asset address.");
    }

    private static void RejectDuplicateProperties(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var property in element.EnumerateObject())
            {
                if (!names.Add(property.Name)) Invalid("Duplicate JSON property.");
                RejectDuplicateProperties(property.Value);
            }
        }
        else if (element.ValueKind == JsonValueKind.Array)
            foreach (var item in element.EnumerateArray()) RejectDuplicateProperties(item);
    }

    public static async Task<long> CopyBoundedAsync(Stream source, Stream destination, long limit, CancellationToken token)
    {
        var buffer = new byte[81920];
        long total = 0;
        int read;
        while ((read = await source.ReadAsync(buffer, token)) != 0)
        {
            if (read > limit - total) Invalid("Archive or file exceeds its size limit.", 413);
            await destination.WriteAsync(buffer.AsMemory(0, read), token);
            total += read;
        }
        return total;
    }

    [System.Diagnostics.CodeAnalysis.DoesNotReturn]
    private static void Invalid(string message, int status = 400) => throw new ArchiveValidationException(message, status);
    public ValueTask DisposeAsync()
    {
        foreach (var path in temporaryPaths) File.Delete(path);
        return ValueTask.CompletedTask;
    }
}
