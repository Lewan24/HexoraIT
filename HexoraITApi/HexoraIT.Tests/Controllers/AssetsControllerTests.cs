using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class AssetsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();
    private AssetsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsTheAsset()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var dto = new CreateAssetDto("SRV-01", AssetType.Server, AssetStatus.Online, "DC-A1", "Jane", "10.0.0.1", [], "", null);
        var created = await sut.Create(org.Id, dto);

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);
        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();
        result.Value.Should().BeOfType<List<AssetDto>>();
        result.Value.As<List<AssetDto>>().Should().ContainSingle(a => a.Name == "SRV-01");
    }

    [Fact]
    public async Task Create_WithoutMembership_ReturnsForbidOrNotFound()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var otherUser = new User { Email = "outsider@test.local", DisplayName = "Outsider", PasswordHash = [1], PasswordSalt = [1] };

        _fx.Db.Users.Add(otherUser);
        await _fx.Db.SaveChangesAsync();

        _fx.ActAs(otherUser.Id);

        var sut = Controller();
        var dto = new CreateAssetDto("SRV-02", AssetType.Server, AssetStatus.Online, "DC-A1", "Jane", "10.0.0.2", [], "", null);
        var result = await sut.Create(org.Id, dto);

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task GetAll_OnlyReturnsAssetsFromCallersOrgs()
    {
        var (user, orgA) = _fx.SeedUserWithOrg();
        var orgB = new Organization { Name = "Org B", Color = "#111", Initials = "OB" };

        _fx.Db.Organizations.Add(orgB);
        _fx.Db.Assets.Add(new Asset { OrganizationId = orgB.Id, Name = "OtherOrgAsset", Type = AssetType.Server, Status = AssetStatus.Online, UpdatedAt = DateTime.UtcNow });
        await _fx.Db.SaveChangesAsync();

        var sut = Controller();
        await sut.Create(orgA.Id, new CreateAssetDto("MyAsset", AssetType.Server, AssetStatus.Online, "", "", "", [], "", null));

        var all = await sut.GetAll(orgA.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();

        result!.Value.Should().BeOfType<List<AssetDto>>();
        result.Value.As<List<AssetDto>>()
            .Should().ContainSingle(a => a.Name == "MyAsset");
    }

    [Fact]
    public async Task Update_ChangesFieldsAndTimestamp()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();
        var create = await sut.Create(org.Id, new CreateAssetDto("SRV-01", AssetType.Server, AssetStatus.Online, "", "", "", [], "", null));

        var createdResult = create.Result as CreatedAtActionResult;
        createdResult.Should().NotBeNull();

        var created = createdResult.Value.As<AssetDto>();

        var result = await sut.Update(created.Id, new UpdateAssetDto("SRV-01-renamed", AssetType.Server, AssetStatus.Maintenance, "", "", "", [], "", null));
        result.Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(created.Id);

        var getResult = get.Result as OkObjectResult;
        getResult.Should().NotBeNull();

        var fetched = getResult.Value.As<AssetDto>();

        fetched.Name.Should().Be("SRV-01-renamed");
        fetched.Status.Should().Be(AssetStatus.Maintenance);
    }

    [Fact]
    public async Task Delete_RemovesAsset()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();
        var create = await sut.Create(org.Id, new CreateAssetDto("SRV-01", AssetType.Server, AssetStatus.Online, "", "", "", [], "", null));

        var created = (create.Result as CreatedAtActionResult)!
            .Value.As<AssetDto>();

        (await sut.Delete(created.Id))
            .Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(created.Id);

        get.Result.Should().BeOfType<NotFoundResult>();
    }

    [Fact]
    public async Task ToggleStar_FlipsStarredFlag()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();
        var create = await sut.Create(org.Id, new CreateAssetDto("SRV-01", AssetType.Server, AssetStatus.Online, "", "", "", [], "", null));

        var created = (create.Result as CreatedAtActionResult)!
            .Value.As<AssetDto>();

        created.Starred.Should().BeFalse();

        (await sut.ToggleStar(created.Id))
            .Should().BeOfType<OkObjectResult>();

        var get = await sut.GetById(created.Id);

        var fetched = ((OkObjectResult)get.Result!).Value.As<AssetDto>();

        fetched.Starred.Should().BeTrue();
    }

    [Fact]
    public async Task ReadOnlyMember_CanRead_ButWriteFails()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();
        var create = await sut.Create(org.Id, new CreateAssetDto("SRV-01", AssetType.Server, AssetStatus.Online, "", "", "", [], "", null));

        var created = (create.Result as CreatedAtActionResult)!
            .Value.As<AssetDto>();

        var readOnlyUser = new User { Email = "ro@test.local", DisplayName = "RO", PasswordHash = [1], PasswordSalt = [1] };

        _fx.Db.Users.Add(readOnlyUser);
        _fx.Db.UserOrganizations.Add(new UserOrganization { UserId = readOnlyUser.Id, OrganizationId = org.Id, Role = OrgRole.ReadOnly });
        await _fx.Db.SaveChangesAsync();

        _fx.ActAs(readOnlyUser.Id);

        var get = await sut.GetById(created.Id);
        get.Result.Should().BeOfType<OkObjectResult>();

        var update = await sut.Update(created.Id, new UpdateAssetDto("renamed", AssetType.Server, AssetStatus.Online, "", "", "", [], "", null));
        update.Should().BeOfType<ForbidResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}