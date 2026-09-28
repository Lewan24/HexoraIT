using System.Text;
using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Application;

public sealed class EmailNotificationServiceTests : IDisposable
{
    private readonly TestFixture fixture = new();
    private readonly FakeEmailSender email = new();

    [Fact]
    public async Task GlobalSettings_DoesNotExposePasswordAndCanClearIt()
    {
        var service = new EmailSettingsService(fixture.Db, new FakeSecretProtector(), email, fixture.UserContext);
        var saved = await service.UpdateGlobalAsync(new(true, "smtp.test", 587, true, "user", "secret", "from@test.local", "HexoraIT"));
        var returned = (GlobalEmailSettingsDto)saved.Value!;

        returned.HasPassword.Should().BeTrue();
        returned.Should().NotBeEquivalentTo(new { Password = "secret" });
        fixture.Db.GlobalEmailSettings.Single().EncryptedPassword.Should().NotBeEquivalentTo(Encoding.UTF8.GetBytes("secret"));

        await service.UpdateGlobalAsync(new(false, "smtp.test", 587, true, "user", "", "from@test.local", "HexoraIT"));
        fixture.Db.GlobalEmailSettings.Single().EncryptedPassword.Should().BeNull();
    }

    [Fact]
    public async Task OrganizationSettings_RequireAdminOrOwner()
    {
        var (_, organization) = fixture.SeedUserWithOrg(OrgRole.Member);
        var service = new EmailSettingsService(fixture.Db, new FakeSecretProtector(), email, fixture.UserContext);

        var result = await service.UpdateOrganizationAsync(organization.Id, new(true, true, true, true, true, true, 30));

        result.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    [Fact]
    public async Task Notification_OnlyTargetsActiveConfirmedOrganizationMembers()
    {
        var (owner, organization) = fixture.SeedUserWithOrg();
        fixture.Db.GlobalEmailSettings.Add(new GlobalEmailSettings { Enabled = true, Host = "smtp.test", FromAddress = "from@test.local" });
        fixture.Db.OrganizationNotificationSettings.Add(new() { OrganizationId = organization.Id, IncidentCreated = true });
        var unconfirmed = new User { Email = "unconfirmed@test.local", DisplayName = "No", EmailConfirmed = false };
        var outsider = new User { Email = "outsider@test.local", DisplayName = "Out" };
        fixture.Db.Users.AddRange(unconfirmed, outsider);
        fixture.Db.UserOrganizations.Add(new() { OrganizationId = organization.Id, UserId = unconfirmed.Id });
        await fixture.Db.SaveChangesAsync();

        await new NotificationService(fixture.Db, email).NotifyAsync(organization.Id, "incident_created", "Incident", "Body");

        email.Messages.Should().ContainSingle(message => message.Recipient == owner.Email);
    }

    [Fact]
    public async Task Notification_DoesNotSendDisabledOrganizationEvent()
    {
        var (_, organization) = fixture.SeedUserWithOrg();
        fixture.Db.GlobalEmailSettings.Add(new GlobalEmailSettings { Enabled = true, Host = "smtp.test", FromAddress = "from@test.local" });
        fixture.Db.OrganizationNotificationSettings.Add(new() { OrganizationId = organization.Id, IncidentCreated = false });
        await fixture.Db.SaveChangesAsync();

        await new NotificationService(fixture.Db, email).NotifyAsync(organization.Id, "incident_created", "Incident", "Body");

        email.Messages.Should().BeEmpty();
    }

    public void Dispose() => fixture.Dispose();

    private sealed class FakeSecretProtector : IEmailSecretProtector
    {
        public byte[] Protect(string value) => Encoding.UTF8.GetBytes("protected:" + value);
        public string Unprotect(byte[] value) => Encoding.UTF8.GetString(value)[10..];
    }
}
