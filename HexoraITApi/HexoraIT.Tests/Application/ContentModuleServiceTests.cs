using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Application;

public sealed class ContentModuleServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    [Fact]
    public async Task IncidentService_PreservesCrudAndPaginationContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new IncidentService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var created = await service.CreateAsync(organization.Id, Incident("Outage"));
        var id = created.Value.Should().BeOfType<IncidentDto>().Subject.Id;
        var updated = await service.UpdateAsync(id, new UpdateIncidentDto(
            "Resolved", IncidentSeverity.High, IncidentStatus.Resolved, "desc", "fixed", [], DateTime.UtcNow, DateTime.UtcNow, []));
        var all = await service.GetAllAsync(organization.Id, null);
        var deleted = await service.DeleteAsync(id);

        created.StatusCode.Should().Be(StatusCodes.Status201Created);
        updated.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        all.Value.Should().BeOfType<List<IncidentDto>>().Subject.Should().ContainSingle(item => item.Title == "Resolved");
        all.Pagination!.TotalCount.Should().Be(1);
        deleted.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.GetByIdAsync(id)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task KnowledgeService_PreservesCrudAndStarContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new KnowledgeService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var created = await service.CreateAsync(organization.Id, new CreateKnowledgeArticleDto("Firewall", "Network", "Text", []));
        var id = created.Value.Should().BeOfType<KnowledgeArticleDto>().Subject.Id;

        var starred = await service.ToggleStarAsync(id);
        var updated = await service.UpdateAsync(id, new UpdateKnowledgeArticleDto("Firewall 2", "Network", "Updated", []));
        var fetched = await service.GetByIdAsync(id);

        starred.Value.Should().BeOfType<KnowledgeStarredDto>().Subject.Starred.Should().BeTrue();
        updated.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fetched.Value.Should().BeOfType<KnowledgeArticleDto>().Subject.Title.Should().Be("Firewall 2");
    }

    [Fact]
    public async Task LicenseService_CalculatesStatusAndPreservesStarContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new LicenseService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var created = await service.CreateAsync(organization.Id, new CreateLicenseDto(
            "Server", "Vendor", LicenseCategory.Software, LicenseType.Subscription, 5, 1,
            today, today.AddYears(1), 100, "USD", "KEY", ""));
        var license = created.Value.Should().BeOfType<LicenseDto>().Subject;
        var starred = await service.ToggleStarAsync(license.Id);

        license.Status.Should().Be(LicenseStatus.Active);
        starred.Value.Should().BeOfType<LicenseStarredDto>().Subject.Starred.Should().BeTrue();
    }

    [Fact]
    public async Task PlanService_RejectsAssetFromAnotherOrganizationWithoutSaving()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var otherOrganization = new Organization { Name = "Other" };
        var foreignAsset = new Asset { OrganizationId = otherOrganization.Id, Name = "Foreign" };
        _fixture.Db.AddRange(otherOrganization, foreignAsset);
        await _fixture.Db.SaveChangesAsync();
        var service = new PlanService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);

        var result = await service.CreateAsync(organization.Id, Plan("Invalid", [foreignAsset.Id]));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        _fixture.Db.Plans.Should().BeEmpty();
    }

    [Fact]
    public async Task IncidentService_GetAllDoesNotReturnOtherOrganizationData()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var otherOrganization = new Organization { Name = "Other" };
        _fixture.Db.Organizations.Add(otherOrganization);
        _fixture.Db.Incidents.Add(new Incident
        {
            OrganizationId = otherOrganization.Id, Title = "Foreign", Description = "", Resolution = "",
            AffectedSystems = [], Tags = [], OccurredAt = DateTime.UtcNow
        });
        await _fixture.Db.SaveChangesAsync();
        var service = new IncidentService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        await service.CreateAsync(organization.Id, Incident("Own"));

        var result = await service.GetAllAsync(null, null);

        result.Value.Should().BeOfType<List<IncidentDto>>().Subject.Should().ContainSingle(item => item.Title == "Own");
    }

    [Fact]
    public async Task KnowledgeService_CreateListAndDeletePreserveContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new KnowledgeService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var created = await service.CreateAsync(organization.Id, new CreateKnowledgeArticleDto("Article", "General", "Text", []));
        var id = created.Value.Should().BeOfType<KnowledgeArticleDto>().Subject.Id;

        (await service.GetAllAsync(organization.Id, null)).Value.Should().BeOfType<List<KnowledgeArticleDto>>()
            .Subject.Should().ContainSingle(item => item.Id == id);
        (await service.DeleteAsync(id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.GetByIdAsync(id)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task LicenseService_UpdateAndDeletePreserveContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new LicenseService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var created = await service.CreateAsync(organization.Id, License("Old", today));
        var id = created.Value.Should().BeOfType<LicenseDto>().Subject.Id;

        var update = await service.UpdateAsync(id, new UpdateLicenseDto("New", "Vendor", LicenseCategory.Software,
            LicenseType.Subscription, 10, 2, today, today.AddYears(1), 200, "USD", "NEW", ""));

        update.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.GetByIdAsync(id)).Value.Should().BeOfType<LicenseDto>().Subject.Name.Should().Be("New");
        (await service.DeleteAsync(id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task PlanService_PreservesCrudAndPaginationContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var asset = new Asset { OrganizationId = organization.Id, Name = "Server" };
        _fixture.Db.Assets.Add(asset);
        await _fixture.Db.SaveChangesAsync();
        var service = new PlanService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var created = await service.CreateAsync(organization.Id, Plan("Old", [asset.Id]));
        var id = created.Value.Should().BeOfType<PlanDto>().Subject.Id;

        var updated = await service.UpdateAsync(id, new UpdatePlanDto("New", "", Priority.High, PlanStatus.Completed,
            DateOnly.FromDateTime(DateTime.UtcNow), [], [asset.Id], 1));
        var all = await service.GetAllAsync(organization.Id, null);

        updated.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        all.Value.Should().BeOfType<List<PlanDto>>().Subject.Should().ContainSingle(item => item.Title == "New");
        all.Pagination!.TotalCount.Should().Be(1);
        (await service.DeleteAsync(id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    [Theory]
    [InlineData("incidents")]
    [InlineData("knowledge")]
    [InlineData("licenses")]
    [InlineData("plans")]
    public async Task IncompletePagination_IsRejected(string module)
    {
        _fixture.SeedUserWithOrg();
        var invalid = new PaginationParameters { Page = 1 };
        var result = module switch
        {
            "incidents" => await new IncidentService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).GetAllAsync(null, invalid),
            "knowledge" => await new KnowledgeService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).GetAllAsync(null, invalid),
            "licenses" => await new LicenseService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).GetAllAsync(null, invalid),
            _ => await new PlanService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).GetAllAsync(null, invalid)
        };

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Theory]
    [InlineData("incidents")]
    [InlineData("knowledge")]
    [InlineData("licenses")]
    [InlineData("plans")]
    public async Task ReadOnlyMember_CanReadButCannotCreate(string module)
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var readOnlyUser = new User { Email = $"{module}@test.local", DisplayName = "RO", PasswordHash = [1], PasswordSalt = [1] };
        _fixture.Db.Users.Add(readOnlyUser);
        _fixture.Db.UserOrganizations.Add(new UserOrganization { UserId = readOnlyUser.Id, OrganizationId = organization.Id, Role = OrgRole.ReadOnly });
        await _fixture.Db.SaveChangesAsync();
        _fixture.ActAs(readOnlyUser.Id);

        ApiOperationResult read;
        ApiOperationResult write;
        switch (module)
        {
            case "incidents":
                var incidents = new IncidentService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
                read = await incidents.GetAllAsync(organization.Id, null);
                write = await incidents.CreateAsync(organization.Id, Incident("Blocked"));
                break;
            case "knowledge":
                var knowledge = new KnowledgeService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
                read = await knowledge.GetAllAsync(organization.Id, null);
                write = await knowledge.CreateAsync(organization.Id, new CreateKnowledgeArticleDto("Blocked", "", "", []));
                break;
            case "licenses":
                var licenses = new LicenseService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                read = await licenses.GetAllAsync(organization.Id, null);
                write = await licenses.CreateAsync(organization.Id, new CreateLicenseDto("Blocked", "", LicenseCategory.Software,
                    LicenseType.Perpetual, 1, 0, today, today.AddDays(1), 0, "USD", "", ""));
                break;
            default:
                var plans = new PlanService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
                read = await plans.GetAllAsync(organization.Id, null);
                write = await plans.CreateAsync(organization.Id, Plan("Blocked", []));
                break;
        }

        read.StatusCode.Should().Be(StatusCodes.Status200OK);
        write.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    public void Dispose() => _fixture.Dispose();

    private static CreateIncidentDto Incident(string title) =>
        new(title, IncidentSeverity.Low, IncidentStatus.Open, "", "", [], DateTime.UtcNow, null, []);

    private static CreatePlanDto Plan(string title, List<Guid> assetIds) =>
        new(title, "", Priority.Low, PlanStatus.Planned, DateOnly.FromDateTime(DateTime.UtcNow), [], assetIds, 0);

    private static CreateLicenseDto License(string name, DateOnly today) =>
        new(name, "Vendor", LicenseCategory.Software, LicenseType.Subscription, 5, 1,
            today, today.AddYears(1), 100, "USD", "KEY", "");
}
