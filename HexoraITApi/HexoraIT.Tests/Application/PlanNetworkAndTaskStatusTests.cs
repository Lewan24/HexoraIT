using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class PlanNetworkAndTaskStatusTests : IDisposable
{
    private readonly TestFixture fixture = new();
    private PlanService Plans() => new(fixture.Db, fixture.Mapper, fixture.UserContext);
    private WorkTaskService Tasks() => new(fixture.Db, fixture.Mapper, fixture.UserContext);
    private static CreatePlanDto Plan(List<Guid>? networks = null) => new("Network upgrade", "Details", Priority.Medium, PlanStatus.Planned, new(2026, 12, 1), [], [], 100, networks);

    [Fact]
    public async Task PlanNetworksPersistInReadDtosLegacyEditsPreserveAndExplicitEmptyClearsThem()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var subnet = new Subnet { OrganizationId = org.Id, Name = "Office", Cidr = "10.0.0.0/24" };
        fixture.Db.Add(subnet); await fixture.Db.SaveChangesAsync();
        var created = (PlanDto)(await Plans().CreateAsync(org.Id, Plan([subnet.Id]))).Value!;
        created.SubnetIds.Should().Equal(subnet.Id);
        fixture.Db.ChangeTracker.Clear();
        ((PlanDto)(await Plans().GetByIdAsync(created.Id)).Value!).SubnetIds.Should().Equal(subnet.Id);
        ((List<PlanDto>)(await Plans().GetAllAsync(org.Id, null)).Value!).Single().SubnetIds.Should().Equal(subnet.Id);
        var legacy = new UpdatePlanDto("Legacy edit", "Keep networks", Priority.Low, PlanStatus.Planned, new(2026, 12, 1), [], [], 0);
        (await Plans().UpdateAsync(created.Id, legacy)).StatusCode.Should().Be(204);
        (await fixture.Db.Plans.SingleAsync()).SubnetIds.Should().Equal(subnet.Id);
        (await Plans().UpdateAsync(created.Id, legacy with { SubnetIds = [] })).StatusCode.Should().Be(204);
        (await fixture.Db.Plans.SingleAsync()).SubnetIds.Should().BeEmpty();
    }

    [Fact]
    public async Task InvalidForeignAndUnreadableNetworksAreRejectedBeforeAnyPlanMutation()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Other" };
        var foreign = new Subnet { OrganizationId = other.Id, Name = "Foreign" };
        var hidden = new Subnet { OrganizationId = org.Id, Name = "Hidden" };
        fixture.Db.AddRange(other, foreign, hidden); await fixture.Db.SaveChangesAsync();
        foreach (var id in new[] { foreign.Id, Guid.NewGuid(), Guid.Empty })
            (await Plans().CreateAsync(org.Id, Plan([id]))).StatusCode.Should().Be(400);
        (await fixture.Db.Plans.CountAsync()).Should().Be(0);
        var created = (PlanDto)(await Plans().CreateAsync(org.Id, Plan())).Value!;
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Plans only", Permissions = [new() { Resource = "plans", CanRead = true, CanWrite = true }] };
        fixture.Db.Add(role); (await fixture.Db.UserOrganizations.SingleAsync()).CustomRoleId = role.Id;
        await fixture.Db.SaveChangesAsync();
        (await Plans().CreateAsync(org.Id, Plan([hidden.Id]))).StatusCode.Should().Be(400);
        (await Plans().UpdateAsync(created.Id, new("Changed", "", Priority.Low, PlanStatus.Planned, new(2026, 12, 1), [], [], 0, [hidden.Id]))).StatusCode.Should().Be(400);
        (await fixture.Db.Plans.SingleAsync()).Title.Should().Be("Network upgrade");
    }

    [Fact]
    public async Task StatusChangeDoesNotOverwriteDescriptionAuthorProjectOrOrder()
    {
        var (user, org) = fixture.SeedUserWithOrg();
        var project = new Project { OrganizationId = org.Id, Name = "Project" };
        var task = new WorkTask { OrganizationId = org.Id, Title = "Task", Description = "Keep **formatting**\nSecond line", ProjectId = project.Id, CreatedByUserId = user.Id, CreatedByName = "Original author", SortIndex = 50, Assignee = "Admin" };
        fixture.Db.AddRange(project, task); await fixture.Db.SaveChangesAsync();
        foreach (var status in new[] { WorkTaskStatus.InProgress, WorkTaskStatus.Done, WorkTaskStatus.Todo })
        {
            var result = await Tasks().UpdateStatusAsync(task.Id, new(status));
            result.StatusCode.Should().Be(200); ((UpdateTaskStatusDto)result.Value!).Status.Should().Be(status);
        }
        fixture.Db.ChangeTracker.Clear();
        var saved = await fixture.Db.Tasks.SingleAsync();
        saved.Description.Should().Be("Keep **formatting**\nSecond line"); saved.CreatedByName.Should().Be("Original author");
        saved.CreatedByUserId.Should().Be(user.Id); saved.ProjectId.Should().Be(project.Id); saved.SortIndex.Should().Be(50); saved.Assignee.Should().Be("Admin");
        (await Tasks().UpdateStatusAsync(task.Id, new(null))).StatusCode.Should().Be(400);
        (await Tasks().UpdateStatusAsync(task.Id, new((WorkTaskStatus)999))).StatusCode.Should().Be(400);
    }

    [Theory]
    [InlineData(OrgRole.Owner, 200)]
    [InlineData(OrgRole.Member, 200)]
    [InlineData(OrgRole.ReadOnly, 403)]
    public async Task StatusWritesRespectRolesAndOrganizationIsolation(OrgRole role, int expected)
    {
        var (_, org) = fixture.SeedUserWithOrg(role);
        var other = new Organization { Name = "Other" };
        var mine = new WorkTask { OrganizationId = org.Id, Title = "Mine" };
        var foreign = new WorkTask { OrganizationId = other.Id, Title = "Foreign" };
        fixture.Db.AddRange(other, mine, foreign); await fixture.Db.SaveChangesAsync();
        (await Tasks().UpdateStatusAsync(mine.Id, new(WorkTaskStatus.Done))).StatusCode.Should().Be(expected);
        (await Tasks().UpdateStatusAsync(foreign.Id, new(WorkTaskStatus.Done))).StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task IndividualDenyAndClientCannotMoveTasks()
    {
        var (user, org) = fixture.SeedUserWithOrg();
        var task = new WorkTask { OrganizationId = org.Id, Title = "Read only task" };
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Custom", Permissions = [new() { Resource = "tasks", CanRead = true, CanWrite = true }, new() { Resource = "tasks", ResourceId = task.Id, CanRead = true, CanWrite = false }] };
        fixture.Db.AddRange(task, role); (await fixture.Db.UserOrganizations.SingleAsync()).CustomRoleId = role.Id;
        await fixture.Db.SaveChangesAsync();
        (await Tasks().UpdateStatusAsync(task.Id, new(WorkTaskStatus.Done))).StatusCode.Should().Be(403);
        user.SystemRole = SystemRole.Client;
        fixture.Db.ClientPermissions.Add(new() { OrganizationId = org.Id, UserId = user.Id, Resource = "tasks", ResourceId = task.Id, CanRead = true, CanWrite = true });
        await fixture.Db.SaveChangesAsync();
        (await Tasks().UpdateStatusAsync(task.Id, new(WorkTaskStatus.Done))).StatusCode.Should().Be(403);
        task.Status.Should().Be(WorkTaskStatus.Todo);
    }
    public void Dispose() => fixture.Dispose();
}
