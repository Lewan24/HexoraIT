using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class ProjectsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private ProjectsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsTheProject()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var dto = new CreateProjectDto(
            "Infrastructure",
            "Network project",
            "#FF0000");

        var created = await sut.Create(org.Id, dto);

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;

        result.Should().NotBeNull();

        result!.Value.Should().BeOfType<List<ProjectDto>>();

        result.Value.As<List<ProjectDto>>()
            .Should()
            .ContainSingle(p => p.Name == "Infrastructure");
    }

    [Fact]
    public async Task Create_WithoutMembership_ReturnsForbid()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var outsider = new User
        {
            Email = "outsider@test.local",
            DisplayName = "Outsider",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(outsider);
        await _fx.Db.SaveChangesAsync();

        _fx.ActAs(outsider.Id);

        var sut = Controller();

        var result = await sut.Create(
            org.Id,
            new CreateProjectDto(
                "Forbidden",
                "",
                "#000"));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetAll_FiltersByOrganization()
    {
        var (_, orgA) = _fx.SeedUserWithOrg();

        var orgB = new Organization
        {
            Name = "Other Org",
            Color = "#222",
            Initials = "OO"
        };

        _fx.Db.Organizations.Add(orgB);

        _fx.Db.Projects.Add(new Project
        {
            OrganizationId = orgB.Id,
            Name = "Other Project",
            Description = "",
            Color = "#111",
            CreatedAt = DateTime.UtcNow
        });

        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        await sut.Create(
            orgA.Id,
            new CreateProjectDto(
                "My Project",
                "",
                "#ABC"));

        var result = await sut.GetAll(orgA.Id);

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();

        ok!.Value.As<List<ProjectDto>>()
            .Should()
            .ContainSingle(p => p.Name == "My Project");
    }

    [Fact]
    public async Task GetById_ReturnsProject()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateProjectDto(
                "Project A",
                "Description",
                "#123456"));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<ProjectDto>();

        var result = await sut.GetById(created.Id);

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();

        ok!.Value.As<ProjectDto>()
            .Name.Should()
            .Be("Project A");
    }

    [Fact]
    public async Task Update_ChangesProjectFields()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateProjectDto(
                "Old",
                "",
                "#111"));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<ProjectDto>();

        var update = await sut.Update(
            created.Id,
            new UpdateProjectDto(
                "Updated",
                "Changed description",
                "#222"));

        update.Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(created.Id);

        var dto = get.Result
            .As<OkObjectResult>()
            .Value
            .As<ProjectDto>();

        dto.Name.Should().Be("Updated");
        dto.Description.Should().Be("Changed description");
        dto.Color.Should().Be("#222");
    }

    [Fact]
    public async Task Delete_RemovesProject()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateProjectDto(
                "Delete",
                "",
                "#000"));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<ProjectDto>();

        var delete = await sut.Delete(created.Id);

        delete.Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(created.Id);

        get.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ReadOnlyMember_CanRead_ButWriteFails()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateProjectDto(
                "Readonly test",
                "",
                "#FFF"));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<ProjectDto>();

        var user = new User
        {
            Email = "readonly@test.local",
            DisplayName = "Read Only",
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

        var get = await sut.GetById(created.Id);

        get.Result.Should().BeOfType<OkObjectResult>();

        var update = await sut.Update(
            created.Id,
            new UpdateProjectDto(
                "Blocked",
                "",
                "#000"));

        update.Should().BeOfType<ForbidResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}