using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Application;

public sealed class GroupServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    private GroupService Service() => new(_fixture.Db, _fixture.Mapper, _fixture.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsGroupWithPaginationMetadata()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();

        var created = await service.CreateAsync(organization.Id, Group("Servers"));
        var all = await service.GetAllAsync(organization.Id, null);

        created.StatusCode.Should().Be(StatusCodes.Status201Created);
        created.Location.Should().StartWith("/api/groups/");
        var group = created.Value.Should().BeOfType<GroupDto>().Subject;
        all.Value.Should().BeOfType<List<GroupDto>>().Subject
            .Should().ContainSingle(candidate => candidate.Id == group.Id);
        all.Pagination!.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Update_ChangesGroup()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Group("Old")))
            .Value.Should().BeOfType<GroupDto>().Subject.Id;

        var updated = await service.UpdateAsync(id,
            new UpdateGroupDto("New", GroupType.LocalGroup, "", "", [], [], []));
        var fetched = await service.GetByIdAsync(id);

        updated.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fetched.Value.Should().BeOfType<GroupDto>().Subject.Name.Should().Be("New");
    }

    [Fact]
    public async Task Delete_RemovesGroup()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Group("Group")))
            .Value.Should().BeOfType<GroupDto>().Subject.Id;

        var deleted = await service.DeleteAsync(id);
        var fetched = await service.GetByIdAsync(id);

        deleted.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fetched.StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task Create_WithAssetFromAnotherOrganization_IsRejectedWithoutSavingGroup()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var otherOrganization = new Organization { Name = "Other", Color = "#111", Initials = "OT" };
        var foreignAsset = new Asset { OrganizationId = otherOrganization.Id, Name = "Foreign" };
        _fixture.Db.AddRange(otherOrganization, foreignAsset);
        await _fixture.Db.SaveChangesAsync();

        var result = await Service().CreateAsync(organization.Id,
            new CreateGroupDto("Invalid", GroupType.LocalGroup, "", "", [], [foreignAsset.Id], []));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        _fixture.Db.Groups.Should().BeEmpty();
    }

    [Fact]
    public async Task ReadOnlyMember_CanReadButCannotDelete()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Group("Group")))
            .Value.Should().BeOfType<GroupDto>().Subject.Id;
        var readOnlyUser = new User
        {
            Email = "group-ro@test.local",
            DisplayName = "RO",
            PasswordHash = [1],
            PasswordSalt = [1]
        };
        _fixture.Db.Users.Add(readOnlyUser);
        _fixture.Db.UserOrganizations.Add(new UserOrganization
        {
            UserId = readOnlyUser.Id,
            OrganizationId = organization.Id,
            Role = OrgRole.ReadOnly
        });
        await _fixture.Db.SaveChangesAsync();
        _fixture.ActAs(readOnlyUser.Id);

        var read = await service.GetByIdAsync(id);
        var delete = await service.DeleteAsync(id);

        read.StatusCode.Should().Be(StatusCodes.Status200OK);
        delete.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    public void Dispose() => _fixture.Dispose();

    private static CreateGroupDto Group(string name) =>
        new(name, GroupType.LocalGroup, "desc", "purpose", [], [], []);
}
