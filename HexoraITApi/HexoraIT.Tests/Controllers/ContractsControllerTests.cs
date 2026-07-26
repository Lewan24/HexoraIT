using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class ContractsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private ContractsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext, _fx.Storage);

    private static CreateContractDto CreateDto(DateOnly? endDate = null)
        => new(
            "Microsoft Agreement",
            "Microsoft",
            ContractCategory.Software,
            DateOnly.FromDateTime(DateTime.UtcNow),
            endDate ?? DateOnly.FromDateTime(DateTime.UtcNow.AddYears(1)),
            1000m,
            "USD",
            true,
            "Contract notes");

    [Fact]
    public async Task Create_ThenGetAll_ReturnsContract()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var createdResult = create.Result as CreatedAtActionResult;

        createdResult.Should().NotBeNull();

        var created = createdResult!
            .Value
            .As<ContractDto>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;

        result.Should().NotBeNull();

        result!
            .Value
            .As<List<ContractDto>>()
            .Should()
            .ContainSingle(c => c.Id == created.Id);
    }

    [Fact]
    public async Task GetById_ReturnsContract()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var id = (create.Result as CreatedAtActionResult)!
            .Value
            .As<ContractDto>()
            .Id;

        var response = await sut.GetById(id);

        var result = response.Result as OkObjectResult;

        result.Should().NotBeNull();

        result!
            .Value
            .As<ContractDto>()
            .Name
            .Should()
            .Be("Microsoft Agreement");
    }

    [Fact]
    public async Task Create_SetsActiveStatusForFarFutureContract()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var response = await sut.Create(org.Id,
            CreateDto(DateOnly.FromDateTime(DateTime.UtcNow.AddYears(2))));

        var result = response.Result as CreatedAtActionResult;

        result.Should().NotBeNull();

        result!
            .Value
            .As<ContractDto>()
            .Status
            .Should()
            .Be(ContractStatus.Active);
    }

    [Fact]
    public async Task Create_SetsExpiringStatusWhenContractEndsSoon()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var response = await sut.Create(org.Id,
            CreateDto(DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30))));

        var result = response.Result as CreatedAtActionResult;

        result.Should().NotBeNull();

        result!
            .Value
            .As<ContractDto>()
            .Status
            .Should()
            .Be(ContractStatus.Expiring);
    }

    [Fact]
    public async Task Create_SetsExpiredStatusWhenContractEnded()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var response = await sut.Create(org.Id,
            CreateDto(DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-10))));

        var result = response.Result as CreatedAtActionResult;

        result.Should().NotBeNull();

        result!
            .Value
            .As<ContractDto>()
            .Status
            .Should()
            .Be(ContractStatus.Expired);
    }

    [Fact]
    public async Task Update_ChangesContractAndRecalculatesStatus()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var id = (create.Result as CreatedAtActionResult)!
            .Value
            .As<ContractDto>()
            .Id;

        var update = await sut.Update(id,
            new UpdateContractDto(
                "Updated Contract",
                "Vendor",
                ContractCategory.Software,
                DateOnly.FromDateTime(DateTime.UtcNow),
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                500,
                "EUR",
                false,
                "Updated"));

        update.Should().BeOfType<NoContentResult>();

        var fetched = await sut.GetById(id);

        fetched.Result
            .As<OkObjectResult>()
            .Value
            .As<ContractDto>()
            .Name
            .Should()
            .Be("Updated Contract");
    }

    [Fact]
    public async Task Delete_RemovesContract()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var id = (create.Result as CreatedAtActionResult)!
            .Value
            .As<ContractDto>()
            .Id;

        (await sut.Delete(id))
            .Should()
            .BeOfType<NoContentResult>();

        (await sut.GetById(id))
            .Result
            .Should()
            .BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ToggleStar_FlipsStarredFlag()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var id = (create.Result as CreatedAtActionResult)!
            .Value
            .As<ContractDto>()
            .Id;

        await sut.ToggleStar(id);

        var fetched = await sut.GetById(id);

        fetched.Result
            .As<OkObjectResult>()
            .Value
            .As<ContractDto>()
            .Starred
            .Should()
            .BeTrue();
    }

    [Fact]
    public async Task UploadDocument_SavesDocumentMetadata()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var id = (create.Result as CreatedAtActionResult)!
            .Value
            .As<ContractDto>()
            .Id;

        await using var stream = new MemoryStream("hello world"u8.ToArray());

        var file = new FormFile(
            stream,
            0,
            stream.Length,
            "file",
            "contract.pdf")
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/pdf"
        };

        var response = await sut.UploadDocument(id, file);

        var result = response as OkObjectResult;

        result.Should().NotBeNull();

        var contract = result!
            .Value
            .As<ContractDto>();

        contract.Document.Should().NotBeNull();
        contract.Document!.Name.Should().Be("contract.pdf");
        contract.Document.MimeType.Should().Be("application/pdf");
        contract.Document.Size.Should().Be(stream.Length);
    }

    [Fact]
    public async Task DownloadDocument_ReturnsFile()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var id = (create.Result as CreatedAtActionResult)!
            .Value
            .As<ContractDto>()
            .Id;

        await using var stream = new MemoryStream("content"u8.ToArray());

        var file = new FormFile(
            stream,
            0,
            stream.Length,
            "file",
            "document.txt")
        {
            Headers = new HeaderDictionary(),
            ContentType = "text/plain"
        };

        await sut.UploadDocument(id, file);

        var response = await sut.DownloadDocument(id);

        response.Should().BeOfType<FileStreamResult>();

        var fileResult = response.As<FileStreamResult>();

        fileResult.ContentType.Should().Be("text/plain");
        fileResult.FileDownloadName.Should().Be("document.txt");
    }

    [Fact]
    public async Task UploadDocument_WhenContractDoesNotExist_ReturnsNotFound()
    {
        _fx.SeedUserWithOrg();

        var sut = Controller();

        await using var stream = new MemoryStream([1, 2, 3]);

        var file = new FormFile(
            stream,
            0,
            stream.Length,
            "file",
            "test.txt");

        var response = await sut.UploadDocument(Guid.NewGuid(), file);

        response.Should()
            .BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task DownloadDocument_WithoutDocument_ReturnsNotFound()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, CreateDto());

        var id = (create.Result as CreatedAtActionResult)!
            .Value
            .As<ContractDto>()
            .Id;

        var response = await sut.DownloadDocument(id);

        response.Should()
            .BeOfType<NotFoundResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}