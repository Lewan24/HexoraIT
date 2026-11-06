using System.Data;
using System.Data.Common;
using ICSharpCode.SharpZipLib.Zip;
using System.Security.Cryptography;
using System.Text.Json;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.DataTransfer;

public sealed class OrganizationArchiveService(AppDbContext db, ICurrentUserContext currentUser, IPasswordHasher hasher,
    IPasswordCipher cipher, IFileStorage storage, IDataProtectionProvider protection, ISecurityAuditLogger audit,
    ILogger<OrganizationArchiveService> logger)
{
    private static readonly SemaphoreSlim Slots = new(2);
    private readonly IDataProtector reviewProtector = protection.CreateProtector("HexoraIT.OrganizationArchive.Review.v1");

    private async Task<(bool Export, bool Import)> Rights(Guid orgId, CancellationToken token, Guid? actor = null)
    {
        var actorId = actor ?? currentUser.UserId;
        var member = await db.UserOrganizations.AsNoTracking().Where(m => m.UserId == actorId && m.OrganizationId == orgId &&
            !m.Organization.IsDeleted && !m.Organization.IsArchived && m.User.IsActive && !m.User.IsBlocked &&
            m.User.EmailConfirmed && m.User.SystemRole != SystemRole.Client)
            .Select(m => new { m.Role, m.CustomRoleId }).SingleOrDefaultAsync(token);
        if (member is null) return (false, false);
        if (member.CustomRoleId is null) return (member.Role >= OrgRole.Admin, member.Role >= OrgRole.Admin);
        var permission = await db.RolePermissions.AsNoTracking().Where(p => p.RoleId == member.CustomRoleId &&
            p.Resource == "data-transfer" && p.ResourceId == Guid.Empty).SingleOrDefaultAsync(token);
        return (permission?.CanRead == true, permission?.CanRead == true && permission.CanWrite);
    }

    public async Task<ApiOperationResult> CapabilitiesAsync(Guid orgId, CancellationToken token = default)
    {
        var rights = await Rights(orgId, token);
        if (!rights.Export && !rights.Import) return new(403);
        return new(200, new ArchiveCapabilities(rights.Export, rights.Import, await IsEmpty(orgId, token), ArchiveSchema.MaxArchiveBytes));
    }

    public async Task<ApiOperationResult> ExportOptionsAsync(Guid orgId, CancellationToken token = default)
    {
        if (!(await Rights(orgId, token)).Export) return new(403);
        // Only names and counts are returned; no documentation content or credentials are exposed here.
        var sections = new List<ArchiveSectionOption>();
        foreach (var kind in ArchiveSelection.Sections)
        {
            var types = kind switch { "networks" => new[] { "networks", "ip-entries" }, "diagram" => ["diagram-nodes", "diagram-edges"], "files" => ["files", "folders"], _ => [kind] };
            var count = 0;
            foreach (var type in types)
                count += await ArchiveSchema.Entities.Single(s => s.Kind == type).Count(db, orgId, token);
            sections.Add(new(kind, count));
        }
        var files = await db.StoredFiles.IgnoreQueryFilters().AsNoTracking().Where(f => f.OrganizationId == orgId)
            .OrderBy(f => f.Name).ThenBy(f => f.Id).Take(ArchiveSchema.MaxFiles + 1).Select(f => new ArchiveFileOption(f.Id, f.Name, f.Size)).ToListAsync(token);
        if (files.Count > ArchiveSchema.MaxFiles) return new(413, "Too many files to select for export.");
        return new(200, new ArchiveExportOptions(sections, files));
    }

    public async Task<ApiOperationResult> PrepareDownloadAsync(Guid orgId, ArchiveExportRequest request, ArchiveDownloadStore downloads, CancellationToken token = default)
    {
        var result = await ExportAsync(orgId, request, token);
        if (result.Value is not ArchiveDownload download) return result;
        try
        {
            var stamp = await db.Users.Where(u => u.Id == currentUser.UserId).Select(u => u.SecurityStamp).SingleAsync(token);
            return new(200, new ArchiveDownloadTicket(downloads.Add(download, currentUser.UserId, orgId, stamp)));
        }
        catch { await download.Content.DisposeAsync(); throw; }
    }

    public async Task<ApiOperationResult> DownloadAsync(string ticket, ArchiveDownloadStore downloads, CancellationToken token = default)
    {
        var value = downloads.Take(ticket);
        if (value is null) return new(404);
        var allowed = false;
        try
        {
            allowed = await db.Users.AnyAsync(u => u.Id == value.UserId && u.SecurityStamp == value.SecurityStamp, token) &&
                (await Rights(value.OrganizationId, token, value.UserId)).Export;
            return allowed ? new(200, value.Download) : new(404);
        }
        finally { if (!allowed) await value.Download.Content.DisposeAsync(); }
    }

    private async Task<bool> IsEmpty(Guid orgId, CancellationToken token)
    {
        foreach (var schema in ArchiveSchema.Entities) if (await schema.Any(db, orgId, token)) return false;
        return true;
    }

    private async Task<User?> VerifyPassword(Guid orgId, string? password, CancellationToken token)
    {
        var user = await db.Users.AsNoTracking().SingleAsync(u => u.Id == currentUser.UserId, token);
        if (string.IsNullOrEmpty(password) || password.Length > 1024 || !hasher.Verify(password, user.PasswordHash, user.PasswordSalt))
        {
            audit.SensitiveResourceAccessed("archive_reauthentication_failed", user.Id, orgId, orgId);
            return null;
        }
        return user;
    }

    public async Task<ApiOperationResult> ExportAsync(Guid orgId, ArchiveExportRequest request, CancellationToken token = default)
    {
        if (!(await Rights(orgId, token)).Export) return new(403);
        if (!request.ConfirmSensitiveData) return new(400, "Confirm that the archive contains confidential data and plaintext credentials.");
        if (await VerifyPassword(orgId, request.Password, token) is null) return new(400, "Account password is incorrect.");
        if (request.ArchivePassword is null || request.ArchivePassword.Length < 16 || request.ArchivePassword.Length > 1024)
            return new(400, "Use an archive password with 16 to 1024 characters.");
        return await Guarded(async () =>
        {
            var org = await db.Organizations.AsNoTracking().SingleAsync(o => o.Id == orgId, token);
            var manifest = new ArchiveManifest { OrganizationName = org.Name, CreatedAt = DateTime.UtcNow };
            var path = Path.GetTempFileName();
            var output = new FileStream(path, FileMode.Open, FileAccess.ReadWrite, FileShare.None, 81920,
                FileOptions.Asynchronous | FileOptions.DeleteOnClose);
            try
            {
                await using var transaction = await db.Database.BeginTransactionAsync(db.RepeatableReadFor(), token);
                var selection = await ArchiveSelection.LoadAsync(db, orgId, request, token);
                // Loading is scoped explicitly to this authorized organization; no account or permission entity is reachable.
                long expanded = 0;
                var count = 0;
                long metadataBytes = 0;
                using (var zip = new ZipOutputStream(output) { IsStreamOwner = false, Password = request.ArchivePassword, UseZip64 = UseZip64.Dynamic })
                {
                    foreach (var schema in ArchiveSchema.Entities)
                    {
                        var items = new List<ArchiveItem>();
                        foreach (var entity in selection.Where(record => record.Schema.Kind == schema.Kind).Select(record => record.Entity))
                        {
                            if (++count > ArchiveSchema.MaxRecords) throw new ArchiveValidationException("Too many records to export.", 413);
                            token.ThrowIfCancellationRequested();
                            var id = (Guid)schema.Property("Id").GetValue(entity)!;
                            var data = schema.Fields.ToDictionary(field => field, field => JsonSerializer.SerializeToElement(schema.Property(field).GetValue(entity), ArchiveSchema.Json));
                            if (entity is PasswordEntry password) data["Password"] = JsonSerializer.SerializeToElement(cipher.Decrypt(password.EncryptedPassword));
                            var item = new ArchiveItem(id, data);
                            metadataBytes += JsonSerializer.SerializeToUtf8Bytes(item, ArchiveSchema.Json).Length;
                            if (metadataBytes > ArchiveSchema.MaxManifestBytes) throw new ArchiveValidationException("Archive metadata exceeds its size limit.", 413);
                            items.Add(item);
                            var blob = entity switch { StoredFile file => file.BlobPath, Contract contract => contract.DocumentBlobPath, WarrantyItem warranty => warranty.DocumentBlobPath, _ => null };
                            if (string.IsNullOrEmpty(blob)) continue;
                            if (manifest.Files.Count >= ArchiveSchema.MaxFiles) throw new ArchiveValidationException("Too many files to export.", 413);
                            var entryName = ArchiveSchema.FileEntry(schema.Kind, id);
                            var size = entity switch { StoredFile file => file.Size, Contract contract => contract.DocumentSize ?? -1, WarrantyItem warranty => warranty.DocumentSize ?? -1, _ => -1 };
                            if (size < 0 || size > ArchiveSchema.MaxFileBytes) throw new ArchiveValidationException("File exceeds the 8 GiB size limit.", 413);
                            zip.SetLevel(0);
                            await zip.PutNextEntryAsync(new ZipEntry(entryName) { AESKeySize = 256, Size = size }, token);
                            await using var source = await storage.OpenAsync(blob);
                            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
                            var buffer = new byte[81920];
                            long bytes = 0;
                            int read;
                            while ((read = await source.ReadAsync(buffer, token)) != 0)
                            {
                                bytes += read; expanded += read;
                                if (bytes > ArchiveSchema.MaxFileBytes || expanded > ArchiveSchema.MaxExpandedBytes || output.Length > ArchiveSchema.MaxArchiveBytes)
                                    throw new ArchiveValidationException("Archive or file exceeds its size limit.", 413);
                                hash.AppendData(buffer, 0, read);
                                await zip.WriteAsync(buffer.AsMemory(0, read), token);
                            }
                            await zip.CloseEntryAsync(token);
                            manifest.Files.Add(new(schema.Kind, id, entryName, bytes, Convert.ToHexString(hash.GetHashAndReset())));
                        }
                        manifest.Records.Add(schema.Kind, items);
                    }
                    var json = JsonSerializer.SerializeToUtf8Bytes(manifest, ArchiveSchema.Json);
                    if (json.Length > ArchiveSchema.MaxManifestBytes || expanded + json.Length > ArchiveSchema.MaxExpandedBytes)
                        throw new ArchiveValidationException("Archive metadata exceeds its size limit.", 413);
                    zip.SetLevel(6);
                    await zip.PutNextEntryAsync(new ZipEntry("data.json") { AESKeySize = 256, Size = json.Length }, token);
                    await zip.WriteAsync(json, token);
                    await zip.CloseEntryAsync(token);
                    await zip.FinishAsync(token);
                }
                if (output.Length > ArchiveSchema.MaxArchiveBytes) throw new ArchiveValidationException("Archive exceeds its size limit.", 413);
                await transaction.CommitAsync(token);
                // Verify our own output with the same strict reader used by import: no unusable backup is delivered.
                output.Position = 0;
                await using (var check = await ArchivePackage.ReadAsync(output, db, token, request.ArchivePassword)) { }
                output.Position = 0;
                audit.SensitiveResourceAccessed("organization_archive_exported", currentUser.UserId, orgId, orgId);
                return new(200, new ArchiveDownload(output, $"hexorait-{orgId:N}-{DateTime.UtcNow:yyyyMMdd}.zip"));
            }
            catch { await output.DisposeAsync(); throw; }
        }, orgId, token);
    }

    public async Task<ApiOperationResult> PreviewAsync(Guid orgId, IFormFile file, CancellationToken token = default, string? archivePassword = null)
    {
        if (!(await Rights(orgId, token)).Import) return new(403);
        if (!await IsEmpty(orgId, token)) return new(409, "Import requires an empty organization. Existing documentation is never overwritten.");
        return await Guarded(async () =>
        {
            await using var input = await OpenArchive(file, token);
            var sha = Convert.ToHexString(await SHA256.HashDataAsync(input, token));
            input.Position = 0;
            await using var package = await ArchivePackage.ReadAsync(input, db, token, archivePassword);
            var stamp = await db.Users.Where(u => u.Id == currentUser.UserId).Select(u => u.SecurityStamp).SingleAsync(token);
            var review = new ArchiveReview(currentUser.UserId, orgId, stamp, sha, DateTime.UtcNow.AddMinutes(10));
            var reviewToken = reviewProtector.Protect(JsonSerializer.Serialize(review, ArchiveSchema.Json));
            var manifest = package.Manifest;
            return new(200, new ArchivePreview(manifest.OrganizationName, manifest.CreatedAt,
                manifest.Records.ToDictionary(pair => pair.Key, pair => pair.Value.Count), manifest.Files.Count,
                manifest.Files.Sum(f => f.Size), reviewToken));
        }, orgId, token);
    }

    public async Task<ApiOperationResult> ImportAsync(Guid orgId, IFormFile file, ArchiveImportRequest request, CancellationToken token = default)
    {
        if (!(await Rights(orgId, token)).Import) return new(403);
        var orgName = await db.Organizations.Where(o => o.Id == orgId).Select(o => o.Name).SingleAsync(token);
        if (!request.ConfirmImport || request.ConfirmOrganizationName != orgName) return new(400, "Confirm the import and the exact destination organization name.");
        var user = await VerifyPassword(orgId, request.Password, token);
        if (user is null) return new(400, "Account password is incorrect.");
        return await Guarded(async () =>
        {
            ArchiveReview? review;
            try { review = JsonSerializer.Deserialize<ArchiveReview>(reviewProtector.Unprotect(request.ReviewToken ?? ""), ArchiveSchema.Json); }
            catch (Exception ex) when (ex is CryptographicException or JsonException or ArgumentException)
            { throw new ArchiveValidationException("The import review is invalid or expired. Review the archive again."); }
            if (review is null || review.UserId != user.Id || review.OrganizationId != orgId || review.SecurityStamp != user.SecurityStamp || review.ExpiresAt <= DateTime.UtcNow)
                throw new ArchiveValidationException("The import review is invalid or expired. Review the archive again.");
            await using var input = await OpenArchive(file, token);
            var sha = Convert.ToHexString(await SHA256.HashDataAsync(input, token));
            if (sha != review.Sha256) throw new ArchiveValidationException("The archive changed after review. Review it again.");
            input.Position = 0;
            await using var package = await ArchivePackage.ReadAsync(input, db, token, request.ArchivePassword);
            var blobs = new List<string>();
            var committed = false;
            try
            {
                // Stage files first. Only new blobs are created and all are removed if the transaction fails.
                foreach (var attachment in package.Manifest.Files)
                {
                    var staged = package.Files[attachment.Entry];
                    await using var source = File.OpenRead(staged.Path);
                    var blob = await storage.SaveAsync(source, staged.Upload.FileName, staged.Upload.ContentType);
                    blobs.Add(blob);
                    var owner = package.Index[(attachment.Kind, attachment.RecordId)].Entity;
                    switch (owner)
                    {
                        case StoredFile stored: stored.BlobPath = blob; break;
                        case Contract contract: contract.DocumentBlobPath = blob; break;
                        case WarrantyItem warranty: warranty.DocumentBlobPath = blob; break;
                    }
                }
                await using var transaction = await db.Database.BeginTransactionAsync(IsolationLevel.Serializable, token);
                if (db.Database.IsNpgsql())
                {
                    // Ordinary API writes do not take advisory locks. Actual table locks also cover those writers.
                    // Short critical section: validation and file IO are already complete. Stable order avoids lock inversions.
                    var tables = ArchiveSchema.Entities.Select(s => db.Model.FindEntityType(s.Type)!.GetTableName()!).Distinct().Order().Select(t => '"' + t.Replace("\"", "\"\"") + '"');
                    await db.Database.ExecuteSqlRawAsync("SET LOCAL lock_timeout = '10s'", token);
                    // Identifiers come exclusively from EF model metadata, never from the archive or request.
#pragma warning disable EF1003
                    await db.Database.ExecuteSqlRawAsync("LOCK TABLE " + string.Join(", ", tables) + " IN SHARE ROW EXCLUSIVE MODE", token);
#pragma warning restore EF1003
                }
                if (!(await Rights(orgId, token)).Import) return new(403);
                var destination = await db.Organizations.AsNoTracking().SingleAsync(o => o.Id == orgId, token);
                if (destination.Name != request.ConfirmOrganizationName || !await IsEmpty(orgId, token))
                    return new(409, "Import requires an empty organization. Existing documentation is never overwritten.");
                Remap(package, orgId);
                db.AddRange(package.Records.Select(r => r.Entity));
                await db.SaveChangesAsync(token);
                await transaction.CommitAsync(token);
                committed = true;
                audit.SensitiveResourceAccessed("organization_archive_imported", currentUser.UserId, orgId, orgId);
                return new(200, new { importedRecords = package.Records.Count, importedFiles = package.Files.Count });
            }
            finally
            {
                if (!committed)
                {
                    foreach (var record in package.Records) db.Entry(record.Entity).State = EntityState.Detached;
                    foreach (var blob in blobs)
                    {
                        try { await storage.DeleteAsync(blob); }
                        catch (Exception ex) { logger.LogError(ex, "Unable to clean up staged organization archive blob {Blob}", blob); }
                    }
                }
            }
        }, orgId, token);
    }

    private void Remap(ArchivePackage package, Guid orgId)
    {
        var map = package.Records.ToDictionary(r => (r.Schema.Kind, r.OriginalId), _ => Guid.NewGuid());
        var passwords = package.Manifest.Records["passwords"].ToDictionary(r => r.Id);
        Guid Id(string kind, Guid old) => map[(kind, old)];
        Guid? Optional(string kind, Guid? old) => old is { } value ? Id(kind, value) : null;
        foreach (var record in package.Records)
        {
            record.Schema.Property("Id").SetValue(record.Entity, Id(record.Schema.Kind, record.OriginalId));
            if (record.Entity is not IPEntry) record.Schema.Property("OrganizationId").SetValue(record.Entity, orgId);
            switch (record.Entity)
            {
                case PasswordEntry password:
                    password.EncryptedPassword = cipher.Encrypt(passwords[record.OriginalId].Data["Password"].GetString()!); break;
                case IPEntry ip: ip.SubnetId = Id("networks", ip.SubnetId); ip.AssetId = Optional("assets", ip.AssetId); break;
                case WorkTask task: task.ProjectId = Optional("projects", task.ProjectId); break;
                case Plan plan: plan.AssetIds = plan.AssetIds.Select(id => Id("assets", id)).ToList(); plan.SubnetIds = plan.SubnetIds.Select(id => Id("networks", id)).ToList(); break;
                case Group group: group.LinkedAssets = group.LinkedAssets.Select(id => Id("assets", id)).ToList(); break;
                case WarrantyItem warranty: warranty.AssetId = Optional("assets", warranty.AssetId); break;
                case FileFolder folder: folder.ParentFolderId = Optional("folders", folder.ParentFolderId); break;
                case StoredFile file: file.FolderId = Optional("folders", file.FolderId); break;
                case DiagramNode node: node.AssetId = Optional("assets", node.AssetId); break;
                case DiagramEdge edge: edge.SourceNodeId = Id("diagram-nodes", edge.SourceNodeId); edge.TargetNodeId = Id("diagram-nodes", edge.TargetNodeId); break;
            }
        }
    }

    private static async Task<FileStream> OpenArchive(IFormFile file, CancellationToken token)
    {
        if (file.Length <= 0 || file.Length > ArchiveSchema.MaxArchiveBytes) throw new ArchiveValidationException("Invalid archive size.", 413);
        var stream = new FileStream(Path.GetTempFileName(), FileMode.Open, FileAccess.ReadWrite, FileShare.None, 81920, FileOptions.Asynchronous | FileOptions.DeleteOnClose);
        try
        {
            await using var source = file.OpenReadStream();
            var bytes = await ArchivePackage.CopyBoundedAsync(source, stream, ArchiveSchema.MaxArchiveBytes, token);
            if (bytes != file.Length) throw new ArchiveValidationException("Archive size mismatch.");
            stream.Position = 0;
            return stream;
        }
        catch { await stream.DisposeAsync(); throw; }
    }

    private async Task<ApiOperationResult> Guarded(Func<Task<ApiOperationResult>> action, Guid orgId, CancellationToken token)
    {
        if (!await Slots.WaitAsync(0, token)) return new(429, "Archive processing is busy. Please try again later.");
        var leased = false;
        try
        {
            var result = await action();
            if (result.Value is ArchiveDownload download)
            {
                // A slow download retains its slot and temporary-file budget until HTTP disposes the stream.
                result = result with { Value = download with { Content = new DownloadLease(download.Content) } };
                leased = true;
            }
            return result;
        }
        catch (ArchiveValidationException ex) { audit.SensitiveResourceAccessed("organization_archive_rejected", currentUser.UserId, orgId, orgId); return new(ex.StatusCode, ex.Message); }
        catch (ICSharpCode.SharpZipLib.SharpZipBaseException) { return new(400, "Archive password is incorrect or the ZIP is damaged."); }
        catch (Exception ex) when (ex is InvalidDataException or JsonException or FormatException or OverflowException or ArgumentException)
        { return new(400, "The archive is invalid, corrupted or unsupported."); }
        catch (Exception ex) when (ex is DbUpdateException or DbException or IOException or KeyNotFoundException or CryptographicException)
        { return new(409, "The operation could not complete. No documentation was overwritten. Verify the archive and try again."); }
        finally { if (!leased) Slots.Release(); }
    }

    private sealed class DownloadLease(Stream inner) : Stream
    {
        private int disposed;
        public override bool CanRead => inner.CanRead;
        public override bool CanSeek => inner.CanSeek;
        public override bool CanWrite => false;
        public override long Length => inner.Length;
        public override long Position { get => inner.Position; set => inner.Position = value; }
        public override int Read(byte[] buffer, int offset, int count) => inner.Read(buffer, offset, count);
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default) => inner.ReadAsync(buffer, cancellationToken);
        public override long Seek(long offset, SeekOrigin origin) => inner.Seek(offset, origin);
        public override void Flush() => inner.Flush();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        protected override void Dispose(bool disposing)
        {
            if (disposing && Interlocked.Exchange(ref disposed, 1) == 0)
                try { inner.Dispose(); } finally { Slots.Release(); }
            base.Dispose(disposing);
        }
        public override async ValueTask DisposeAsync()
        {
            if (Interlocked.Exchange(ref disposed, 1) == 0)
                try { await inner.DisposeAsync(); } finally { Slots.Release(); }
            GC.SuppressFinalize(this);
        }
    }
}

internal static class ArchiveIsolation
{
    public static IsolationLevel RepeatableReadFor(this AppDbContext db) => db.Database.IsNpgsql() ? IsolationLevel.RepeatableRead : IsolationLevel.Serializable;
}
