using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexoraIT.Tests.Controllers;

public class OrganizationRolesControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();
    private OrganizationRoleService Roles() => new(_fx.Db, _fx.UserContext, new Pbkdf2PasswordHasher());

    private async Task<OrganizationRole> AssignCustomRole(User user, Organization org, params PermissionDto[] permissions)
    {
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Caretaker" };
        role.Permissions = permissions.Select(p => new RolePermission
        {
            RoleId = role.Id, Resource = p.Resource, ResourceId = p.ResourceId,
            CanRead = p.CanRead, CanWrite = p.CanWrite
        }).ToList();
        _fx.Db.OrganizationRoles.Add(role);
        var membership = await _fx.Db.UserOrganizations.SingleAsync(m => m.UserId == user.Id && m.OrganizationId == org.Id);
        membership.Role = OrgRole.ReadOnly;
        membership.CustomRoleId = role.Id;
        await _fx.Db.SaveChangesAsync();
        _fx.Db.ChangeTracker.Clear();
        return role;
    }

    [Fact]
    public async Task RestrictedModule_DeniesScopedListAndFiltersUnscopedListAndDirectLookup()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var contract = new Contract { OrganizationId = org.Id, Name = "Confidential" };
        _fx.Db.Contracts.Add(contract);
        await _fx.Db.SaveChangesAsync();
        await AssignCustomRole(user, org, new PermissionDto("assets", Guid.Empty, true, true));
        var contracts = new ContractService(_fx.Db, _fx.Mapper, _fx.UserContext, _fx.Storage, NullLogger<ContractService>.Instance);

        (await contracts.GetAllAsync(org.Id, null)).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await contracts.GetAllAsync(null, null)).Value.As<List<ContractDto>>().Should().BeEmpty();
        (await contracts.GetByIdAsync(contract.Id)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
        (await _fx.Db.Contracts.ToListAsync()).Should().BeEmpty();
    }

    [Fact]
    public async Task IndividualRestrictions_FilterReadAndRejectWrite()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var hidden = new Asset { OrganizationId = org.Id, Name = "Hidden" };
        var readOnly = new Asset { OrganizationId = org.Id, Name = "Read only" };
        var writable = new Asset { OrganizationId = org.Id, Name = "Writable" };
        _fx.Db.Assets.AddRange(hidden, readOnly, writable);
        await _fx.Db.SaveChangesAsync();
        await AssignCustomRole(user, org,
            new PermissionDto("assets", Guid.Empty, true, true),
            new PermissionDto("assets", hidden.Id, false, false),
            new PermissionDto("assets", readOnly.Id, true, false));
        var assets = new AssetService(_fx.Db, _fx.Mapper, _fx.UserContext);

        (await _fx.Db.Assets.Select(a => a.Id).ToListAsync()).Should().BeEquivalentTo([readOnly.Id, writable.Id]);
        (await assets.GetByIdAsync(hidden.Id)).StatusCode.Should().Be(404);
        (await assets.DeleteAsync(readOnly.Id)).StatusCode.Should().Be(403);
        (await assets.ToggleStarAsync(writable.Id)).StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task PasswordRevealAndDocumentDownload_CannotBypassPermissions()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var password = new PasswordEntry { OrganizationId = org.Id, Name = "Secret", EncryptedPassword = [1, 2, 3] };
        var file = new StoredFile { OrganizationId = org.Id, Name = "Secret.pdf", BlobPath = "secret" };
        _fx.Db.Passwords.Add(password);
        _fx.Db.StoredFiles.Add(file);
        await _fx.Db.SaveChangesAsync();
        await AssignCustomRole(user, org);

        var passwords = Passwords();
        var files = Files();
        (await passwords.RevealAsync(password.Id)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
        (await files.GetContentAsync(file.Id, true)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
        (await files.GetContentAsync(file.Id, false)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task PermissionRevocation_TakesEffectWithoutNewLogin()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        _fx.Db.Assets.Add(new Asset { OrganizationId = org.Id, Name = "Asset" });
        await _fx.Db.SaveChangesAsync();
        var role = await AssignCustomRole(user, org, new PermissionDto("assets", Guid.Empty, true, true));
        (await _fx.UserContext.HasPermissionAsync(org.Id, "assets", true)).Should().BeTrue();
        (await _fx.Db.Assets.CountAsync()).Should().Be(1);

        var permission = await _fx.Db.RolePermissions.SingleAsync(p => p.RoleId == role.Id);
        permission.CanRead = false;
        permission.CanWrite = false;
        await _fx.Db.SaveChangesAsync();

        (await _fx.UserContext.HasPermissionAsync(org.Id, "assets")).Should().BeFalse();
        (await _fx.Db.Assets.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task CustomRole_CannotManageRolesEvenWithAllModulePermissions()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        await AssignCustomRole(user, org, OrganizationResources.All.Select(r => new PermissionDto(r, Guid.Empty, true, true)).ToArray());
        (await Roles().CreateAsync(org.Id, new("Escalation", []))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await Roles().GetRolesAsync(org.Id, null)).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        var access = (await Roles().GetAccessAsync(org.Id)).Value.As<OrganizationAccessDto>();
        access.CanManageRoles.Should().BeFalse();
    }

    [Fact]
    public async Task CrossOrganizationRoleAssignment_IsRejected()
    {
        var (owner, org) = _fx.SeedUserWithOrg();
        var (other, otherOrg) = _fx.SeedUserWithOrg();
        var foreignRole = new OrganizationRole { OrganizationId = otherOrg.Id, Name = "Foreign" };
        _fx.Db.OrganizationRoles.Add(foreignRole);
        _fx.Db.UserOrganizations.Add(new UserOrganization { OrganizationId = org.Id, UserId = other.Id });
        await _fx.Db.SaveChangesAsync();
        _fx.ActAs(owner.Id);

        (await Roles().AssignAsync(org.Id, other.Id, new(OrgRole.ReadOnly, foreignRole.Id))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await Roles().GetRolesAsync(otherOrg.Id, null)).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task RoleValidation_RejectsForeignResourcesAndInvalidRules()
    {
        var (owner, org) = _fx.SeedUserWithOrg();
        var (_, otherOrg) = _fx.SeedUserWithOrg();
        var foreign = new Asset { OrganizationId = otherOrg.Id, Name = "Foreign" };
        _fx.Db.Assets.Add(foreign);
        await _fx.Db.SaveChangesAsync();
        _fx.ActAs(owner.Id);

        (await Roles().CreateAsync(org.Id, new("Invalid", [new PermissionDto("assets", foreign.Id, true, true)]))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await Roles().CreateAsync(org.Id, new("Invalid", [new("unknown", Guid.Empty, true, true)]))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await Roles().CreateAsync(org.Id, new("Invalid", [new PermissionDto("assets", Guid.Empty, false, true)]))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task AssignedRole_CannotBeDeletedAndOwnerCannotBeReassigned()
    {
        var (owner, org) = _fx.SeedUserWithOrg();
        var (member, _) = _fx.SeedUserWithOrg();
        _fx.Db.UserOrganizations.Add(new UserOrganization { OrganizationId = org.Id, UserId = member.Id });
        await _fx.Db.SaveChangesAsync();
        var role = await AssignCustomRole(member, org);
        _fx.ActAs(owner.Id);

        (await Roles().DeleteAsync(org.Id, role.Id)).StatusCode.Should().Be(StatusCodes.Status409Conflict);
        (await Roles().AssignAsync(org.Id, owner.Id, new(OrgRole.ReadOnly, role.Id))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task Diagram_OmitsNodesAndEdgesForHiddenAssets()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var asset = new Asset { OrganizationId = org.Id, Name = "Secret" };
        var node = new DiagramNode { OrganizationId = org.Id, AssetId = asset.Id, Label = "Secret copied name" };
        _fx.Db.Assets.Add(asset);
        _fx.Db.DiagramNodes.Add(node);
        await _fx.Db.SaveChangesAsync();
        await AssignCustomRole(user, org, new PermissionDto("diagram", Guid.Empty, true, true));
        var diagram = new DiagramService(_fx.Db, _fx.Mapper, _fx.UserContext);

        var result = (await diagram.GetAsync(org.Id)).Value.As<DiagramDto>();
        result.Nodes.Should().BeEmpty();
        (await diagram.SaveAsync(org.Id, new([], []))).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task FolderDeletion_CannotDeleteRestrictedDescendantFile()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var folder = new FileFolder { OrganizationId = org.Id, Name = "Folder" };
        var file = new StoredFile { OrganizationId = org.Id, FolderId = folder.Id, Name = "Protected" };
        _fx.Db.FileFolders.Add(folder);
        _fx.Db.StoredFiles.Add(file);
        await _fx.Db.SaveChangesAsync();
        await AssignCustomRole(user, org,
            new PermissionDto("files", Guid.Empty, true, true), new PermissionDto("files", file.Id, false, false));
        var files = Files();

        (await files.DeleteFolderAsync(folder.Id)).StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        (await _fx.Db.StoredFiles.IgnoreQueryFilters().AnyAsync(f => f.Id == file.Id)).Should().BeTrue();
    }

    private PasswordVaultService Passwords() => new(
        _fx.Db, _fx.Mapper, _fx.UserContext, _fx.Cipher,
        new SecurityAuditLogger(NullLoggerFactory.Instance, new HttpContextAccessor()));

    private FileExplorerService Files() => new(
        _fx.Db, _fx.Mapper, _fx.UserContext, _fx.Storage, NullLogger<FileExplorerService>.Instance);

    public void Dispose() => _fx.Dispose();

    [Fact]
    public async Task UpdatingRole_AddsThenUpdatesAndRemovesIndividualRule()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var asset = new Asset { OrganizationId = org.Id, Name = "Selected" };
        _fx.Db.Assets.Add(asset);
        await _fx.Db.SaveChangesAsync();
        var created = (await Roles().CreateAsync(org.Id, new("Operator",
            [new("assets", Guid.Empty, true, true)]))).Value.As<OrganizationRoleDto>();
        _fx.Db.ChangeTracker.Clear();

        (await Roles().UpdateAsync(org.Id, created.Id, new("Operator",
            [new("assets", Guid.Empty, true, true), new("assets", asset.Id, false, false)]))).StatusCode
            .Should().Be(StatusCodes.Status204NoContent);
        _fx.Db.ChangeTracker.Clear();
        (await _fx.Db.RolePermissions.CountAsync(p => p.RoleId == created.Id)).Should().Be(2);

        (await Roles().UpdateAsync(org.Id, created.Id, new("Operator renamed",
            [new("assets", Guid.Empty, false, false), new("assets", asset.Id, true, false)]))).StatusCode
            .Should().Be(StatusCodes.Status204NoContent);
        _fx.Db.ChangeTracker.Clear();
        var rule = await _fx.Db.RolePermissions.SingleAsync(p => p.RoleId == created.Id && p.ResourceId == asset.Id);
        rule.CanRead.Should().BeTrue();
        rule.CanWrite.Should().BeFalse();

        (await Roles().UpdateAsync(org.Id, created.Id, new("Operator renamed",
            [new("assets", Guid.Empty, false, false)]))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await _fx.Db.RolePermissions.CountAsync(p => p.RoleId == created.Id)).Should().Be(1);
    }

    [Fact]
    public async Task IndividualGrant_ExposesOnlySelectedPasswordAndDoesNotAllowCreating()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var visible = new PasswordEntry { OrganizationId = org.Id, Name = "Shared" };
        var hidden = new PasswordEntry { OrganizationId = org.Id, Name = "Secret" };
        _fx.Db.Passwords.AddRange(visible, hidden);
        await _fx.Db.SaveChangesAsync();
        await AssignCustomRole(user, org,
            new("passwords", Guid.Empty, false, false), new("passwords", visible.Id, true, true));

        var passwords = Passwords();
        var list = (await passwords.GetAllAsync(org.Id, null)).Value.As<List<PasswordListDto>>();
        list.Select(p => p.Id).Should().Equal(visible.Id);
        (await passwords.RevealAsync(hidden.Id)).StatusCode.Should().Be(StatusCodes.Status404NotFound);
        (await _fx.UserContext.HasPermissionAsync(org.Id, "passwords", true)).Should().BeFalse();
        (await _fx.UserContext.HasPermissionAsync(org.Id, "passwords", true, visible.Id)).Should().BeTrue();
        (await passwords.ToggleStarAsync(visible.Id)).StatusCode.Should().Be(StatusCodes.Status200OK);
    }

    [Fact]
    public async Task IndividualFileGrant_IsVisibleAtRootWithoutExposingItsFolderOrOtherFiles()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var folder = new FileFolder { OrganizationId = org.Id, Name = "Private folder" };
        var visible = new StoredFile { OrganizationId = org.Id, FolderId = folder.Id, Name = "Shared file" };
        var hidden = new StoredFile { OrganizationId = org.Id, FolderId = folder.Id, Name = "Private file" };
        _fx.Db.FileFolders.Add(folder);
        _fx.Db.StoredFiles.AddRange(visible, hidden);
        await _fx.Db.SaveChangesAsync();
        await AssignCustomRole(user, org, new PermissionDto("files", visible.Id, true, false));
        var files = Files();

        var result = (await files.GetFilesAsync(org.Id, null, null)).Value.As<List<StoredFileDto>>();
        result.Select(f => f.Id).Should().Equal(visible.Id);
        (await files.GetFoldersAsync(org.Id, null, null)).Value.As<List<FileFolderDto>>().Should().BeEmpty();
    }
}
