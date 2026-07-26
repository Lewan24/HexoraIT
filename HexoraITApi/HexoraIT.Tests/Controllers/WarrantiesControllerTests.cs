using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class WarrantiesControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();
    private readonly FakeFileStorage _storage = new();

    private WarrantiesController Controller()
        => new(
            _fx.Db,
            _fx.Mapper,
            _fx.UserContext,
            _storage);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsWarranty()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var created = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Firewall license",
                "Fortinet",
                "SN123",
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-1)),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Extended,
                "John",
                "123456789",
                "john@test.local",
                "Notes",
                null));

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;

        result.Should().NotBeNull();

        result!.Value.Should().BeOfType<List<WarrantyItemDto>>();

        result.Value.As<List<WarrantyItemDto>>()
            .Should()
            .ContainSingle(x => x.Name == "Firewall license");
    }

    [Fact]
    public async Task Create_WithoutMembership_ReturnsForbid()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var user = new User
        {
            Email = "outsider@test.local",
            DisplayName = "Outsider",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(user);
        await _fx.Db.SaveChangesAsync();

        _fx.ActAs(user.Id);

        var sut = Controller();

        var result = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Denied",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(100)),
                WarrantyType.Other,
                "",
                "",
                "",
                "",
                null));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task Create_CalculatesExpiredStatus()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var result = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Expired item",
                "Vendor",
                "001",
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(-2)),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        var dto = result.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WarrantyItemDto>();

        dto.Status.Should().Be(WarrantyStatus.Expired);
    }

    [Fact]
    public async Task Update_ChangesWarrantyAndRecalculatesStatus()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Old",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        var item = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WarrantyItemDto>();

        var update = await sut.Update(
            item.Id,
            new UpdateWarrantyItemDto(
                "Updated",
                "Vendor",
                "SN",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        update.Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(item.Id);

        var dto = get.Result
            .As<OkObjectResult>()
            .Value
            .As<WarrantyItemDto>();

        dto.Name.Should().Be("Updated");
        dto.Status.Should().Be(WarrantyStatus.Expiring);
    }

    [Fact]
    public async Task ToggleStar_FlipsStarredValue()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Star item",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        var item = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WarrantyItemDto>();

        item.Starred.Should().BeFalse();

        var result = await sut.ToggleStar(item.Id);

        result.Should().BeOfType<OkObjectResult>();

        var get = await sut.GetById(item.Id);

        var dto = get.Result
            .As<OkObjectResult>()
            .Value
            .As<WarrantyItemDto>();

        dto.Starred.Should().BeTrue();
    }

    [Fact]
    public async Task UploadDocument_SavesDocumentInformation()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Document test",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        var item = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WarrantyItemDto>();

        await using var stream =
            new MemoryStream("hello world"u8.ToArray());

        IFormFile file = new FormFile(
            stream,
            0,
            stream.Length,
            "file",
            "contract.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };

        var result = await sut.UploadDocument(item.Id, file);

        result.Should().BeOfType<OkObjectResult>();

        var dto = result
            .As<OkObjectResult>()
            .Value
            .As<WarrantyItemDto>();

        dto.Document.Should().NotBeNull();
        dto.Document!.Name.Should().Be("contract.pdf");
        dto.Document.MimeType.Should().Be("application/pdf");
    }

    [Fact]
    public async Task DownloadDocument_ReturnsFile()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Download",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        var item = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WarrantyItemDto>();

        await using var stream =
            new MemoryStream([1, 2, 3]);

        var file = new FormFile(
            stream,
            0,
            stream.Length,
            "file",
            "doc.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };

        await sut.UploadDocument(item.Id, file);

        var result = await sut.DownloadDocument(item.Id);

        result.Should().BeOfType<FileStreamResult>();

        var fileResult = result.As<FileStreamResult>();

        fileResult.ContentType.Should()
            .Be("application/pdf");

        fileResult.FileDownloadName.Should()
            .Be("doc.pdf");
    }

    [Fact]
    public async Task Delete_RemovesWarranty()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Delete",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        var item = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WarrantyItemDto>();

        var result = await sut.Delete(item.Id);

        result.Should().BeOfType<NoContentResult>();

        (await sut.GetById(item.Id))
            .Result.Should()
            .BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ReadOnlyMember_CanRead_ButCannotUpdate()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWarrantyItemDto(
                "Readonly",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        var item = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WarrantyItemDto>();

        var user = new User
        {
            Email = "readonly@test.local",
            DisplayName = "RO",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(user);

        _fx.Db.UserOrganizations.Add(new UserOrganization
        {
            UserId = user.Id,
            OrganizationId = org.Id,
            Role = OrgRole.ReadOnly
        });

        await _fx.Db.SaveChangesAsync();

        _fx.ActAs(user.Id);

        var get = await sut.GetById(item.Id);

        get.Result.Should().BeOfType<OkObjectResult>();

        var update = await sut.Update(
            item.Id,
            new UpdateWarrantyItemDto(
                "Blocked",
                "",
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
                WarrantyType.Standard,
                "",
                "",
                "",
                "",
                null));

        update.Should().BeOfType<ForbidResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}