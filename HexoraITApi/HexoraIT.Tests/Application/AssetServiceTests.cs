using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Application;

public sealed class AssetServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    private AssetService Service() => new(_fixture.Db, _fixture.Mapper, _fixture.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsTheAsset()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var dto = Asset("SRV-01", "10.0.0.1");

        var created = await service.CreateAsync(organization.Id, dto);
        var all = await service.GetAllAsync(organization.Id, null);

        created.StatusCode.Should().Be(StatusCodes.Status201Created);
        created.Location.Should().StartWith("/api/assets/");
        all.StatusCode.Should().Be(StatusCodes.Status200OK);
        all.Value.Should().BeOfType<List<AssetDto>>().Subject
            .Should().ContainSingle(asset => asset.Name == "SRV-01");
        all.Pagination.Should().NotBeNull();
        all.Pagination!.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task Create_WithoutMembership_ReturnsForbidden()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var outsider = new User
        {
            Email = "outsider@test.local",
            DisplayName = "Outsider",
            PasswordHash = [1],
            PasswordSalt = [1]
        };
        _fixture.Db.Users.Add(outsider);
        await _fixture.Db.SaveChangesAsync();
        _fixture.ActAs(outsider.Id);

        var result = await Service().CreateAsync(organization.Id, Asset("SRV-02", "10.0.0.2"));

        result.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task GetAll_OnlyReturnsAssetsFromCallersOrganization()
    {
        var (_, organizationA) = _fixture.SeedUserWithOrg();
        var organizationB = new Organization { Name = "Org B", Color = "#111", Initials = "OB" };
        _fixture.Db.Organizations.Add(organizationB);
        _fixture.Db.Assets.Add(new Asset
        {
            OrganizationId = organizationB.Id,
            Name = "OtherOrgAsset",
            Type = AssetType.Server,
            Status = AssetStatus.Online,
            UpdatedAt = DateTime.UtcNow
        });
        await _fixture.Db.SaveChangesAsync();
        var service = Service();
        await service.CreateAsync(organizationA.Id, Asset("MyAsset"));

        var result = await service.GetAllAsync(organizationA.Id, null);

        result.Value.Should().BeOfType<List<AssetDto>>().Subject
            .Should().ContainSingle(asset => asset.Name == "MyAsset");
    }

    [Fact]
    public async Task Update_ChangesFieldsAndTimestamp()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var created = (await service.CreateAsync(organization.Id, Asset("SRV-01")))
            .Value.Should().BeOfType<AssetDto>().Subject;

        var result = await service.UpdateAsync(created.Id,
            new UpdateAssetDto("SRV-01-renamed", AssetType.Server, AssetStatus.Maintenance,
                "", "", "", [], "", null));
        var fetched = (await service.GetByIdAsync(created.Id)).Value.Should().BeOfType<AssetDto>().Subject;

        result.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fetched.Name.Should().Be("SRV-01-renamed");
        fetched.Status.Should().Be(AssetStatus.Maintenance);
    }

    [Fact]
    public async Task Delete_RemovesAsset()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var created = (await service.CreateAsync(organization.Id, Asset("SRV-01")))
            .Value.Should().BeOfType<AssetDto>().Subject;

        var deleted = await service.DeleteAsync(created.Id);
        var fetched = await service.GetByIdAsync(created.Id);

        deleted.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fetched.StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task ToggleStar_FlipsStarredFlag()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var created = (await service.CreateAsync(organization.Id, Asset("SRV-01")))
            .Value.Should().BeOfType<AssetDto>().Subject;

        var toggled = await service.ToggleStarAsync(created.Id);
        var fetched = (await service.GetByIdAsync(created.Id)).Value.Should().BeOfType<AssetDto>().Subject;

        toggled.StatusCode.Should().Be(StatusCodes.Status200OK);
        toggled.Value.Should().BeEquivalentTo(new AssetStarredDto(true));
        fetched.Starred.Should().BeTrue();
    }

    [Fact]
    public async Task ReadOnlyMember_CanRead_ButWriteFails()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var created = (await service.CreateAsync(organization.Id, Asset("SRV-01")))
            .Value.Should().BeOfType<AssetDto>().Subject;
        var readOnlyUser = new User
        {
            Email = "ro@test.local",
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

        var get = await service.GetByIdAsync(created.Id);
        var update = await service.UpdateAsync(created.Id,
            new UpdateAssetDto("renamed", AssetType.Server, AssetStatus.Online,
                "", "", "", [], "", null));

        get.StatusCode.Should().Be(StatusCodes.Status200OK);
        update.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    public void Dispose() => _fixture.Dispose();

    private static CreateAssetDto Asset(string name, string ip = "") =>
        new(name, AssetType.Server, AssetStatus.Online, "", "", ip, [], "", null);
}
