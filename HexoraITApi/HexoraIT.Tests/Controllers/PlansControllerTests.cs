using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class PlansControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private PlansController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsThePlan()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var dto = new CreatePlanDto(
            "Migration plan",
            "Move servers",
            Priority.High,
            PlanStatus.Planned,
            DateOnly.FromDateTime(DateTime.UtcNow.AddDays(30)),
            ["migration", "servers"],
            [], 0);

        var created = await sut.Create(org.Id, dto);

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();

        result!.Value.Should().BeOfType<List<PlanDto>>();
        result.Value.As<List<PlanDto>>()
            .Should()
            .ContainSingle(p => p.Title == "Migration plan");
    }

    [Fact]
    public async Task Create_WithoutMembership_ReturnsForbid()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var otherUser = new User
        {
            Email = "outsider@test.local",
            DisplayName = "Outsider",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(otherUser);
        await _fx.Db.SaveChangesAsync();

        _fx.ActAs(otherUser.Id);

        var sut = Controller();

        var result = await sut.Create(org.Id,
            new CreatePlanDto(
                "Plan",
                "",
                Priority.Low,
                PlanStatus.Planned,
                DateOnly.FromDateTime(DateTime.UtcNow),
                [], [], 0));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetAll_OnlyReturnsPlansFromRequestedOrganization()
    {
        var (_, orgA) = _fx.SeedUserWithOrg();

        var orgB = new Organization
        {
            Name = "Other",
            Color = "#111",
            Initials = "OTH"
        };

        _fx.Db.Organizations.Add(orgB);

        _fx.Db.Plans.Add(new Plan
        {
            OrganizationId = orgB.Id,
            Title = "Other plan",
            Description = "",
            Priority = Priority.Low,
            Status = PlanStatus.Planned,
            TargetDate = DateOnly.FromDateTime(DateTime.UtcNow),
            Tags = []
        });

        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        await sut.Create(orgA.Id,
            new CreatePlanDto(
                "My plan",
                "",
                Priority.High,
                PlanStatus.Planned,
                DateOnly.FromDateTime(DateTime.UtcNow),
                [], [], 0));

        var result = await sut.GetAll(orgA.Id);

        var ok = result.Result as OkObjectResult;
        ok.Should().NotBeNull();

        ok!.Value.As<List<PlanDto>>()
            .Should()
            .ContainSingle(p => p.Title == "My plan");
    }

    [Fact]
    public async Task GetById_ReturnsPlan()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreatePlanDto(
                "Test plan",
                "desc",
                Priority.Medium,
                PlanStatus.Planned,
                DateOnly.FromDateTime(DateTime.UtcNow),
                [], [], 0));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<PlanDto>();

        var result = await sut.GetById(created.Id);

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();
        ok!.Value.As<PlanDto>()
            .Title.Should()
            .Be("Test plan");
    }

    [Fact]
    public async Task Update_ChangesFields()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreatePlanDto(
                "Old",
                "",
                Priority.Low,
                PlanStatus.Planned,
                DateOnly.FromDateTime(DateTime.UtcNow),
                [], [], 0));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<PlanDto>();

        var result = await sut.Update(
            created.Id,
            new UpdatePlanDto(
                "Updated",
                "changed",
                Priority.High,
                PlanStatus.Completed,
                DateOnly.FromDateTime(DateTime.UtcNow.AddDays(10)),
                ["done"], [], 0));

        result.Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(created.Id);

        get.Result.Should().BeOfType<OkObjectResult>();

        get.Result
            .As<OkObjectResult>()
            .Value
            .As<PlanDto>()
            .Title.Should()
            .Be("Updated");
    }

    [Fact]
    public async Task Delete_RemovesPlan()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreatePlanDto(
                "Delete me",
                "",
                Priority.Low,
                PlanStatus.Planned,
                DateOnly.FromDateTime(DateTime.UtcNow),
                [], [], 0));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<PlanDto>();

        var delete = await sut.Delete(created.Id);

        delete.Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(created.Id);

        get.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ReadOnlyMember_CanRead_ButCannotWrite()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreatePlanDto(
                "Read plan",
                "",
                Priority.Low,
                PlanStatus.Planned,
                DateOnly.FromDateTime(DateTime.UtcNow),
                [], [], 0));

        var created = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<PlanDto>();

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

        var get = await sut.GetById(created.Id);

        get.Result.Should().BeOfType<OkObjectResult>();

        var update = await sut.Update(
            created.Id,
            new UpdatePlanDto(
                "Blocked",
                "",
                Priority.High,
                PlanStatus.Planned,
                DateOnly.FromDateTime(DateTime.UtcNow),
                [], [], 0));

        update.Should().BeOfType<ForbidResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}