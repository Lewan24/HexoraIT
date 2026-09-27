using FluentAssertions;
using HexoraITApi.Api.App;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Mvc;

namespace HexoraIT.Tests.Controllers;

public class PasswordsControllerTests : IDisposable
{
    private readonly TestFixture _fx = new();

    private PasswordsController Controller(ISecurityAuditLogger? securityAudit = null)
        => new(_fx.Db, _fx.Mapper, _fx.UserContext, _fx.Cipher, securityAudit);

    [Fact]
    public async Task GetAll_NeverExposesTheSecret()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        await sut.Create(org.Id, new CreatePasswordDto(
            "AWS Root",
            "admin",
            "SuperSecret123!",
            "Cloud",
            [],
            ""));

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();
        result!.Value.Should().BeOfType<List<PasswordListDto>>();

        result.Value.As<List<PasswordListDto>>()
            .Should()
            .ContainSingle(p => p.Name == "AWS Root" && p.Username == "admin");
    }

    [Fact]
    public async Task Reveal_ReturnsTheOriginalPlaintext()
    {
        var (user, org) = _fx.SeedUserWithOrg();
        var audit = new RecordingSecurityAuditLogger();
        var sut = Controller(audit);

        var create = await sut.Create(org.Id, new CreatePasswordDto(
            "Entry",
            "user",
            "correct-horse-battery",
            "Other",
            [],
            ""));

        var createdResult = create.Result as OkObjectResult;
        createdResult.Should().NotBeNull();
        createdResult!.Value.Should().BeOfType<PasswordListDto>();

        var created = createdResult.Value.As<PasswordListDto>();

        var reveal = await sut.Reveal(created.Id);

        var revealResult = reveal.Result as OkObjectResult;
        revealResult.Should().NotBeNull();
        revealResult!.Value.Should().BeOfType<string>();

        revealResult.Value.As<string>()
            .Should()
            .Be("correct-horse-battery");
        audit.SensitiveAccess.Should().Be(("password_revealed", user.Id, created.Id, org.Id));
    }

    [Fact]
    public async Task Update_WithoutNewPassword_KeepsOldSecret()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, new CreatePasswordDto(
            "Entry",
            "user",
            "original-secret",
            "Other",
            [],
            ""));

        var createdResult = create.Result as OkObjectResult;
        createdResult.Should().NotBeNull();
        createdResult!.Value.Should().BeOfType<PasswordListDto>();

        var created = createdResult.Value.As<PasswordListDto>();

        var update = await sut.Update(created.Id, new UpdatePasswordDto(
            "Entry Renamed",
            "user",
            null,
            "Other",
            [],
            ""));

        update.Should().BeOfType<NoContentResult>();

        var reveal = await sut.Reveal(created.Id);

        var revealResult = reveal.Result as OkObjectResult;
        revealResult.Should().NotBeNull();
        revealResult!.Value.Should().BeOfType<string>();

        revealResult.Value.As<string>()
            .Should()
            .Be("original-secret");
    }

    [Fact]
    public async Task Update_WithNewPassword_RecalculatesStrength()
    {
        var (_, org) = _fx.SeedUserWithOrg();
        var sut = Controller();

        var create = await sut.Create(org.Id, new CreatePasswordDto(
            "Entry",
            "user",
            "weak",
            "Other",
            [],
            ""));

        var createdResult = create.Result as OkObjectResult;
        createdResult.Should().NotBeNull();
        createdResult!.Value.Should().BeOfType<PasswordListDto>();

        var created = createdResult.Value.As<PasswordListDto>();

        created.Strength.Should().Be(PasswordStrength.Weak);

        var update = await sut.Update(created.Id, new UpdatePasswordDto(
            "Entry",
            "user",
            "Str0ng3r-P@ssw0rd!!",
            "Other",
            [],
            ""));

        update.Should().BeOfType<NoContentResult>();

        var all = await sut.GetAll(org.Id);

        var result = all.Result as OkObjectResult;
        result.Should().NotBeNull();
        result!.Value.Should().BeOfType<List<PasswordListDto>>();

        result.Value.As<List<PasswordListDto>>()
            .Should()
            .ContainSingle()
            .Which.Strength.Should().Be(PasswordStrength.Strong);
    }

    public void Dispose()
        => _fx.Dispose();

    private sealed class RecordingSecurityAuditLogger : ISecurityAuditLogger
    {
        public (string Action, Guid UserId, Guid ResourceId, Guid OrganizationId)? SensitiveAccess { get; private set; }

        public void AuthenticationSucceeded(Guid userId) { }
        public void AccountChanged(string action, Guid actorUserId, Guid targetUserId) { }
        public void RequestRejected(int statusCode, string method, string path, Guid? userId, string traceId, string? remoteAddress) { }

        public void SensitiveResourceAccessed(string action, Guid userId, Guid resourceId, Guid organizationId) =>
            SensitiveAccess = (action, userId, resourceId, organizationId);
    }
}
