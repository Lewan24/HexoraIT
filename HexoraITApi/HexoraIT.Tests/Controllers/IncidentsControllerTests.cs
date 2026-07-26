using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class IncidentsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private IncidentsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsIncident()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var dto = new CreateIncidentDto(
            "Server outage",
            IncidentSeverity.High,
            IncidentStatus.Open,
            "Production server unavailable",
            "",
            ["SRV-01"],
            DateTime.UtcNow,
            null,
            ["production"]);

        var created = await sut.Create(org.Id, dto);

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();

        result.Value.As<List<IncidentDto>>()
            .Should()
            .ContainSingle(i => i.Title == "Server outage");
    }

    [Fact]
    public async Task GetAll_DoesNotReturnOtherOrganizationIncidents()
    {
        var (_, orgA) = _fx.SeedUserWithOrg();

        var orgB = new Organization
        {
            Name = "Other",
            Color = "#111",
            Initials = "O"
        };

        _fx.Db.Organizations.Add(orgB);
        _fx.Db.Incidents.Add(new Incident
        {
            OrganizationId = orgB.Id,
            Title = "Other incident",
            Severity = IncidentSeverity.Low,
            Status = IncidentStatus.Open,
            Description = "",
            Resolution = "",
            AffectedSystems = [],
            Tags = [],
            OccurredAt = DateTime.UtcNow
        });

        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        await sut.Create(orgA.Id, new CreateIncidentDto(
            "My incident",
            IncidentSeverity.Low,
            IncidentStatus.Open,
            "",
            "",
            [],
            DateTime.UtcNow,
            null,
            []));

        var all = await sut.GetAll(null);

        var result = all.Result as OkObjectResult;

        result.Value.As<List<IncidentDto>>()
            .Should()
            .ContainSingle()
            .Which.Title.Should()
            .Be("My incident");
    }

    [Fact]
    public async Task Update_ChangesIncident()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateIncidentDto(
                "Old",
                IncidentSeverity.Low,
                IncidentStatus.Open,
                "",
                "",
                [],
                DateTime.UtcNow,
                null,
                []));

        var created = create.Result as CreatedAtActionResult;
        created.Should().NotBeNull();
        created.Value.Should().BeOfType<IncidentDto>();

        var result = await sut.Update(created.Value.As<IncidentDto>().Id,
            new UpdateIncidentDto(
                "New",
                IncidentSeverity.High,
                IncidentStatus.Resolved,
                "desc",
                "fixed",
                [],
                DateTime.UtcNow,
                DateTime.UtcNow,
                []));

        result.Should().BeOfType<NoContentResult>();

        var fetch = await sut.GetById(created.Value.As<IncidentDto>().Id);

        fetch.Should().NotBeNull();
        var fetched = fetch.Result as OkObjectResult;
        fetched.Should().NotBeNull();
        fetched.Value.Should().BeOfType<IncidentDto>();

        fetched.Value.As<IncidentDto>().Title.Should().Be("New");
        fetched.Value.As<IncidentDto>().Status.Should().Be(IncidentStatus.Resolved);
    }

    [Fact]
    public async Task Delete_RemovesIncident()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id,
            new CreateIncidentDto(
                "Delete me",
                IncidentSeverity.Low,
                IncidentStatus.Open,
                "",
                "",
                [],
                DateTime.UtcNow,
                null,
                []));

        var created = create.Result as CreatedAtActionResult;
        created.Should().NotBeNull();
        created.Value.Should().NotBeNull();

        var result = await sut.Delete(created.Value.As<IncidentDto>().Id);

        result.Should().BeOfType<NoContentResult>();

        (await sut.GetById(created.Value.As<IncidentDto>().Id))
            .Result.Should()
            .BeOfType<NotFoundResult>();
    }

    public void Dispose() => _fx.Dispose();
}