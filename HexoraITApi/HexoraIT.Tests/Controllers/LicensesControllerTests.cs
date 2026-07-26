using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class LicensesControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private LicensesController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    private DateOnly DateOnlyUTCNow = DateOnly.FromDateTime(DateTime.UtcNow);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsLicense()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();



        var dto = new CreateLicenseDto(
            "Windows Server",
            "Microsoft",
            LicenseCategory.Software,
            LicenseType.Perpetual,
            10,
            2,
            DateOnly.FromDateTime(DateTime.UtcNow),
            DateOnlyUTCNow.AddYears(1),
            1000,
            "USD",
            "AAAA-BBBB",
            "Production license");

        var created = await sut.Create(org.Id, dto);

        created.Result.Should()
            .BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;

        result.Should().NotBeNull();

        result.Value.As<List<LicenseDto>>()
            .Should()
            .ContainSingle(l => l.Name == "Windows Server");
    }

    [Fact]
    public async Task Create_CalculatesActiveStatus()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateLicenseDto(
                "License",
                "Vendor",
                LicenseCategory.Software,
                LicenseType.Subscription,
                5,
                0,
                DateOnlyUTCNow,
                DateOnlyUTCNow.AddYears(2),
                500,
                "USD",
                "KEY",
                ""));

        var created = create.Result as CreatedAtActionResult;
        var createdDto = created!.Value.As<LicenseDto>();

        createdDto.Status.Should()
            .Be(LicenseStatus.Active);
    }

    [Fact]
    public async Task Update_ChangesLicense()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateLicenseDto(
                "Old",
                "Vendor",
                LicenseCategory.Software,
                LicenseType.Subscription,
                5,
                0,
                DateOnlyUTCNow,
                DateOnlyUTCNow.AddYears(1),
                100,
                "USD",
                "KEY",
                ""));

        var created = create.Result as CreatedAtActionResult;
        var createdDto = created!.Value.As<LicenseDto>();

        var result = await sut.Update(createdDto.Id,
            new UpdateLicenseDto(
                "New",
                "Vendor",
                LicenseCategory.Software,
                LicenseType.Subscription,
                10,
                2,
                DateOnlyUTCNow,
                DateOnlyUTCNow.AddYears(1),
                200,
                "USD",
                "NEWKEY",
                ""));

        result.Should()
            .BeOfType<NoContentResult>();

        var fetched = await sut.GetById(createdDto.Id);

        fetched.Result.As<OkObjectResult>().Value!.As<LicenseDto>().Name.Should()
            .Be("New");

        fetched.Result.As<OkObjectResult>().Value!.As<LicenseDto>().Seats.Should()
            .Be(10);
    }

    [Fact]
    public async Task ToggleStar_FlipsStar()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateLicenseDto(
                "License",
                "Vendor",
                LicenseCategory.Software,
                LicenseType.Perpetual,
                1,
                0,
                DateOnlyUTCNow,
                DateOnlyUTCNow.AddYears(1),
                100,
                "USD",
                "KEY",
                ""));

        var created = create.Result as CreatedAtActionResult;
        var createdDto = created!.Value.As<LicenseDto>();

        await sut.ToggleStar(createdDto.Id);

        var fetched = await sut.GetById(createdDto.Id);

        fetched.Result.As<OkObjectResult>().Value!.As<LicenseDto>().Starred.Should()
            .BeTrue();
    }

    [Fact]
    public async Task Delete_RemovesLicense()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateLicenseDto(
                "Delete",
                "Vendor",
                LicenseCategory.Software,
                LicenseType.Perpetual,
                1,
                0,
                DateOnlyUTCNow,
                DateOnlyUTCNow.AddYears(1),
                100,
                "USD",
                "KEY",
                ""));

        var created = create.Result as CreatedAtActionResult;
        var createdDto = created!.Value.As<LicenseDto>();

        var result = await sut.Delete(createdDto.Id);

        result.Should()
            .BeOfType<NoContentResult>();

        (await sut.GetById(createdDto.Id))
            .Result.Should()
            .BeOfType<NotFoundResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}