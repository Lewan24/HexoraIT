using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexoraIT.Tests.Application;

public sealed class SecureDocumentServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();
    private readonly FakeFileStorage _storage = new();

    [Fact]
    public async Task PasswordVault_NeverListsSecretAndAuditsReveal()
    {
        var (user, organization) = _fixture.SeedUserWithOrg();
        var audit = new RecordingAudit();
        var service = new PasswordVaultService(_fixture.Db, _fixture.Mapper, _fixture.UserContext, _fixture.Cipher, audit);
        var created = await service.CreateAsync(organization.Id, Password("correct-horse-battery"));
        var item = created.Value.Should().BeOfType<PasswordListDto>().Subject;

        (await service.GetAllAsync(organization.Id, null)).Value.Should().BeOfType<List<PasswordListDto>>().Subject.Should().ContainSingle();
        (await service.RevealAsync(item.Id)).Value.Should().Be("correct-horse-battery");
        audit.SensitiveAccess.Should().Be(("password_revealed", user.Id, item.Id, organization.Id));
    }

    [Fact]
    public async Task PasswordVault_UpdateWithoutPasswordKeepsSecretAndNewPasswordChangesStrength()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Passwords();
        var id = (await service.CreateAsync(organization.Id, Password("weak"))).Value.Should().BeOfType<PasswordListDto>().Subject.Id;
        await service.UpdateAsync(id, new("Renamed", "user", null, "Other", [], ""));
        (await service.RevealAsync(id)).Value.Should().Be("weak");
        await service.UpdateAsync(id, new("Renamed", "user", "Str0ng3r-P@ssw0rd!!", "Other", [], ""));
        (await service.GetAllAsync(organization.Id, null)).Value.Should().BeOfType<List<PasswordListDto>>().Subject.Single().Strength.Should().Be(PasswordStrength.Strong);
    }

    [Fact]
    public async Task PasswordImport_RejectsDuplicatesAtomicallyAndReplacesOnlyTheConfirmedVersion()
    {
        var (_, org) = _fixture.SeedUserWithOrg();
        var service = Passwords();
        var existing = (await service.CreateAsync(org.Id, new(" Café ", "old", "old secret", "VPN", ["tag"], "notes")))
            .Value.Should().BeOfType<PasswordListDto>().Subject;
        var import = new ImportPasswordDto("CAFE\u0301", "", " new secret ", "Email", null, null);
        var other = new ImportPasswordDto("Second entry", "login", "another secret", "Email", null, null);

        (await service.ImportAsync(org.Id, [other, import])).StatusCode.Should().Be(StatusCodes.Status409Conflict);
        (await service.ImportAsync(org.Id, [other, other with { Name = "second entry " }])).StatusCode.Should().Be(StatusCodes.Status409Conflict);
        (await service.ImportAsync(org.Id, [other, import with { ReplaceId = existing.Id, ExpectedUpdatedAt = existing.UpdatedAt.AddSeconds(-1) }]))
            .StatusCode.Should().Be(StatusCodes.Status409Conflict);
        (await service.GetAllAsync(org.Id, null)).Value.Should().BeOfType<List<PasswordListDto>>().Subject.Should().ContainSingle();

        var result = (await service.ImportAsync(org.Id, [other, import with { ReplaceId = existing.Id, ExpectedUpdatedAt = existing.UpdatedAt }]))
            .Value.Should().BeOfType<List<PasswordListDto>>().Subject;
        var replaced = result.Single(entry => entry.Id == existing.Id);
        replaced.Category.Should().Be("VPN");
        replaced.Notes.Should().Be("notes");
        replaced.Tags.Should().Equal("tag");
        replaced.Username.Should().BeEmpty();
        (await service.RevealAsync(replaced.Id)).Value.Should().Be(" new secret ");
        (await service.ImportAsync(org.Id, [other])).StatusCode.Should().Be(StatusCodes.Status409Conflict);
    }

    [Fact]
    public async Task PasswordImport_CanExplicitlyKeepSameTitleAndImportUnderAnEditedTitle()
    {
        var (_, org) = _fixture.SeedUserWithOrg();
        var service = Passwords();
        var existing = new ImportPasswordDto("Certum", "first-account", "first secret", "Other", null, null);
        (await service.ImportAsync(org.Id, [existing])).StatusCode.Should().Be(StatusCodes.Status200OK);
        var second = existing with { Name = "CERTUM ", Username = "second-account", Password = "second secret", ExpectedTitleCount = 1 };
        var third = existing with { Username = "third-account", Password = "third secret", ExpectedTitleCount = 1 };
        var renamed = existing with { Name = "Certum — backup", Username = "backup-account", Password = "backup secret" };

        (await service.ImportAsync(org.Id, [second, third with { ExpectedTitleCount = null }, renamed]))
            .StatusCode.Should().Be(StatusCodes.Status409Conflict);
        var saved = (await service.ImportAsync(org.Id, [second, third, renamed]))
            .Value.Should().BeOfType<List<PasswordListDto>>().Subject;
        saved.Select(item => item.Name).Should().Equal("CERTUM", "Certum", "Certum — backup");
        (await service.RevealAsync(saved[0].Id)).Value.Should().Be("second secret");
        (await service.RevealAsync(saved[1].Id)).Value.Should().Be("third secret");
        (await service.ImportAsync(org.Id, [second, third, renamed])).StatusCode.Should().Be(StatusCodes.Status409Conflict);
        (await service.GetAllAsync(org.Id, null)).Value.Should().BeOfType<List<PasswordListDto>>().Subject.Should().HaveCount(4);
    }

    [Fact]
    public async Task PasswordImport_RequiresWritePermissionAndScopesTitlesToTheOrganization()
    {
        var (_, first) = _fixture.SeedUserWithOrg();
        var service = Passwords();
        var entry = new ImportPasswordDto("Shared title", "login", "fixture secret", "Other", null, null);
        (await service.ImportAsync(first.Id, [entry])).StatusCode.Should().Be(StatusCodes.Status200OK);

        var (_, second) = _fixture.SeedUserWithOrg();
        (await service.ImportAsync(first.Id, [entry])).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await service.ImportAsync(second.Id, [entry])).StatusCode.Should().Be(StatusCodes.Status200OK);

        var (_, readOnly) = _fixture.SeedUserWithOrg(OrgRole.ReadOnly);
        (await service.ImportAsync(readOnly.Id, [entry])).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task ContractService_PreservesCrudStatusStarAndDocumentContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Contracts();
        var created = await service.CreateAsync(organization.Id, Contract(DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10))));
        var item = created.Value.Should().BeOfType<ContractDto>().Subject;
        item.Status.Should().Be(ContractStatus.Expiring);
        (await service.ToggleStarAsync(item.Id)).Value.Should().BeOfType<ContractStarredDto>().Subject.Starred.Should().BeTrue();

        await using var content = new MemoryStream("%PDF-1.7\ndocument"u8.ToArray());
        var upload = await service.UploadDocumentAsync(item.Id, File(content, "contract.pdf", "application/pdf"));
        upload.Value.Should().BeOfType<ContractDto>().Subject.Document!.Name.Should().Be("contract.pdf");
        (await service.GetAllAsync(organization.Id, null)).Value.Should().BeOfType<List<ContractDto>>().Subject.Single().Document!.Name.Should().Be("contract.pdf");
        var download = (await service.DownloadDocumentAsync(item.Id)).Value.Should().BeOfType<DocumentDownload>().Subject;
        download.ContentType.Should().Be("application/pdf");
        download.FileName.Should().Be("contract.pdf");
        (await service.DeleteAsync(item.Id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task ContractService_RejectsMismatchedDocumentContentWithoutMetadataWrite()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Contracts();
        var id = (await service.CreateAsync(organization.Id, Contract(DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1))))).Value.Should().BeOfType<ContractDto>().Subject.Id;
        await using var content = new MemoryStream("not a pdf"u8.ToArray());

        (await service.UploadDocumentAsync(id, File(content, "contract.pdf", "application/pdf"))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await _fixture.Db.Contracts.FindAsync(id))!.DocumentBlobPath.Should().BeNull();
    }

    [Fact]
    public async Task WarrantyService_RejectsForeignAssetAndInvalidIdentifier()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Other" };
        var asset = new Asset { OrganizationId = other.Id, Name = "Foreign" };
        _fixture.Db.AddRange(other, asset); await _fixture.Db.SaveChangesAsync();
        var service = Warranties();

        (await service.CreateAsync(organization.Id, Warranty("invalid", null))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await service.CreateAsync(organization.Id, Warranty(Guid.NewGuid().ToString(), asset.Id))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        _fixture.Db.WarrantyItems.Should().BeEmpty();
    }

    [Fact]
    public async Task WarrantyService_PreservesCrudAndDocumentContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Warranties();
        var created = await service.CreateAsync(organization.Id, Warranty(Guid.NewGuid().ToString(), null));
        var item = created.Value.Should().BeOfType<WarrantyItemDto>().Subject;
        await using var content = new MemoryStream("%PDF-1.7\ndocument"u8.ToArray());
        (await service.UploadDocumentAsync(item.Id, File(content, "warranty.pdf", "application/pdf"))).StatusCode.Should().Be(StatusCodes.Status200OK);
        (await service.GetAllAsync(organization.Id, null)).Value.Should().BeOfType<List<WarrantyItemDto>>().Subject.Single().Document!.Name.Should().Be("warranty.pdf");
        (await service.DownloadDocumentAsync(item.Id)).Value.Should().BeOfType<DocumentDownload>().Subject.FileName.Should().Be("warranty.pdf");
        (await service.DeleteAsync(item.Id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    public void Dispose() => _fixture.Dispose();
    private PasswordVaultService Passwords() => new(_fixture.Db, _fixture.Mapper, _fixture.UserContext, _fixture.Cipher, new RecordingAudit());
    private ContractService Contracts() => new(_fixture.Db, _fixture.Mapper, _fixture.UserContext, _storage, NullLogger<ContractService>.Instance);
    private WarrantyService Warranties() => new(_fixture.Db, _fixture.Mapper, _fixture.UserContext, _storage, NullLogger<WarrantyService>.Instance);
    private static CreatePasswordDto Password(string secret) => new("Entry", "user", secret, "Other", [], "");
    private static CreateContractDto Contract(DateOnly end) => new("Contract", "Vendor", ContractCategory.Software, DateOnly.FromDateTime(DateTime.UtcNow), end, 100, "USD", false, "");
    private static CreateWarrantyItemDto Warranty(string id, Guid? assetId) => new(id, "Warranty", "Vendor", "SN", DateOnly.FromDateTime(DateTime.UtcNow), DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)), WarrantyType.Standard, "", "", "", "", assetId, false);
    private static FormFile File(Stream content, string name, string type) => new(content, 0, content.Length, "file", name) { Headers = new HeaderDictionary(), ContentType = type };

    private sealed class RecordingAudit : ISecurityAuditLogger
    {
        public (string Action, Guid UserId, Guid ResourceId, Guid OrganizationId)? SensitiveAccess { get; private set; }
        public void AuthenticationSucceeded(Guid userId) { }
        public void AccountChanged(string action, Guid actorUserId, Guid targetUserId) { }
        public void RequestRejected(int statusCode, string method, string path, Guid? userId, string traceId, string? remoteAddress) { }
        public void SensitiveResourceAccessed(string action, Guid userId, Guid resourceId, Guid organizationId) => SensitiveAccess = (action, userId, resourceId, organizationId);
    }
}
