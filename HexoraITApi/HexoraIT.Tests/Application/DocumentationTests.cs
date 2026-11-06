using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Application.Documentation;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using PdfSharp.Pdf.IO;

namespace HexoraIT.Tests.Application;

public sealed class DocumentationTests : IDisposable
{
    private readonly TestFixture fixture = new();
    private readonly CaptureRenderer renderer = new();
    private DocumentationService Service() => new(fixture.Db, fixture.UserContext, fixture.Cipher, renderer);

    [Theory]
    [InlineData(OrgRole.Owner, 200)]
    [InlineData(OrgRole.Admin, 200)]
    [InlineData(OrgRole.Member, 403)]
    [InlineData(OrgRole.ReadOnly, 403)]
    public async Task AllOperationsRequireOwnerOrAdministrator(OrgRole role, int expected)
    {
        var (_, org) = fixture.SeedUserWithOrg(role);
        (await Service().GetOptionsAsync(org.Id)).StatusCode.Should().Be(expected);
        (await Service().GetItemsAsync(org.Id, "assets", new())).StatusCode.Should().Be(expected);
        (await Service().GenerateAsync(org.Id, new([new("assets")]))).StatusCode.Should().Be(expected);
        if (expected == 403) renderer.Snapshot.Should().BeNull();
    }

    [Fact]
    public async Task CustomRoleOrSystemAdminCannotEscalateExportPrivileges()
    {
        var (user, org) = fixture.SeedUserWithOrg(OrgRole.Member);
        user.SystemRole = SystemRole.Admin;
        await fixture.Db.SaveChangesAsync();
        (await Service().GenerateAsync(org.Id, new([new("assets")]))).StatusCode.Should().Be(403);
        var custom = new OrganizationRole { OrganizationId = org.Id, Name = "Custom" };
        fixture.Db.OrganizationRoles.Add(custom);
        var membership = await fixture.Db.UserOrganizations.SingleAsync();
        membership.Role = OrgRole.Owner; membership.CustomRoleId = custom.Id;
        await fixture.Db.SaveChangesAsync();
        (await Service().GenerateAsync(org.Id, new([new("assets")]))).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task ExplicitSelectionExcludesUnselectedRecordsAndOtherOrganizations()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Foreign" };
        var a = new Contact { OrganizationId = org.Id, Name = "Selected", Description = "INTERNAL_DESCRIPTION" };
        var b = new Contact { OrganizationId = org.Id, Name = "Not selected" };
        var foreign = new Contact { OrganizationId = other.Id, Name = "Foreign contact" };
        fixture.Db.AddRange(other, a, b, foreign); await fixture.Db.SaveChangesAsync();
        (await Service().GenerateAsync(org.Id, new([new("contacts", [a.Id])]))).StatusCode.Should().Be(200);
        renderer.Snapshot!.Sections.Single().Records.Should().ContainSingle(record => record.Id == a.Id);
        renderer.Snapshot.Sections.Single().Records.Single().Texts.Should().BeEmpty();
        (await Service().GenerateAsync(org.Id, new([new("contacts", [foreign.Id])]))).StatusCode.Should().Be(400);
        (await Service().GenerateAsync(other.Id, new([new("contacts")]))).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task SecretsFinancialsAndNotesAreOptInAndSecretsRequireConfirmation()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        fixture.Db.Passwords.Add(new PasswordEntry { OrganizationId = org.Id, Name = "Login", Username = "Yes", EncryptedPassword = fixture.Cipher.Encrypt("Yes"), Notes = "PRIVATE_NOTE" });
        fixture.Db.Licenses.Add(new HexoraITApi.Domain.Entities.License { OrganizationId = org.Id, Name = "License", LicenseKey = "SECRET_KEY", Cost = 99, Currency = "PLN", Notes = "INTERNAL" });
        await fixture.Db.SaveChangesAsync();
        var request = new DocumentationRequestDto([new("passwords"), new("licenses")]);
        (await Service().GenerateAsync(org.Id, request)).StatusCode.Should().Be(200);
        var fields = renderer.Snapshot!.Sections.SelectMany(section => section.Records).SelectMany(record => record.Fields).ToList();
        fields.Should().NotContain(field => field.Label == "Password" || field.Label == "License key" || field.Label == "Cost");
        renderer.Snapshot.Sections.SelectMany(section => section.Records).SelectMany(record => record.Texts).Should().BeEmpty();
        (await Service().GenerateAsync(org.Id, request with { IncludeSecrets = true })).StatusCode.Should().Be(400);
        (await Service().GenerateAsync(org.Id, request with { IncludeSecrets = true, ConfirmSensitiveData = true, IncludeFinancials = true, IncludeNotes = true })).StatusCode.Should().Be(200);
        fields = renderer.Snapshot!.Sections.SelectMany(section => section.Records).SelectMany(record => record.Fields).ToList();
        fields.Should().Contain(field => field.Label == "Password" && field.Value == "Yes" && !field.Translate);
        fields.Should().Contain(field => field.Label == "License key" && field.Value == "SECRET_KEY");
        fields.Should().Contain(field => field.Label == "Cost");
        fields.Should().NotContain(field => field.Label.Contains("Blob") || field.Label.Contains("Encrypted"));
    }

    [Fact]
    public async Task PrivateNotesAreNeverEnabledByDefaultAndOnlyAuthorsNotesCanBeExported()
    {
        var (author, org) = fixture.SeedUserWithOrg();
        var other = new User { Email = "other@test.local", DisplayName = "Other", PasswordHash = [1], PasswordSalt = [1] };
        var mine = new PrivateNote { OrganizationId = org.Id, UserId = author.Id, Title = "Mine", Content = "MY_PRIVATE_NOTE" };
        var theirs = new PrivateNote { OrganizationId = org.Id, UserId = other.Id, Title = "Theirs", Content = "OTHER_PRIVATE_NOTE" };
        fixture.Db.AddRange(other, mine, theirs); await fixture.Db.SaveChangesAsync();
        var options = (DocumentationOptionsDto)(await Service().GetOptionsAsync(org.Id)).Value!;
        options.Sections.Where(section => new[] { "tasks", "private-notes", "passwords" }.Contains(section.Key)).Should().OnlyContain(section => !section.DefaultSelected);
        options.Sections.Single(section => section.Key == "private-notes").Count.Should().Be(1);
        (await Service().GenerateAsync(org.Id, new([new("private-notes")]))).StatusCode.Should().Be(200);
        renderer.Snapshot!.Sections.Single().Records.Should().ContainSingle(record => record.Id == mine.Id);
        (await Service().GenerateAsync(org.Id, new([new("private-notes", [theirs.Id])]))).StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task ItemPickerSearchAndPaginationAreScopedAndStable()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        fixture.Db.Contacts.AddRange(Enumerable.Range(0, 5).Select(i => new Contact { OrganizationId = org.Id, Name = $"Client {i}", SortIndex = i + 1 }));
        await fixture.Db.SaveChangesAsync();
        var result = await Service().GetItemsAsync(org.Id, "contacts", new() { Page = 2, PageSize = 2 }, search: "CLIENT");
        result.Pagination!.TotalCount.Should().Be(5);
        ((List<ResourceOptionDto>)result.Value!).Select(item => item.Name).Should().Equal("Client 2", "Client 3");
        (await Service().GetItemsAsync(org.Id, "unknown", new())).StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task InvalidScopesAndOversizedReportsAreRejectedWithoutTruncation()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        (await Service().GenerateAsync(org.Id, new([]))).StatusCode.Should().Be(400);
        (await Service().GenerateAsync(org.Id, new([new("assets"), new("assets")]))).StatusCode.Should().Be(400);
        (await Service().GenerateAsync(org.Id, new([new("unknown")]))).StatusCode.Should().Be(400);
        fixture.Db.KnowledgeArticles.Add(new KnowledgeArticle { OrganizationId = org.Id, Title = "Huge", Content = new string('a', DocumentationCatalog.MaxCharacters + 1) });
        await fixture.Db.SaveChangesAsync();
        (await Service().GenerateAsync(org.Id, new([new("knowledge")]))).StatusCode.Should().Be(413);
        renderer.Snapshot.Should().BeNull();
    }

    [Fact]
    public async Task DeletedOrganizationCannotExportAndFileInventoryNeverExposesStoragePaths()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        fixture.Db.StoredFiles.Add(new StoredFile { OrganizationId = org.Id, Name = "manual.zip", BlobPath = "/private/internal/path", MimeType = "application/octet-stream", Size = 123 });
        await fixture.Db.SaveChangesAsync();
        await Service().GenerateAsync(org.Id, new([new("files")]));
        renderer.Snapshot!.Sections.Single().Records.Single().Fields.Should().NotContain(field => field.Value.Contains("/private/"));
        org.IsDeleted = true; await fixture.Db.SaveChangesAsync();
        (await Service().GetOptionsAsync(org.Id)).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task RendererProducesMultipagePdfWithEmbeddedPolishFontsAndBookmarks()
    {
        var records = Enumerable.Range(0, 40).Select(i => new DocumentationRecord(Guid.NewGuid(), $"Urządzenie Łódź {i + 1}",
            [new("IP address", $"192.168.1.{i + 1}"), new("Username", "Yes")],
            [new("Content", "## Instrukcja obsługi\n**Zażółć gęślą jaźń.**\n- Sprawdź połączenie.\n" + string.Join('\n', Enumerable.Repeat("Dokumentacja z polskimi znakami — ąćęłńóśźż.", 4)))])).ToList();
        var snapshot = new DocumentationSnapshot("Pracownia Łódź", "", "Administrator", DateTime.UtcNow,
            new([new("assets"), new("knowledge")], Title: "Dokumentacja techniczna", Recipient: "Klient testowy"), [new("assets", records), new("knowledge", [])]);
        var pdf = await new DocumentationPdfRenderer().RenderAsync(snapshot);
        pdf.Take(5).Should().Equal("%PDF-"u8.ToArray());
        using var input = new MemoryStream(pdf);
        using var parsed = PdfReader.Open(input, PdfDocumentOpenMode.Import);
        parsed.PageCount.Should().BeGreaterThan(4);
        // Optional local artifact for visual/PDF text inspection; CI does not depend on a local path.
        var artifactPath = Environment.GetEnvironmentVariable("HEXORA_DOCUMENTATION_PDF_SAMPLE");
        if (!string.IsNullOrEmpty(artifactPath)) await File.WriteAllBytesAsync(artifactPath, pdf);
    }

    public void Dispose() => fixture.Dispose();
    private sealed class CaptureRenderer : IDocumentationPdfRenderer
    {
        public DocumentationSnapshot? Snapshot { get; private set; }
        public Task<byte[]> RenderAsync(DocumentationSnapshot snapshot, CancellationToken token = default) { Snapshot = snapshot; return Task.FromResult("%PDF-test"u8.ToArray()); }
    }
}
