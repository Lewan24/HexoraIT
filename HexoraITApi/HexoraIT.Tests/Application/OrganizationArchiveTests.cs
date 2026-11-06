using System.IO.Compression;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Application;
using HexoraITApi.Application.DataTransfer;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexoraIT.Tests.Application;

public sealed class OrganizationArchiveTests : IDisposable
{
    private readonly TestFixture fixture = new();
    private readonly EphemeralDataProtectionProvider protection = new();
    private readonly Pbkdf2PasswordHasher hasher = new();
    private readonly Audit audit = new();
    private const string Password = "Correct account password!";
    private OrganizationArchiveService Service(IFileStorage? storage = null, IPasswordCipher? passwordCipher = null) => new(fixture.Db, fixture.UserContext, hasher,
        passwordCipher ?? fixture.Cipher, storage ?? fixture.Storage, protection, audit, NullLogger<OrganizationArchiveService>.Instance);

    private (User User, Organization Org) Seed(OrgRole role = OrgRole.Owner)
    {
        var (user, org) = fixture.SeedUserWithOrg(role);
        (user.PasswordHash, user.PasswordSalt) = hasher.Hash(Password);
        fixture.Db.SaveChanges();
        return (user, org);
    }
    private async Task<Organization> Destination(User user, OrgRole role = OrgRole.Owner)
    {
        var org = new Organization { Name = "Destination", HiddenModules = ["tasks"] };
        fixture.Db.AddRange(org, new UserOrganization { UserId = user.Id, OrganizationId = org.Id, Role = role });
        await fixture.Db.SaveChangesAsync();
        return org;
    }
    private static IFormFile Upload(byte[] bytes) => new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "archive.zip");
    private async Task<byte[]> Export(Guid org)
    {
        var result = await Service().ExportAsync(org, new(Password, true, ArchiveTestZip.Password));
        result.StatusCode.Should().Be(200, "{0}", result.Value);
        var download = (ArchiveDownload)result.Value!;
        await using var stream = download.Content;
        using var bytes = new MemoryStream(); await stream.CopyToAsync(bytes); return bytes.ToArray();
    }
    private async Task<ArchivePreview> Preview(Guid org, byte[] bytes)
    {
        var result = await Service().PreviewAsync(org, Upload(bytes), archivePassword: ArchiveTestZip.Password);
        result.StatusCode.Should().Be(200, "{0}", result.Value);
        return (ArchivePreview)result.Value!;
    }
    private static byte[] Rewrite(byte[] bytes, Action<ArchiveManifest>? change = null, Action<ZipArchive>? extra = null)
    {
        using var input = ArchiveTestZip.Decrypt(bytes);
        using var source = new ZipArchive(input, ZipArchiveMode.Read);
        using var output = new MemoryStream();
        using (var zip = new ZipArchive(output, ZipArchiveMode.Create, true))
        {
            foreach (var entry in source.Entries)
            {
                using var from = entry.Open();
                using var to = zip.CreateEntry(entry.FullName).Open();
                if (entry.FullName == "data.json")
                {
                    var manifest = JsonSerializer.Deserialize<ArchiveManifest>(from, ArchiveSchema.Json)!;
                    change?.Invoke(manifest); JsonSerializer.Serialize(to, manifest, ArchiveSchema.Json);
                }
                else from.CopyTo(to);
            }
            extra?.Invoke(zip);
        }
        return output.ToArray();
    }

    [Theory]
    [InlineData(OrgRole.Owner, 200)]
    [InlineData(OrgRole.Admin, 200)]
    [InlineData(OrgRole.Member, 403)]
    [InlineData(OrgRole.ReadOnly, 403)]
    public async Task BuiltInRolesDoNotGiveMembersArchivePermissions(OrgRole role, int expected)
    {
        var (user, org) = Seed(role);
        fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "Test" }); await fixture.Db.SaveChangesAsync();
        (await Service().CapabilitiesAsync(org.Id)).StatusCode.Should().Be(expected);
        var result = await Service().ExportAsync(org.Id, new(Password, true, ArchiveTestZip.Password));
        result.StatusCode.Should().Be(expected);
        if (result.Value is ArchiveDownload download) await download.Content.DisposeAsync();
        (await fixture.UserContext.HasPermissionAsync(org.Id, "data-transfer")).Should().Be(expected == 200);
        if (expected == 403)
        {
            (await Service().PreviewAsync(org.Id, Upload([1, 2]), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(403);
            (await Service().ImportAsync(org.Id, Upload([1, 2]), new(Password, "", org.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(403);
        }
    }

    [Fact]
    public async Task RoundTripPreservesEveryDataTypeFilesSecretsOrderingAndRelationshipsButNoAccountsOrPermissions()
    {
        var (user, org) = Seed();
        var asset = new Asset { OrganizationId = org.Id, Name = "Router", SortIndex = 17, Notes = "Inventory", Type = AssetType.Network };
        var subnet = new Subnet { OrganizationId = org.Id, Name = "LAN", Cidr = "10.0.0.0/24" };
        var project = new Project { OrganizationId = org.Id, Name = "Upgrade" };
        var folder = new FileFolder { OrganizationId = org.Id, Name = "Documents" };
        var child = new FileFolder { OrganizationId = org.Id, Name = "Manuals", ParentFolderId = folder.Id };
        var node = new DiagramNode { OrganizationId = org.Id, AssetId = asset.Id, Label = "Router", X = 100, Y = 200 };
        var node2 = new DiagramNode { OrganizationId = org.Id, Label = "Internet" };
        var payload = Encoding.UTF8.GetBytes("Attachment data with Polish text: Łódź");
        var blob = await fixture.Storage.SaveAsync(new MemoryStream(payload), "manual.txt", "text/plain");
        fixture.Db.AddRange(asset, subnet, project, folder, child, node, node2,
            new DiagramEdge { OrganizationId = org.Id, SourceNodeId = node.Id, TargetNodeId = node2.Id },
            new IPEntry { SubnetId = subnet.Id, AssetId = asset.Id, Ip = "10.0.0.1", IsAutoManaged = true, Status = IPEntryStatus.Used },
            new PasswordEntry { OrganizationId = org.Id, Name = "Login", Username = "admin", EncryptedPassword = fixture.Cipher.Encrypt("literal-#secret"), Tags = ["internal"] },
            new HexoraITApi.Domain.Entities.License { OrganizationId = org.Id, Name = "License", LicenseKey = "KEY", Cost = 100.25m },
            new Contact { OrganizationId = org.Id, Name = "Contact" },
            new Contract { OrganizationId = org.Id, Name = "Support", DocumentName = "contract.txt", DocumentMimeType = "text/plain", DocumentSize = payload.Length, DocumentBlobPath = blob },
            new WarrantyItem { OrganizationId = org.Id, Name = "Warranty", AssetId = asset.Id, DocumentName = "warranty.txt", DocumentMimeType = "text/plain", DocumentSize = payload.Length, DocumentBlobPath = blob },
            new StoredFile { OrganizationId = org.Id, Name = "manual.txt", MimeType = "text/plain", Size = payload.Length, BlobPath = blob, FolderId = child.Id },
            new WorkTask { OrganizationId = org.Id, Title = "Task", ProjectId = project.Id, CreatedByUserId = user.Id, CreatedByName = "ACCOUNT_ATTRIBUTION" },
            new Plan { OrganizationId = org.Id, Title = "Plan", AssetIds = [asset.Id], SubnetIds = [subnet.Id] },
            new Incident { OrganizationId = org.Id, Title = "Incident" },
            new KnowledgeArticle { OrganizationId = org.Id, Title = "Guide", Content = "**Exact markdown**" },
            new Group { OrganizationId = org.Id, Name = "Group", LinkedAssets = [asset.Id] },
            new PrivateNote { OrganizationId = org.Id, UserId = user.Id, Title = "Private", Content = "DO_NOT_EXPORT_PRIVATE" });
        var foreign = new Organization { Name = "Foreign" };
        fixture.Db.AddRange(foreign, new Contact { OrganizationId = foreign.Id, Name = "DO_NOT_EXPORT_FOREIGN" });
        await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id);
        using (var archive = new ZipArchive(ArchiveTestZip.Decrypt(zip)))
        using (var reader = new StreamReader(archive.GetEntry("data.json")!.Open()))
        {
            var json = await reader.ReadToEndAsync();
            foreach (var excluded in new[] { "EncryptedPassword", "BlobPath", "PasswordHash", "CustomRoleId", "CreatedByUserId", "ACCOUNT_ATTRIBUTION", "DO_NOT_EXPORT_PRIVATE", "DO_NOT_EXPORT_FOREIGN" }) json.Should().NotContain(excluded);
            json.Should().Contain("literal-#secret");
        }
        var destination = await Destination(user);
        var preview = await Preview(destination.Id, zip);
        preview.FileCount.Should().Be(3);
        preview.Counts.Where(p => p.Value > 0).Should().HaveCount(ArchiveSchema.Entities.Length);
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(200);
        fixture.Db.ChangeTracker.Clear();
        var importedAsset = await fixture.Db.Assets.SingleAsync(a => a.OrganizationId == destination.Id);
        importedAsset.Id.Should().NotBe(asset.Id); importedAsset.SortIndex.Should().Be(17);
        var ip = await fixture.Db.IPEntries.SingleAsync(i => i.Subnet.OrganizationId == destination.Id);
        ip.AssetId.Should().Be(importedAsset.Id); ip.SubnetId.Should().NotBe(subnet.Id);
        (await fixture.Db.Plans.SingleAsync(p => p.OrganizationId == destination.Id)).AssetIds.Should().Equal(importedAsset.Id);
        (await fixture.Db.Groups.SingleAsync(p => p.OrganizationId == destination.Id)).LinkedAssets.Should().Equal(importedAsset.Id);
        var task = await fixture.Db.Tasks.SingleAsync(t => t.OrganizationId == destination.Id);
        task.ProjectId.Should().NotBe(project.Id); task.CreatedByUserId.Should().BeNull(); task.CreatedByName.Should().BeNull();
        var password = await fixture.Db.Passwords.SingleAsync(p => p.OrganizationId == destination.Id);
        fixture.Cipher.Decrypt(password.EncryptedPassword).Should().Be("literal-#secret");
        var stored = await fixture.Db.StoredFiles.SingleAsync(f => f.OrganizationId == destination.Id);
        stored.BlobPath.Should().NotBe(blob);
        await using var restored = await fixture.Storage.OpenAsync(stored.BlobPath);
        using var buffer = new MemoryStream(); await restored.CopyToAsync(buffer); buffer.ToArray().Should().Equal(payload);
        var restoredFolder = await fixture.Db.FileFolders.SingleAsync(f => f.Id == stored.FolderId);
        restoredFolder.ParentFolderId.Should().NotBe(folder.Id).And.NotBeNull();
        var edge = await fixture.Db.DiagramEdges.SingleAsync(e => e.OrganizationId == destination.Id);
        edge.SourceNodeId.Should().NotBe(node.Id); edge.TargetNodeId.Should().NotBe(node2.Id);
        (await fixture.Db.Users.CountAsync()).Should().Be(1);
        (await fixture.Db.UserOrganizations.CountAsync()).Should().Be(2);
        (await fixture.Db.PrivateNotes.CountAsync(n => n.OrganizationId == destination.Id)).Should().Be(0);
        (await fixture.Db.Organizations.SingleAsync(o => o.Id == destination.Id)).HiddenModules.Should().Equal("tasks");
        audit.Actions.Should().Contain(["organization_archive_exported", "organization_archive_imported"]);
    }

    [Fact]
    public async Task PasswordConfirmationAndEmptyDestinationAreEnforcedAndPreviewDoesNotWrite()
    {
        var (user, org) = Seed();
        fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "Keep" }); await fixture.Db.SaveChangesAsync();
        (await Service().ExportAsync(org.Id, new("wrong", true))).StatusCode.Should().Be(400);
        (await Service().ExportAsync(org.Id, new(Password, false))).StatusCode.Should().Be(400);
        var zip = await Export(org.Id); var destination = await Destination(user);
        var preview = await Preview(destination.Id, zip);
        (await fixture.Db.Contacts.CountAsync(c => c.OrganizationId == destination.Id)).Should().Be(0);
        (await Service().ImportAsync(destination.Id, Upload(zip), new("wrong", preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, "Other", true, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, destination.Name, false, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
        fixture.Db.Contacts.Add(new Contact { OrganizationId = destination.Id, Name = "Added after review" }); await fixture.Db.SaveChangesAsync();
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(409);
        (await Service().PreviewAsync(destination.Id, Upload(zip), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(409);
        (await fixture.Db.Contacts.SingleAsync(c => c.OrganizationId == destination.Id)).Name.Should().Be("Added after review");
    }

    [Fact]
    public async Task ReviewCannotBeForgedReusedForAnotherOrganizationOrUsedAfterFileOrAccountChanges()
    {
        var (user, org) = Seed();
        fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "Test" }); await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user); var second = await Destination(user);
        var preview = await Preview(destination.Id, zip);
        (await Service().ImportAsync(second.Id, Upload(zip), new(Password, preview.ReviewToken, second.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, "forged", destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
        var changed = Rewrite(zip, m => m.OrganizationName = "Changed");
        (await Service().ImportAsync(destination.Id, Upload(changed), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
        user.SecurityStamp = Guid.NewGuid(); await fixture.Db.SaveChangesAsync();
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task CustomRoleNeedsExplicitArchiveGrantAndClientsSystemAdminsAndForeignUsersCannotEscalate()
    {
        var (user, org) = Seed(OrgRole.Member);
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Transfer", Permissions = [] };
        fixture.Db.Add(role);
        var membership = await fixture.Db.UserOrganizations.SingleAsync(); membership.CustomRoleId = role.Id;
        await fixture.Db.SaveChangesAsync();
        (await Service().CapabilitiesAsync(org.Id)).StatusCode.Should().Be(403);
        var rule = new RolePermission { RoleId = role.Id, Resource = "data-transfer", CanRead = true };
        fixture.Db.Add(rule); await fixture.Db.SaveChangesAsync();
        var capabilities = (ArchiveCapabilities)(await Service().CapabilitiesAsync(org.Id)).Value!;
        capabilities.CanExport.Should().BeTrue(); capabilities.CanImport.Should().BeFalse();
        rule.CanWrite = true; await fixture.Db.SaveChangesAsync();
        ((ArchiveCapabilities)(await Service().CapabilitiesAsync(org.Id)).Value!).CanImport.Should().BeTrue();
        user.SystemRole = SystemRole.Client; await fixture.Db.SaveChangesAsync();
        (await Service().CapabilitiesAsync(org.Id)).StatusCode.Should().Be(403);
        user.SystemRole = SystemRole.Admin; fixture.Db.RolePermissions.Remove(rule); await fixture.Db.SaveChangesAsync();
        (await Service().CapabilitiesAsync(org.Id)).StatusCode.Should().Be(403);
        (await Service().CapabilitiesAsync(Guid.NewGuid())).StatusCode.Should().Be(403);
        membership.CustomRoleId = null; membership.Role = OrgRole.Owner; org.IsArchived = true; await fixture.Db.SaveChangesAsync();
        (await Service().CapabilitiesAsync(org.Id)).StatusCode.Should().Be(403);
    }

    [Theory]
    [InlineData("../escape")]
    [InlineData("files/../../escape")]
    [InlineData("C:/escape")]
    [InlineData("files\\escape")]
    [InlineData("unexpected.txt")]
    [InlineData("data.json")]
    public async Task UnsafeUnexpectedAndDuplicateZipEntriesAreRejected(string name)
    {
        var (user, org) = Seed(); fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "Test" }); await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user);
        var poisoned = Rewrite(zip, extra: archive => { using var writer = new StreamWriter(archive.CreateEntry(name).Open()); writer.Write("payload"); });
        (await Service().PreviewAsync(destination.Id, Upload(poisoned), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(400);
        (await fixture.Db.Contacts.CountAsync(c => c.OrganizationId == destination.Id)).Should().Be(0);
    }

    [Theory]
    [InlineData("version")]
    [InlineData("permission-field")]
    [InlineData("null-collection")]
    [InlineData("duplicate-id")]
    [InlineData("missing-section")]
    [InlineData("foreign-link")]
    [InlineData("folder-cycle")]
    public async Task InvalidSchemaAndRelationshipsAreRejectedBeforeAnyWrite(string attack)
    {
        var (user, org) = Seed(); var asset = new Asset { OrganizationId = org.Id, Name = "Test" };
        var folder = new FileFolder { OrganizationId = org.Id, Name = "Folder" };
        fixture.Db.AddRange(asset, folder, new Group { OrganizationId = org.Id, Name = "Group", LinkedAssets = [asset.Id] }); await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user);
        var poisoned = Rewrite(zip, manifest =>
        {
            var data = manifest.Records["assets"][0].Data;
            switch (attack)
            {
                case "version": manifest.Version = 999; break;
                case "permission-field": data["CustomRoleId"] = JsonSerializer.SerializeToElement(Guid.NewGuid()); break;
                case "null-collection": data["Tags"] = JsonSerializer.SerializeToElement<object?>(null); break;
                case "duplicate-id": manifest.Records["assets"].Add(manifest.Records["assets"][0]); break;
                case "missing-section": manifest.Records.Remove("passwords"); break;
                case "foreign-link": manifest.Records["groups"][0].Data["LinkedAssets"] = JsonSerializer.SerializeToElement(new[] { Guid.NewGuid() }); break;
                case "folder-cycle": manifest.Records["folders"][0].Data["ParentFolderId"] = JsonSerializer.SerializeToElement(folder.Id); break;
            }
        });
        (await Service().PreviewAsync(destination.Id, Upload(poisoned), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task MissingCorruptedOrDisguisedAttachmentsAndOversizedArchivesAreRejected()
    {
        var (user, org) = Seed(); var payload = "file content"u8.ToArray();
        var blob = await fixture.Storage.SaveAsync(new MemoryStream(payload), "data.txt", "text/plain");
        fixture.Db.StoredFiles.Add(new StoredFile { OrganizationId = org.Id, Name = "data.txt", Size = payload.Length, BlobPath = blob }); await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user);
        foreach (var attack in new[] { "checksum", "size", "name", "missing" })
        {
            var bad = Rewrite(zip, manifest =>
            {
                if (attack == "checksum") manifest.Files[0] = manifest.Files[0] with { Sha256 = new string('0', 64) };
                if (attack == "size") manifest.Files[0] = manifest.Files[0] with { Size = ArchiveSchema.MaxFileBytes + 1 };
                if (attack == "name") manifest.Records["files"][0].Data["Name"] = JsonSerializer.SerializeToElement("disguised.pdf");
                if (attack == "missing") manifest.Files.Clear();
            });
            (await Service().PreviewAsync(destination.Id, Upload(bad), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().BeOneOf(400, 413);
        }
        var huge = new FormFile(new MemoryStream([1]), 0, ArchiveSchema.MaxArchiveBytes + 1, "file", "huge.zip");
        (await Service().PreviewAsync(destination.Id, huge, archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(413);
        (await Service().PreviewAsync(destination.Id, Upload("not a zip"u8.ToArray()), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(400);
    }

    public void Dispose() => fixture.Dispose();

    [Fact]
    public async Task EveryExportedEntryUsesAes256AndJsonCannotBeReadWithoutTheArchivePassword()
    {
        var (user, org) = Seed();
        fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "CONFIDENTIAL_JSON_MARKER" });
        await fixture.Db.SaveChangesAsync();
        var bytes = await Export(org.Id);
        using (var encrypted = new ICSharpCode.SharpZipLib.Zip.ZipFile(new MemoryStream(bytes)))
            foreach (ICSharpCode.SharpZipLib.Zip.ZipEntry entry in encrypted)
            {
                entry.IsCrypted.Should().BeTrue(); entry.AESKeySize.Should().Be(256);
                Action read = () => { using var content = encrypted.GetInputStream(entry); content.CopyTo(Stream.Null); };
                read.Should().Throw<Exception>();
            }
        Encoding.UTF8.GetString(bytes).Should().NotContain("CONFIDENTIAL_JSON_MARKER");
        var destination = await Destination(user);
        (await Service().PreviewAsync(destination.Id, Upload(bytes))).StatusCode.Should().Be(400);
        (await Service().PreviewAsync(destination.Id, Upload(bytes), archivePassword: "wrong archive password")).StatusCode.Should().Be(400);
        var preview = await Preview(destination.Id, bytes);
        preview.Counts["contacts"].Should().Be(1);
        (await Service().ExportAsync(org.Id, new(Password, true, "short"))).StatusCode.Should().Be(400);

        // This fixture has only data.json, so the first local entry is its AES ciphertext.
        var damaged = bytes.ToArray();
        var dataStart = 30 + BitConverter.ToUInt16(damaged, 26) + BitConverter.ToUInt16(damaged, 28);
        damaged[dataStart + 24] ^= 0x5a;
        (await Service().PreviewAsync(destination.Id, Upload(damaged), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task PartialExportIncludesOnlySelectedFilesAndSectionsPlusRequiredDependencies()
    {
        var (_, org) = Seed();
        var project = new Project { OrganizationId = org.Id, Name = "Required project" };
        var folder = new FileFolder { OrganizationId = org.Id, Name = "Required folder" };
        var blob = await fixture.Storage.SaveAsync(new MemoryStream("payload"u8.ToArray()), "report.txt", "text/plain");
        var included = new StoredFile { OrganizationId = org.Id, Name = "report.txt", FolderId = folder.Id, Size = 7, BlobPath = blob };
        fixture.Db.AddRange(project, folder, included,
            new StoredFile { OrganizationId = org.Id, Name = "excluded.txt", Size = 7, BlobPath = blob },
            new WorkTask { OrganizationId = org.Id, Title = "Selected task", ProjectId = project.Id },
            new PasswordEntry { OrganizationId = org.Id, Name = "EXCLUDED_VAULT", EncryptedPassword = fixture.Cipher.Encrypt("secret") },
            new Contract { OrganizationId = org.Id, Name = "Contract without attachment", DocumentName = "contract.txt", DocumentSize = 7, DocumentBlobPath = blob, DocumentMimeType = "text/plain" });
        await fixture.Db.SaveChangesAsync();
        var options = (ArchiveExportOptions)(await Service().ExportOptionsAsync(org.Id)).Value!;
        options.Files.Should().HaveCount(2);
        var result = await Service().ExportAsync(org.Id, new(Password, true, ArchiveTestZip.Password,
            ["tasks", "files", "contracts"], [included.Id], IncludeAttachments: false));
        result.StatusCode.Should().Be(200, "{0}", result.Value);
        await using var output = ((ArchiveDownload)result.Value!).Content;
        using var memory = new MemoryStream(); await output.CopyToAsync(memory);
        using var plain = ArchiveTestZip.Decrypt(memory.ToArray());
        using var archive = new ZipArchive(plain);
        archive.Entries.Should().HaveCount(2);
        using var json = archive.GetEntry("data.json")!.Open();
        var manifest = JsonSerializer.Deserialize<ArchiveManifest>(json, ArchiveSchema.Json)!;
        manifest.Records["passwords"].Should().BeEmpty();
        manifest.Records["projects"].Should().ContainSingle(record => record.Id == project.Id);
        manifest.Records["folders"].Should().ContainSingle(record => record.Id == folder.Id);
        manifest.Records["files"].Should().ContainSingle(record => record.Id == included.Id);
        manifest.Files.Should().ContainSingle();
        manifest.Records["contracts"][0].Data["DocumentName"].ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task VaultCredentialsCanMoveBetweenInstancesWithDifferentEncryptionKeys()
    {
        var (user, org) = Seed();
        var sourceCipher = new DataProtectionPasswordCipher(new EphemeralDataProtectionProvider());
        var destinationCipher = new DataProtectionPasswordCipher(new EphemeralDataProtectionProvider());
        const string secret = "Literal \"quotes\", slash \\ and Polish Łódź!";
        var original = sourceCipher.Encrypt(secret);
        fixture.Db.Passwords.Add(new PasswordEntry { OrganizationId = org.Id, Name = "Portable credential", EncryptedPassword = original });
        await fixture.Db.SaveChangesAsync();
        var result = await Service(passwordCipher: sourceCipher).ExportAsync(org.Id, new(Password, true, ArchiveTestZip.Password));
        result.StatusCode.Should().Be(200);
        await using var stream = ((ArchiveDownload)result.Value!).Content;
        using var buffer = new MemoryStream(); await stream.CopyToAsync(buffer); var bytes = buffer.ToArray();
        await stream.DisposeAsync();
        var destination = await Destination(user); var preview = await Preview(destination.Id, bytes);
        (await Service(passwordCipher: destinationCipher).ImportAsync(destination.Id, Upload(bytes), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(200);
        var restored = await fixture.Db.Passwords.SingleAsync(p => p.OrganizationId == destination.Id);
        restored.EncryptedPassword.Should().NotEqual(original);
        destinationCipher.Decrypt(restored.EncryptedPassword).Should().Be(secret);
    }

    [Fact]
    public async Task DatabaseFailureRollsBackAllImportedRecordsAndDeletesStagedBlobs()
    {
        var (user, org) = Seed();
        var payload = "restore me"u8.ToArray();
        var blob = await fixture.Storage.SaveAsync(new MemoryStream(payload), "restore.txt", "text/plain");
        fixture.Db.AddRange(new Contact { OrganizationId = org.Id, Name = "Contact" },
            new StoredFile { OrganizationId = org.Id, Name = "restore.txt", Size = payload.Length, BlobPath = blob });
        await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user); var preview = await Preview(destination.Id, zip);
        var before = ((HexoraIT.Tests.Fakes.FakeFileStorage)fixture.Storage).Paths.ToHashSet();
        await fixture.Db.Database.ExecuteSqlRawAsync("CREATE TRIGGER fail_archive_insert BEFORE INSERT ON Contacts BEGIN SELECT RAISE(ABORT, 'injected failure'); END;");
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(409);
        (await fixture.Db.Contacts.CountAsync(c => c.OrganizationId == destination.Id)).Should().Be(0);
        (await fixture.Db.StoredFiles.CountAsync(c => c.OrganizationId == destination.Id)).Should().Be(0);
        ((HexoraIT.Tests.Fakes.FakeFileStorage)fixture.Storage).Paths.Should().BeEquivalentTo(before);
        audit.Actions.Should().NotContain("organization_archive_imported");
    }

    [Fact]
    public async Task FailedFileStagingDeletesPreviouslyCreatedBlobsAndNeverStartsImport()
    {
        var (user, org) = Seed();
        var payload = "restore me"u8.ToArray();
        var blob = await fixture.Storage.SaveAsync(new MemoryStream(payload), "restore.txt", "text/plain");
        fixture.Db.StoredFiles.AddRange(Enumerable.Range(0, 2).Select(i => new StoredFile { OrganizationId = org.Id, Name = $"file{i}.txt", Size = payload.Length, BlobPath = blob }));
        await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user); var preview = await Preview(destination.Id, zip);
        var before = ((HexoraIT.Tests.Fakes.FakeFileStorage)fixture.Storage).Paths.ToHashSet();
        var failing = new FailSecondSave(fixture.Storage);
        (await Service(failing).ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(409);
        ((HexoraIT.Tests.Fakes.FakeFileStorage)fixture.Storage).Paths.Should().BeEquivalentTo(before);
        (await fixture.Db.StoredFiles.CountAsync(c => c.OrganizationId == destination.Id)).Should().Be(0);
    }

    [Fact]
    public async Task ExpiredOrDifferentUserReviewAndRevokedPermissionsCannotCommit()
    {
        var (user, org) = Seed(); fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "Test" }); await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user); var preview = await Preview(destination.Id, zip);
        var protector = protection.CreateProtector("HexoraIT.OrganizationArchive.Review.v1");
        var review = JsonSerializer.Deserialize<ArchiveReview>(protector.Unprotect(preview.ReviewToken), ArchiveSchema.Json)!;
        foreach (var bad in new[] { review with { UserId = Guid.NewGuid() }, review with { ExpiresAt = DateTime.UtcNow.AddSeconds(-1) } })
        {
            var token = protector.Protect(JsonSerializer.Serialize(bad, ArchiveSchema.Json));
            (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, token, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(400);
        }
        var member = await fixture.Db.UserOrganizations.SingleAsync(m => m.OrganizationId == destination.Id);
        member.Role = OrgRole.Member; await fixture.Db.SaveChangesAsync();
        (await Service().ImportAsync(destination.Id, Upload(zip), new(Password, preview.ReviewToken, destination.Name, true, ArchiveTestZip.Password))).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task CompressedBombEntryIsRejectedFromMetadataBeforeDecompression()
    {
        var (user, org) = Seed(); fixture.Db.Contacts.Add(new Contact { OrganizationId = org.Id, Name = "Test" }); await fixture.Db.SaveChangesAsync();
        var zip = await Export(org.Id); var destination = await Destination(user);
        var bomb = Rewrite(zip, manifest => manifest.Files.Add(new("files", Guid.NewGuid(), "files/bomb.bin", ArchiveSchema.MaxFileBytes + 1, new string('0', 64))),
            extra: archive => { using var entry = archive.CreateEntry("files/bomb.bin").Open(); entry.WriteByte(0); });
        bomb.Length.Should().BeLessThan(2 * 1024 * 1024);
        (await Service().PreviewAsync(destination.Id, Upload(bomb), archivePassword: ArchiveTestZip.Password)).StatusCode.Should().Be(413);
    }

    private sealed class FailSecondSave(IFileStorage inner) : IFileStorage
    {
        private int count;
        public Task<string> SaveAsync(Stream content, string fileName, string contentType) => ++count == 2
            ? throw new IOException("Injected storage failure") : inner.SaveAsync(content, fileName, contentType);
        public Task<Stream> OpenAsync(string path) => inner.OpenAsync(path);
        public Task DeleteAsync(string path) => inner.DeleteAsync(path);
    }

    private sealed class Audit : ISecurityAuditLogger
    {
        public List<string> Actions { get; } = [];
        public void AuthenticationSucceeded(Guid userId) { }
        public void AccountChanged(string action, Guid actorUserId, Guid targetUserId) { }
        public void SensitiveResourceAccessed(string action, Guid userId, Guid resourceId, Guid organizationId) => Actions.Add(action);
        public void RequestRejected(int statusCode, string method, string path, Guid? userId, string traceId, string? remoteAddress) { }
    }
}
