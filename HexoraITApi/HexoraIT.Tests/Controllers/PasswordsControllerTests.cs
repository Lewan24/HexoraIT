using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class PasswordsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private PasswordsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext, _fx.Cipher);

    [Fact]
    public async Task GetAll_NeverExposesTheSecret()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        await sut.Create(org.Id, new CreatePasswordDto(
            "AWS Root",
            "admin",
            "SuperSecret123!",
            "Cloud",
            [],
            ""));

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();
        result!.Value.Should().BeOfType<List<PasswordListDto>>();

        result.Value.As<List<PasswordListDto>>()
            .Should()
            .ContainSingle(p => p.Name == "AWS Root" && p.Username == "admin");
    }

    [Fact]
    public async Task Reveal_ReturnsTheOriginalPlaintext()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, new CreatePasswordDto(
            "Entry",
            "user",
            "correct-horse-battery",
            "Other",
            [],
            ""));

        var createdResult = create.Result as OkObjectResult;
        createdResult.Should().NotBeNull();
        createdResult!.Value.Should().BeOfType<PasswordListDto>();

        var created = createdResult.Value.As<PasswordListDto>();

        var reveal = await sut.Reveal(created.Id);

        var revealResult = reveal.Result as OkObjectResult;
        revealResult.Should().NotBeNull();
        revealResult!.Value.Should().BeOfType<string>();

        revealResult.Value.As<string>()
            .Should()
            .Be("correct-horse-battery");
    }

    [Fact]
    public async Task Update_WithoutNewPassword_KeepsOldSecret()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, new CreatePasswordDto(
            "Entry",
            "user",
            "original-secret",
            "Other",
            [],
            ""));

        var createdResult = create.Result as OkObjectResult;
        createdResult.Should().NotBeNull();
        createdResult!.Value.Should().BeOfType<PasswordListDto>();

        var created = createdResult.Value.As<PasswordListDto>();

        var update = await sut.Update(created.Id, new UpdatePasswordDto(
            "Entry Renamed",
            "user",
            null,
            "Other",
            [],
            ""));

        update.Should().BeOfType<NoContentResult>();

        var reveal = await sut.Reveal(created.Id);

        var revealResult = reveal.Result as OkObjectResult;
        revealResult.Should().NotBeNull();
        revealResult!.Value.Should().BeOfType<string>();

        revealResult.Value.As<string>()
            .Should()
            .Be("original-secret");
    }

    [Fact]
    public async Task Update_WithNewPassword_RecalculatesStrength()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, new CreatePasswordDto(
            "Entry",
            "user",
            "weak",
            "Other",
            [],
            ""));

        var createdResult = create.Result as OkObjectResult;
        createdResult.Should().NotBeNull();
        createdResult!.Value.Should().BeOfType<PasswordListDto>();

        var created = createdResult.Value.As<PasswordListDto>();

        created.Strength.Should().Be(PasswordStrength.Weak);

        var update = await sut.Update(created.Id, new UpdatePasswordDto(
            "Entry",
            "user",
            "Str0ng3r-P@ssw0rd!!",
            "Other",
            [],
            ""));

        update.Should().BeOfType<NoContentResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();
        result!.Value.Should().BeOfType<List<PasswordListDto>>();

        result.Value.As<List<PasswordListDto>>()
            .Should()
            .ContainSingle()
            .Which.Strength.Should().Be(PasswordStrength.Strong);
    }

    public void Dispose()
        => _fx.Dispose();
}