using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class SubnetsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private SubnetsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsSubnet()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var created = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "Production",
                "10.0.0.0/24",
                10,
                SubnetType.LAN,
                "10.0.0.1",
                "8.8.8.8",
                "Main subnet"));

        created.Result.Should().BeOfType<CreatedAtActionResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;

        result.Should().NotBeNull();

        result!.Value.Should().BeOfType<List<SubnetDto>>();

        result.Value.As<List<SubnetDto>>()
            .Should()
            .ContainSingle(x => x.Name == "Production");
    }

    [Fact]
    public async Task Create_WithoutMembership_ReturnsForbid()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var user = new User
        {
            Email = "outsider@test.local",
            DisplayName = "Outsider",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(user);
        await _fx.Db.SaveChangesAsync();

        _fx.ActAs(user.Id);

        var sut = Controller();

        var result = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "Denied",
                "192.168.0.0/24",
                null,
                SubnetType.LAN,
                "",
                "",
                ""));

        result.Result.Should().BeOfType<ForbidResult>();
    }

    [Fact]
    public async Task AddIp_AddsEntryToSubnet()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "Office",
                "192.168.1.0/24",
                20,
                SubnetType.LAN,
                "",
                "",
                ""));

        var subnet = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<SubnetDto>();

        var result = await sut.AddIp(
            subnet.Id,
            new CreateIPEntryDto(
                "192.168.1.10",
                "Printer",
                IPEntryStatus.Free,
                null,
                null,
                "Office printer"));

        result.Result.Should().BeOfType<OkObjectResult>();

        var ip = result.Result
            .As<OkObjectResult>()
            .Value
            .As<IPEntryDto>();

        ip.Ip.Should().Be("192.168.1.10");
    }

    [Fact]
    public async Task GetById_ReturnsSubnetWithIps()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "DMZ",
                "172.16.0.0/24",
                30,
                SubnetType.LAN,
                "",
                "",
                ""));

        var subnet = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<SubnetDto>();

        await sut.AddIp(
            subnet.Id,
            new CreateIPEntryDto(
                "172.16.0.5",
                "Firewall",
                IPEntryStatus.Used,
                null,
                null,
                ""));

        var result = await sut.GetById(subnet.Id);

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();

        var dto = ok!.Value.As<SubnetDto>();

        dto.Name.Should().Be("DMZ");
        dto.Ips.Should().ContainSingle(x => x.Ip == "172.16.0.5");
    }

    [Fact]
    public async Task Update_ChangesSubnetFields()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "Old",
                "10.0.0.0/24",
                1,
                SubnetType.LAN,
                "",
                "",
                ""));

        var subnet = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<SubnetDto>();

        var update = await sut.Update(
            subnet.Id,
            new UpdateSubnetDto(
                "Updated",
                "10.1.0.0/24",
                2,
                SubnetType.LAN,
                "",
                "",
                "changed"));

        update.Should().BeOfType<NoContentResult>();

        var get = await sut.GetById(subnet.Id);

        var dto = get.Result
            .As<OkObjectResult>()
            .Value
            .As<SubnetDto>();

        dto.Name.Should().Be("Updated");
        dto.Cidr.Should().Be("10.1.0.0/24");
    }

    [Fact]
    public async Task UpdateIp_ChangesIpEntry()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var subnetResult = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "Subnet",
                "10.0.0.0/24",
                null,
                SubnetType.LAN,
                "",
                "",
                ""));

        var subnet = subnetResult.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<SubnetDto>();

        var ipResult = await sut.AddIp(
            subnet.Id,
            new CreateIPEntryDto(
                "10.0.0.5",
                "Old",
                IPEntryStatus.Free,
                null,
                null,
                ""));

        var ip = ipResult.Result
            .As<OkObjectResult>()
            .Value
            .As<IPEntryDto>();

        var update = await sut.UpdateIp(
            subnet.Id,
            ip.Id,
            new UpdateIPEntryDto(
                "10.0.0.10",
                "Updated",
                IPEntryStatus.Used,
                null,
                null,
                ""));

        update.Should().BeOfType<NoContentResult>();

        var subnetAfter = await sut.GetById(subnet.Id);

        var dto = subnetAfter.Result
            .As<OkObjectResult>()
            .Value
            .As<SubnetDto>();

        dto.Ips.Single().Ip.Should().Be("10.0.0.10");
    }

    [Fact]
    public async Task DeleteIp_RemovesEntry()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var subnetResult = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "Subnet",
                "10.0.0.0/24",
                null,
                SubnetType.LAN,
                "",
                "",
                ""));

        var subnet = subnetResult.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<SubnetDto>();

        var ipResult = await sut.AddIp(
            subnet.Id,
            new CreateIPEntryDto(
                "10.0.0.20",
                "Delete",
                IPEntryStatus.Free,
                null,
                null,
                ""));

        var ip = ipResult.Result
            .As<OkObjectResult>()
            .Value
            .As<IPEntryDto>();

        var delete = await sut.DeleteIp(subnet.Id, ip.Id);

        delete.Should().BeOfType<NoContentResult>();

        var subnetAfter = await sut.GetById(subnet.Id);

        subnetAfter.Result
            .As<OkObjectResult>()
            .Value
            .As<SubnetDto>()
            .Ips.Should()
            .BeEmpty();
    }

    [Fact]
    public async Task Delete_RemovesSubnet()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(
            org.Id,
            new CreateSubnetDto(
                "Delete",
                "10.0.0.0/24",
                null,
                SubnetType.LAN,
                "",
                "",
                ""));

        var subnet = create.Result
            .As<CreatedAtActionResult>()
            .Value
            .As<SubnetDto>();

        var result = await sut.Delete(subnet.Id);

        result.Should().BeOfType<NoContentResult>();

        (await sut.GetById(subnet.Id))
            .Result.Should()
            .BeOfType<NotFoundResult>();
    }

    public void Dispose()
        => _fx.Dispose();
}