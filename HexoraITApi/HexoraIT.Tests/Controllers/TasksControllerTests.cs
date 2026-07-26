using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class TasksControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private TasksController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsTask()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var created = await sut.Create(
            org.Id,
            new CreateWorkTaskDto(
                "Install firewall",
                "Install new firewall",
                Priority.High,
                WorkTaskStatus.Todo,
                "John",
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(7)),
                ["network"],
                null));

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id, null);

        var result = all.Result as OkObjectResult;

        result.Should().NotBeNull();

        result!.Value.Should().BeOfType<List<WorkTaskDto>>();

        result.Value.As<List<WorkTaskDto>>()
            .Should()
            .ContainSingle(x => x.Title == "Install firewall");
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
            new CreateWorkTaskDto(
                "Forbidden",
                "",
                Priority.Low,
                WorkTaskStatus.Todo,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetAll_FiltersByOrganization()
    {
        var (_, orgA) = _fx.SeedUserWithOrg();

        var orgB = new Organization
        {
            Name = "Other",
            Color = "#111",
            Initials = "OTH"
        };

        _fx.Db.Organizations.Add(orgB);

        _fx.Db.Tasks.Add(new WorkTask
        {
            OrganizationId = orgB.Id,
            Title = "Other task",
            Description = "",
            Priority = Priority.Low,
            Status = WorkTaskStatus.Todo,
            Assignee = "",
            DueDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Tags = [],
            CreatedAt = DateTime.UtcNow
        });

        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        await sut.Create(
            orgA.Id,
            new CreateWorkTaskDto(
                "My task",
                "",
                Priority.High,
                WorkTaskStatus.Todo,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        var result = await sut.GetAll(orgA.Id, null);

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();

        ok!.Value.As<List<WorkTaskDto>>()
            .Should()
            .ContainSingle(x => x.Title == "My task");
    }

    [Fact]
    public async Task GetAll_FiltersByProject()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var project = new Project
        {
            OrganizationId = org.Id,
            Name = "Project A",
            Description = "",
            Color = "#111",
            CreatedAt = DateTime.UtcNow
        };

        _fx.Db.Projects.Add(project);
        await _fx.Db.SaveChangesAsync();

        await sut.Create(
            org.Id,
            new CreateWorkTaskDto(
                "Included",
                "",
                Priority.High,
                WorkTaskStatus.Todo,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                project.Id));

        await sut.Create(
            org.Id,
            new CreateWorkTaskDto(
                "Excluded",
                "",
                Priority.Low,
                WorkTaskStatus.Todo,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        var result = await sut.GetAll(null, project.Id);

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();

        ok!.Value.As<List<WorkTaskDto>>()
            .Should()
            .ContainSingle(x => x.Title == "Included");
    }

    [Fact]
    public async Task GetById_ReturnsTask()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWorkTaskDto(
                "Task",
                "Description",
                Priority.Medium,
                WorkTaskStatus.Todo,
                "User",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WorkTaskDto>();

        var result = await sut.GetById(created.Id);

        var dto = result.Result
            .As<OkObjectResult>()
            .Value
            .As<WorkTaskDto>();

        dto.Title.Should().Be("Task");
    }

    [Fact]
    public async Task Update_ChangesFields()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWorkTaskDto(
                "Old",
                "",
                Priority.Low,
                WorkTaskStatus.Todo,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        var task = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WorkTaskDto>();

        var update = await sut.Update(
            task.Id,
            new UpdateWorkTaskDto(
                "Updated",
                "Changed",
                Priority.High,
                WorkTaskStatus.Done,
                "Admin",
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                ["updated"],
                null));

        update.Should().BeOfType<NoContentResult>();

        var result = await sut.GetById(task.Id);

        var dto = result.Result
            .As<OkObjectResult>()
            .Value
            .As<WorkTaskDto>();

        dto.Title.Should().Be("Updated");
        dto.Status.Should().Be(WorkTaskStatus.Done);
    }

    [Fact]
    public async Task Delete_RemovesTask()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateWorkTaskDto(
                "Delete",
                "",
                Priority.Low,
                WorkTaskStatus.Todo,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        var task = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WorkTaskDto>();

        var delete = await sut.Delete(task.Id);

        delete.Should().BeOfType<NoContentResult>();

        (await sut.GetById(task.Id))
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
            new CreateWorkTaskDto(
                "Readonly",
                "",
                Priority.Low,
                WorkTaskStatus.Todo,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        var task = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<WorkTaskDto>();

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

        var get = await sut.GetById(task.Id);

        get.Result.Should().BeOfType<OkObjectResult>();

        var update = await sut.Update(
            task.Id,
            new UpdateWorkTaskDto(
                "Blocked",
                "",
                Priority.High,
                WorkTaskStatus.Done,
                "",
                DateOnly.FromDateTime(DateTime.UtcNow),
                [],
                null));

        update.Should().BeOfType<ForbidResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}