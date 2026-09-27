using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Application;

public sealed class ProjectTaskSubnetServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    [Fact]
    public async Task ProjectService_PreservesCrudAndPaginationContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new ProjectService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var created = await service.CreateAsync(organization.Id, new CreateProjectDto("Old", "", "#111"));
        var id = created.Value.Should().BeOfType<ProjectDto>().Subject.Id;

        (await service.UpdateAsync(id, new UpdateProjectDto("New", "changed", "#222"))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        var all = await service.GetAllAsync(organization.Id, null);
        all.Value.Should().BeOfType<List<ProjectDto>>().Subject.Should().ContainSingle(item => item.Name == "New");
        all.Pagination!.TotalCount.Should().Be(1);
        (await service.DeleteAsync(id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.GetByIdAsync(id)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task WorkTaskService_PreservesCrudProjectFilterAndAuthorContract()
    {
        var (user, organization) = _fixture.SeedUserWithOrg();
        var project = new Project { OrganizationId = organization.Id, Name = "Project" };
        _fixture.Db.Projects.Add(project);
        await _fixture.Db.SaveChangesAsync();
        var service = new WorkTaskService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var created = await service.CreateAsync(organization.Id, Task("Old", project.Id));
        var task = created.Value.Should().BeOfType<WorkTaskDto>().Subject;

        task.CreatedByUserId.Should().Be(user.Id);
        task.CreatedByName.Should().Be(user.DisplayName);
        var filtered = await service.GetAllAsync(null, project.Id, null);
        filtered.Value.Should().BeOfType<List<WorkTaskDto>>().Subject.Should().ContainSingle(item => item.Id == task.Id);
        (await service.UpdateAsync(task.Id, new UpdateWorkTaskDto("New", "", Priority.High, WorkTaskStatus.Done, "", DateOnly.FromDateTime(DateTime.UtcNow), [], project.Id))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.DeleteAsync(task.Id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task SubnetService_PreservesSubnetAndIpCrudContract()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = new SubnetService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var created = await service.CreateAsync(organization.Id, Subnet("Office"));
        var subnetId = created.Value.Should().BeOfType<SubnetDto>().Subject.Id;
        var added = await service.AddIpAsync(subnetId, new CreateIPEntryDto("10.0.0.5", "Old", IPEntryStatus.Free, null, null, ""));
        var entryId = added.Value.Should().BeOfType<IPEntryDto>().Subject.Id;

        (await service.UpdateIpAsync(subnetId, entryId, new UpdateIPEntryDto("10.0.0.10", "New", IPEntryStatus.Used, null, null, ""))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.GetByIdAsync(subnetId)).Value.Should().BeOfType<SubnetDto>().Subject.Ips.Should().ContainSingle(ip => ip.Ip == "10.0.0.10");
        (await service.DeleteIpAsync(subnetId, entryId)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.UpdateAsync(subnetId, new UpdateSubnetDto("Updated", "10.1.0.0/24", 2, SubnetType.LAN, "", "", ""))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.DeleteAsync(subnetId)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task WorkTaskService_RejectsProjectFromAnotherOrganization()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Other" };
        var project = new Project { OrganizationId = other.Id, Name = "Foreign" };
        _fixture.Db.AddRange(other, project);
        await _fixture.Db.SaveChangesAsync();

        var result = await new WorkTaskService(_fixture.Db, _fixture.Mapper, _fixture.UserContext)
            .CreateAsync(organization.Id, Task("Invalid", project.Id));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        _fixture.Db.Tasks.Should().BeEmpty();
    }

    [Fact]
    public async Task SubnetService_RejectsAssetFromAnotherOrganization()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Other" };
        var asset = new Asset { OrganizationId = other.Id, Name = "Foreign" };
        _fixture.Db.AddRange(other, asset);
        await _fixture.Db.SaveChangesAsync();
        var service = new SubnetService(_fixture.Db, _fixture.Mapper, _fixture.UserContext);
        var subnetId = (await service.CreateAsync(organization.Id, Subnet("Office"))).Value.Should().BeOfType<SubnetDto>().Subject.Id;

        var result = await service.AddIpAsync(subnetId, new CreateIPEntryDto("10.0.0.5", "", IPEntryStatus.Used, asset.Id, null, ""));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        _fixture.Db.IPEntries.Should().BeEmpty();
    }

    [Theory]
    [InlineData("projects")]
    [InlineData("tasks")]
    [InlineData("networks")]
    public async Task ReadOnlyMember_CanListButCannotCreate(string module)
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var user = new User { Email = $"{module}@test.local", DisplayName = "RO", PasswordHash = [1], PasswordSalt = [1] };
        _fixture.Db.Users.Add(user);
        _fixture.Db.UserOrganizations.Add(new UserOrganization { UserId = user.Id, OrganizationId = organization.Id, Role = OrgRole.ReadOnly });
        await _fixture.Db.SaveChangesAsync();
        _fixture.ActAs(user.Id);

        var (read, write) = module switch
        {
            "projects" => (await new ProjectService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).GetAllAsync(organization.Id, null), await new ProjectService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).CreateAsync(organization.Id, new CreateProjectDto("Blocked", "", ""))),
            "tasks" => (await new WorkTaskService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).GetAllAsync(organization.Id, null, null), await new WorkTaskService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).CreateAsync(organization.Id, Task("Blocked", null))),
            _ => (await new SubnetService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).GetAllAsync(organization.Id, null), await new SubnetService(_fixture.Db, _fixture.Mapper, _fixture.UserContext).CreateAsync(organization.Id, Subnet("Blocked")))
        };
        read.StatusCode.Should().Be(StatusCodes.Status200OK);
        write.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    public void Dispose() => _fixture.Dispose();
    private static CreateWorkTaskDto Task(string title, Guid? projectId) => new(title, "", Priority.Low, WorkTaskStatus.Todo, "", DateOnly.FromDateTime(DateTime.UtcNow), [], projectId);
    private static CreateSubnetDto Subnet(string name) => new(name, "10.0.0.0/24", 1, SubnetType.LAN, "", "", "");
}
