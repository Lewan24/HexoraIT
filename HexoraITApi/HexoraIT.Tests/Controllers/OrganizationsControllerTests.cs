using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class OrganizationsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private OrganizationsController Controller()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);


    [Fact]
    public async Task GetAll_ReturnsUsersOrganizations()
    {
        _fx.SeedUserWithOrg();

        var sut = Controller();

        var result = await sut.GetAll();

        var ok = result.Result as OkObjectResult;

        ok.Should().NotBeNull();

        ok.Value.As<List<OrganizationSummaryDto>>()
            .Should()
            .ContainSingle();
    }


    [Fact]
    public async Task Create_CreatesOrganizationAndOwnerMembership()
    {
        var (user, _) = _fx.SeedUserWithOrg();

        var sut = Controller();

        var result = await sut.Create(
            new CreateOrganizationDto(
                "New Org",
                "#fff",
                "NO",
                "Description"));

        result.Result.Should()
            .BeOfType<CreatedAtActionResult>();

        var organizations = await sut.GetAll();

        var ok = organizations.Result as OkObjectResult;

        ok.Value.As<List<OrganizationSummaryDto>>()
            .Should()
            .ContainSingle(o => o.Name == "New Org");
    }


    [Fact]
    public async Task Update_AsOwner_ChangesOrganization()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Controller();

        var result = await sut.Update(
            org.Id,
            new UpdateOrganizationDto(
                "Updated",
                "#111",
                "UP",
                "Changed"));

        result.Should()
            .BeOfType<NoContentResult>();

        var fetched = await sut.GetById(org.Id);

        fetched.Result.As<OkObjectResult>().Value!.As<OrganizationDto>().Name.Should()
            .Be("Updated");
    }


    [Fact]
    public async Task Delete_AsOwner_SoftDeletesOrganization()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Controller();

        var result = await sut.Delete(org.Id);

        result.Should()
            .BeOfType<NoContentResult>();

        var deleted = await sut.GetDeleted();

        var ok = deleted.Result as OkObjectResult;

        ok.Value.As<List<OrganizationSummaryDto>>()
            .Should()
            .ContainSingle(o => o.Id == org.Id);
    }


    [Fact]
    public async Task InviteMember_AddsExistingUser()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var invited = new User
        {
            Email = "invite@test.local",
            DisplayName = "Invited",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(invited);
        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        var result = await sut.InviteMember(
            org.Id,
            new InviteMemberDto(
                invited.Email,
                OrgRole.Admin));

        result.Result.Should()
            .BeOfType<OkObjectResult>();

        var membership = _fx.Db.UserOrganizations
            .FirstOrDefault(x =>
                x.OrganizationId == org.Id &&
                x.UserId == invited.Id);

        membership.Should()
            .NotBeNull();

        membership!.Role.Should()
            .Be(OrgRole.Admin);
    }


    [Fact]
    public async Task InviteMember_OwnerRole_ReturnsBadRequest()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Controller();

        var result = await sut.InviteMember(
            org.Id,
            new InviteMemberDto(
                "someone@test.local",
                OrgRole.Owner));

        result.Result.Should()
            .BeOfType<BadRequestObjectResult>();
    }


    [Fact]
    public async Task RemoveMember_RemovesNonOwnerMember()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var member = new User
        {
            Email = "member@test.local",
            DisplayName = "Member",
            PasswordHash = [1],
            PasswordSalt = [1]
        };

        _fx.Db.Users.Add(member);

        _fx.Db.UserOrganizations.Add(
            new UserOrganization
            {
                UserId = member.Id,
                OrganizationId = org.Id,
                Role = OrgRole.Member
            });

        await _fx.Db.SaveChangesAsync();

        var sut = Controller();

        var result = await sut.RemoveMember(
            org.Id,
            member.Id);

        result.Should()
            .BeOfType<NoContentResult>();

        _fx.Db.UserOrganizations
            .Any(x =>
                x.UserId == member.Id &&
                x.OrganizationId == org.Id)
            .Should()
            .BeFalse();
    }


    [Fact]
    public async Task Restore_DeletedOrganization_RestoresIt()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Controller();

        await sut.Delete(org.Id);

        var result = await sut.Restore(org.Id);

        result.Should()
            .BeOfType<NoContentResult>();

        var fetched = await sut.GetById(org.Id);

        fetched.Result.As<OkObjectResult>().Value.Should()
            .NotBeNull();
    }


    public void Dispose()
        => _fx.Dispose();
}