using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class ContactsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private ContactsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsContact()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateContactDto(
                "John Doe",
                "ACME",
                "Admin",
                "123456789",
                "john@acme.com",
                "desc",
                []));

        var createdResult = create.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();

        var created = createdResult!.Value.As<ContactDto>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();

        result!.Value.As<List<ContactDto>>()
            .Should()
            .ContainSingle(c => c.Id == created.Id);
    }

    [Fact]
    public async Task GetById_ReturnsContact()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateContactDto("John", "ACME", "CEO", "", "", "", []));

        var id = (create.Result as CreatedAtActionResult)!
            .Value.As<ContactDto>().Id;

        var response = await sut.GetById(id);

        var result = response.Result as OkObjectResult;
        result.Should().NotBeNull();

        result!.Value.As<ContactDto>().Name.Should().Be("John");
    }

    [Fact]
    public async Task Update_ChangesContact()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateContactDto("Old", "", "", "", "", "", []));

        var id = (create.Result as CreatedAtActionResult)!
            .Value.As<ContactDto>().Id;

        var update = await sut.Update(id,
            new UpdateContactDto("New", "", "", "", "", "", []));

        update.Should().BeOfType<NoContentResult>();

        var fetched = await sut.GetById(id);

        var result = fetched.Result as OkObjectResult;

        result!.Value.As<ContactDto>()
            .Name.Should().Be("New");
    }

    [Fact]
    public async Task Delete_RemovesContact()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateContactDto("John", "", "", "", "", "", []));

        var id = (create.Result as CreatedAtActionResult)!
            .Value.As<ContactDto>().Id;

        (await sut.Delete(id))
            .Should()
            .BeOfType<NoContentResult>();

        (await sut.GetById(id))
            .Result.Should()
            .BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ToggleStar_FlipsStarred()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateContactDto("John", "", "", "", "", "", []));

        var id = (create.Result as CreatedAtActionResult)!
            .Value.As<ContactDto>().Id;

        await sut.ToggleStar(id);

        var result = await sut.GetById(id);

        result.Result.As<OkObjectResult>()
            .Value.As<ContactDto>()
            .Starred.Should().BeTrue();
    }

    public void Dispose()
        => _fx.Dispose();
}