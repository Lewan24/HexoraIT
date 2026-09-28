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
