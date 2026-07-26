using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class DashboardControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private DashboardController Controller()
        => new(_fx.Db, _fx.UserContext);

    [Fact]
    public async Task Save_ThenGet_ReturnsLayout()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var dto = new DashboardLayoutDto(
            ["a", "b"],
            ["c"]);

        await sut.Save(org.Id, dto);

        var result = await sut.Get(org.Id);

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();

        ok!.Value.As<DashboardLayoutDto>()
            .SectionOrder.Should()
            .Contain(["a", "b"]);
    }

    [Fact]
    public async Task Reset_RemovesLayout()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        await sut.Save(org.Id,
            new DashboardLayoutDto(["a"], []));

        await sut.Reset(org.Id);

        var result = await sut.Get(org.Id);

        result.Result.As<OkObjectResult>()
            .Value.Should()
            .BeNull();
    }

    public void Dispose()
        => _fx.Dispose();
}