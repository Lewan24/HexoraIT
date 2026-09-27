using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Controllers;

public class OrganizationsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private OrganizationService Service()
        => new(_fx.Db, _fx.Mapper, _fx.UserContext);


    [Fact]
    public async Task GetAll_ReturnsUsersOrganizations()
    {
        _fx.SeedUserWithOrg();

        var sut = Service();

        var result = await sut.GetAllAsync(null);
        result.Value.As<List<OrganizationSummaryDto>>()
            .Should()
            .ContainSingle();
    }


    [Fact]
    public async Task Create_CreatesOrganizationAndOwnerMembership()
    {
        var (user, _) = _fx.SeedUserWithOrg();

        var sut = Service();

        var result = await sut.CreateAsync(
            new CreateOrganizationDto(
                "New Org",
                "#fff",
                "NO",
                "Description"));

        result.StatusCode.Should().Be(StatusCodes.Status201Created);

        var organizations = await sut.GetAllAsync(null);
        organizations.Value.As<List<OrganizationSummaryDto>>()
            .Should()
            .ContainSingle(o => o.Name == "New Org");
    }


    [Fact]
    public async Task Update_AsOwner_ChangesOrganization()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Service();

        var result = await sut.UpdateAsync(
            org.Id,
            new UpdateOrganizationDto(
                "Updated",
                "#111",
                "UP",
                "Changed"));

        result.StatusCode.Should().Be(StatusCodes.Status204NoContent);

        var fetched = await sut.GetByIdAsync(org.Id);
        fetched.Value!.As<OrganizationDto>().Name.Should()
            .Be("Updated");
    }


    [Fact]
    public async Task Delete_AsOwner_SoftDeletesOrganization()
    {
        var (_, org) = _fx.SeedUserWithOrg();

        var sut = Service();

        var result = await sut.DeleteAsync(org.Id);

        result.StatusCode.Should().Be(StatusCodes.Status204NoContent);

        var deleted = await sut.GetDeletedAsync(null);
        deleted.Value.As<List<OrganizationSummaryDto>>()
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

        var sut = Service();

        var result = await sut.InviteMemberAsync(
            org.Id,
            new InviteMemberDto(
                invited.Email,
                OrgRole.Admin));

        result.StatusCode.Should().Be(StatusCodes.Status200OK);

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

        var sut = Service();

        var result = await sut.InviteMemberAsync(
            org.Id,
            new InviteMemberDto(
                "someone@test.local",
                OrgRole.Owner));

        result.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
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

        var sut = Service();

        var result = await sut.RemoveMemberAsync(
            org.Id,
            member.Id);

        result.StatusCode.Should().Be(StatusCodes.Status204NoContent);

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

        var sut = Service();

        await sut.DeleteAsync(org.Id);

        var result = await sut.RestoreAsync(org.Id);

        result.StatusCode.Should().Be(StatusCodes.Status204NoContent);

        var fetched = await sut.GetByIdAsync(org.Id);
        fetched.Value.Should()
            .NotBeNull();
    }


    public void Dispose()
        => _fx.Dispose();
}
