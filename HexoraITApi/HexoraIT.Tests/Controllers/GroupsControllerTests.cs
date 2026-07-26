using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class GroupsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private GroupsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsGroup()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateGroupDto(
                "Servers",
                GroupType.LocalGroup,
                "desc",
                "purpose",
                [],
                [],
                []));

        var created = (create.Result as CreatedAtActionResult)!
            .Value.As<GroupDto>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;

        result.Should().NotBeNull();

        result!.Value.As<List<GroupDto>>()
            .Should()
            .ContainSingle(g => g.Id == created.Id);
    }

    [Fact]
    public async Task Update_ChangesGroup()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateGroupDto("Old", GroupType.LocalGroup, "", "", [], [], []));

        var id = (create.Result as CreatedAtActionResult)!
            .Value.As<GroupDto>().Id;

        await sut.Update(id,
            new UpdateGroupDto("New", GroupType.LocalGroup, "", "", [], [], []));

        var fetched = await sut.GetById(id);

        fetched.Result.As<OkObjectResult>()
            .Value.As<GroupDto>()
            .Name.Should().Be("New");
    }

    [Fact]
    public async Task Delete_RemovesGroup()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateGroupDto("Group", GroupType.LocalGroup, "", "", [], [], []));

        var id = (create.Result as CreatedAtActionResult)!
            .Value.As<GroupDto>().Id;

        (await sut.Delete(id))
            .Should()
            .BeOfType<NoContentResult>();

        (await sut.GetById(id))
            .Result.Should()
            .BeOfType<NotFoundResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}