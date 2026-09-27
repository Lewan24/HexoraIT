using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Controllers;

public class ClientsTests : IDisposable
{
    private readonly TestFixture fx = new();
    private OrganizationRoleService Roles() => new(fx.Db, fx.UserContext, new Pbkdf2PasswordHasher());
    private async Task<User> CreateClient(Organization org)
    {
        (await Roles().CreateClientAsync(org.Id, new CreateClientDto("client@example.com", "Client", "password123456789"))).StatusCode.Should().Be(StatusCodes.Status200OK);
        return await fx.Db.Users.SingleAsync(u => u.SystemRole == SystemRole.Client);
    }

    [Fact]
    public async Task Client_DefaultsDenyResourcesAndManagement_ButReportsBecomeTasks()
    {
        var (owner, org) = fx.SeedUserWithOrg();
        var client = await CreateClient(org);
        fx.ActAs(client.Id);
        var access = (await Roles().GetAccessAsync(org.Id)).Value.As<OrganizationAccessDto>();
        access.Permissions.Should().BeEmpty();
        access.CanManageRoles.Should().BeFalse();
        (await fx.UserContext.HasPermissionAsync(org.Id, "assets")).Should().BeFalse();
        (await fx.UserContext.GetRoleAsync(org.Id)).Should().Be(OrgRole.ReadOnly);
        var organizations = new OrganizationService(fx.Db, fx.Mapper, fx.UserContext);
        (await organizations.CreateAsync(new CreateOrganizationDto("Forbidden", "", "", ""))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await Roles().CreateClientAsync(org.Id, new CreateClientDto("other@example.com", "Other", "password123456789"))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        var reports = new ClientReportService(fx.Db, fx.UserContext);
        (await reports.CreateAsync(Guid.NewGuid(), new CreateClientReportDto("Title", "Description", Priority.High))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await reports.CreateAsync(org.Id, new CreateClientReportDto("Title", "Description", Priority.High))).StatusCode.Should().Be(StatusCodes.Status200OK);
        (await fx.Db.Tasks.ToListAsync()).Should().BeEmpty();
        fx.ActAs(owner.Id);
        var task = await fx.Db.Tasks.SingleAsync();
        task.Status.Should().Be(WorkTaskStatus.Todo);
        task.Priority.Should().Be(Priority.High);
        task.Assignee.Should().BeEmpty();
        task.Tags.Should().BeEmpty();
        task.CreatedByUserId.Should().Be(client.Id);
        task.CreatedByName.Should().Be("Client");
        task.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(10));
        (await organizations.InviteMemberAsync(org.Id, new InviteMemberDto(client.Email, OrgRole.Admin))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await Roles().AssignAsync(org.Id, client.Id, new AssignOrganizationRoleDto(OrgRole.Admin, null))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task IndividualClientRules_OverrideDefaults_AndNeverAffectOtherClients()
    {
        var (owner, org) = fx.SeedUserWithOrg();
        var client = await CreateClient(org);
        var first = new Asset { OrganizationId = org.Id, Name = "First" };
        var second = new Asset { OrganizationId = org.Id, Name = "Second" };
        fx.Db.Assets.AddRange(first, second);
        await fx.Db.SaveChangesAsync();
        (await Roles().SaveClientPermissionsAsync(org.Id, client.Id, new SaveOrganizationRoleDto("Client", [new("assets", first.Id, true, false)]))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fx.ActAs(client.Id);
        (await fx.Db.Assets.Select(a => a.Id).ToListAsync()).Should().Equal(first.Id);
        (await fx.UserContext.HasPermissionAsync(org.Id, "assets", true, first.Id)).Should().BeFalse();
        fx.ActAs(owner.Id);
        (await Roles().SaveClientPermissionsAsync(org.Id, client.Id, new SaveOrganizationRoleDto("Client", [new("assets", Guid.Empty, true, true), new("assets", second.Id, false, false)]))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fx.ActAs(client.Id);
        (await fx.Db.Assets.Select(a => a.Id).ToListAsync()).Should().Equal(first.Id);
        (await fx.UserContext.HasPermissionAsync(org.Id, "assets", true, first.Id)).Should().BeTrue();
        (await fx.UserContext.HasPermissionAsync(org.Id, "assets", true, second.Id)).Should().BeFalse();
        fx.ActAs(owner.Id);
        await Roles().CreateClientAsync(org.Id, new CreateClientDto("second@example.com", "Second client", "password123456789"));
        fx.ActAs((await fx.Db.Users.SingleAsync(u => u.Email == "second@example.com")).Id);
        (await fx.Db.Assets.ToListAsync()).Should().BeEmpty();
        fx.ActAs(owner.Id);
        (await Roles().SaveClientPermissionsAsync(org.Id, client.Id, new SaveOrganizationRoleDto("Client", [new("settings", Guid.Empty, true, true)]))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await Roles().SaveClientPermissionsAsync(org.Id, client.Id, new SaveOrganizationRoleDto("Client", [new("tasks", Guid.Empty, true, true)]))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task CopyRole_RequiresConfirmation_PreservesLocalRulesAndAssignments()
    {
        var (owner, sourceOrg) = fx.SeedUserWithOrg();
        var targetOrg = new Organization { Name = "Target" };
        fx.Db.Organizations.Add(targetOrg);
        fx.Db.UserOrganizations.Add(new UserOrganization { UserId = owner.Id, OrganizationId = targetOrg.Id, Role = OrgRole.Admin });
        var source = new OrganizationRole { OrganizationId = sourceOrg.Id, Name = "Caretaker" };
        source.Permissions.Add(new RolePermission { RoleId = source.Id, Resource = "assets", CanRead = true, CanWrite = true });
        source.Permissions.Add(new RolePermission { RoleId = source.Id, Resource = "assets", ResourceId = Guid.NewGuid(), CanRead = false });
        var target = new OrganizationRole { OrganizationId = targetOrg.Id, Name = "Caretaker" };
        var restrictionId = Guid.NewGuid();
        target.Permissions.Add(new RolePermission { RoleId = target.Id, Resource = "assets", ResourceId = restrictionId });
        var worker = new User { Email = "worker@example.com" };
        fx.Db.Users.Add(worker);
        fx.Db.OrganizationRoles.AddRange(source, target);
        fx.Db.UserOrganizations.Add(new UserOrganization { UserId = worker.Id, OrganizationId = targetOrg.Id, CustomRoleId = target.Id, Role = OrgRole.ReadOnly });
        await fx.Db.SaveChangesAsync();
        (await Roles().CopyAsync(sourceOrg.Id, source.Id, new CopyRoleDto([targetOrg.Id]))).StatusCode.Should().Be(StatusCodes.Status409Conflict);
        (await fx.Db.RolePermissions.CountAsync(p => p.RoleId == target.Id)).Should().Be(1);
        (await Roles().CopyAsync(sourceOrg.Id, source.Id, new CopyRoleDto([targetOrg.Id], true))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        var rules = await fx.Db.RolePermissions.Where(p => p.RoleId == target.Id).ToListAsync();
        rules.Should().HaveCount(2);
        rules.Should().Contain(p => p.ResourceId == restrictionId && !p.CanRead);
        rules.Should().Contain(p => p.ResourceId == Guid.Empty && p.CanWrite);
        (await fx.Db.UserOrganizations.SingleAsync(m => m.UserId == worker.Id)).CustomRoleId.Should().Be(target.Id);
        (await Roles().CopyAsync(sourceOrg.Id, source.Id, new CopyRoleDto([targetOrg.Id, Guid.NewGuid()], true))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    public void Dispose() => fx.Dispose();

    [Fact]
    public async Task OrganizationAdmin_CanCreateClient_ButMemberCannot()
    {
        var (admin, org) = fx.SeedUserWithOrg(OrgRole.Admin);
        await CreateClient(org);
        var membership = await fx.Db.UserOrganizations.SingleAsync(m => m.UserId == admin.Id);
        membership.Role = OrgRole.Member;
        await fx.Db.SaveChangesAsync();
        (await Roles().CreateClientAsync(org.Id, new CreateClientDto("denied@example.com", "Denied", "password123456789"))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task CopyToNewOrganization_CopiesOnlyModulePermissions()
    {
        var (owner, org) = fx.SeedUserWithOrg();
        var target = new Organization { Name = "New target" };
        fx.Db.Organizations.Add(target);
        fx.Db.UserOrganizations.Add(new UserOrganization { UserId = owner.Id, OrganizationId = target.Id, Role = OrgRole.Owner });
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Support" };
        role.Permissions.Add(new RolePermission { RoleId = role.Id, Resource = "assets", CanRead = true });
        role.Permissions.Add(new RolePermission { RoleId = role.Id, Resource = "assets", ResourceId = Guid.NewGuid() });
        fx.Db.OrganizationRoles.Add(role);
        await fx.Db.SaveChangesAsync();
        (await Roles().CopyAsync(org.Id, role.Id, new CopyRoleDto([target.Id]))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        var copy = await fx.Db.OrganizationRoles.Include(r => r.Permissions).SingleAsync(r => r.OrganizationId == target.Id);
        copy.Id.Should().NotBe(role.Id);
        copy.Name.Should().Be("Support");
        copy.Permissions.Should().ContainSingle(p => p.ResourceId == Guid.Empty && p.CanRead && !p.CanWrite);
    }
}
