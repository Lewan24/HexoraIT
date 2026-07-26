using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class KnowledgeControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private KnowledgeController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsArticle()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var created = await sut.Create(org.Id,
            new CreateKnowledgeArticleDto(
                "Firewall",
                "Network",
                "Firewall documentation",
                ["security"]));

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;

        result.Value.As<List<KnowledgeArticleDto>>()
            .Should()
            .ContainSingle()
            .Which.Title.Should()
            .Be("Firewall");
    }

    [Fact]
    public async Task ToggleStar_FlipsStar()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateKnowledgeArticleDto(
                "Article",
                "General",
                "Text",
                []));

        var created = create.Result as CreatedAtActionResult;
        created.Should().NotBeNull();
        created.Value.Should().BeOfType<KnowledgeArticleDto>();
        var createdDto = created.Value as KnowledgeArticleDto;

        await sut.ToggleStar(createdDto!.Id);

        var fetched = await sut.GetById(createdDto.Id);
        fetched.Result.As<OkObjectResult>().Value.As<KnowledgeArticleDto>().Starred.Should().BeTrue();
    }

    [Fact]
    public async Task Update_ChangesContent()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateKnowledgeArticleDto(
                "Old",
                "Cat",
                "Old",
                []));

        var created = create.Result as CreatedAtActionResult;
        var createdDto = created!.Value as KnowledgeArticleDto;

        await sut.Update(createdDto!.Id,
            new UpdateKnowledgeArticleDto(
                "New",
                "Cat",
                "New content",
                []));

        var fetched = await sut.GetById(createdDto.Id);

        fetched.Result.As<OkObjectResult>().Value.As<KnowledgeArticleDto>().Title.Should().Be("New");
    }

    public void Dispose() => _fx.Dispose();
}