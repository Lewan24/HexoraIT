using System.Net;
using System.Net.Mail;
using System.Text.Encodings.Web;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace HexoraITApi.Application;

public interface IEmailSender
{
    Task<bool> SendAsync(string recipient, string subject, string textBody, CancellationToken token = default);
}

public interface IEmailSecretProtector
{
    byte[] Protect(string value);
    string Unprotect(byte[] value);
}

public sealed class EmailSecretProtector(IDataProtectionProvider provider) : IEmailSecretProtector
{
    private readonly IDataProtector protector = provider.CreateProtector("HexoraIT.EmailCredentials.v1");
    public byte[] Protect(string value) => protector.Protect(System.Text.Encoding.UTF8.GetBytes(value));
    public string Unprotect(byte[] value) => System.Text.Encoding.UTF8.GetString(protector.Unprotect(value));
}

public sealed class SmtpEmailSender(
    AppDbContext db,
    IEmailSecretProtector secrets,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task<bool> SendAsync(string recipient, string subject, string textBody, CancellationToken token = default)
    {
        var settings = await db.GlobalEmailSettings.AsNoTracking().SingleOrDefaultAsync(x => x.Id == 1, token);
        if (settings is null || !settings.Enabled || string.IsNullOrWhiteSpace(settings.Host) ||
            string.IsNullOrWhiteSpace(settings.FromAddress)) return false;

        try
        {
            using var message = new MailMessage
            {
                From = new MailAddress(settings.FromAddress, settings.FromName),
                Subject = subject,
                Body = textBody,
                IsBodyHtml = false
            };
            message.To.Add(new MailAddress(recipient));
            using var client = new SmtpClient(settings.Host, settings.Port)
            {
                EnableSsl = settings.UseTls,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                Timeout = 15_000,
                UseDefaultCredentials = false,
                Credentials = string.IsNullOrWhiteSpace(settings.Username)
                    ? null
                    : new NetworkCredential(settings.Username,
                        settings.EncryptedPassword is null ? "" : secrets.Unprotect(settings.EncryptedPassword))
            };
            await client.SendMailAsync(message, token);
            return true;
        }
        catch (Exception exception) when (exception is SmtpException or InvalidOperationException or FormatException or System.Security.Cryptography.CryptographicException)
        {
            logger.LogError(exception, "Email delivery to {RecipientDomain} failed.", RecipientDomain(recipient));
            return false;
        }
    }

    private static string RecipientDomain(string recipient) => recipient.Contains('@') ? recipient[(recipient.IndexOf('@') + 1)..] : "invalid";
}

public interface INotificationService
{
    Task NotifyAsync(Guid organizationId, string eventType, string subject, string message, CancellationToken token = default);
}

public sealed class NotificationService(AppDbContext db, IEmailSender sender) : INotificationService
{
    public async Task NotifyAsync(Guid organizationId, string eventType, string subject, string message, CancellationToken token = default)
    {
        var globalEnabled = await db.GlobalEmailSettings.AsNoTracking().AnyAsync(x => x.Id == 1 && x.Enabled, token);
        if (!globalEnabled) return;
        var preferences = await db.OrganizationNotificationSettings.AsNoTracking()
            .SingleOrDefaultAsync(x => x.OrganizationId == organizationId, token) ?? new() { OrganizationId = organizationId };
        if (!IsEnabled(preferences, eventType)) return;
        var recipients = await db.UserOrganizations.AsNoTracking()
            .Where(x => x.OrganizationId == organizationId && x.User.IsActive && !x.User.IsBlocked && x.User.EmailConfirmed)
            .Select(x => x.User.Email).Distinct().ToListAsync(token);
        foreach (var recipient in recipients)
            await sender.SendAsync(recipient, subject, message, token);
    }

    public static bool IsEnabled(OrganizationNotificationSettings x, string eventType) => eventType switch
    {
        "license_expiring" => x.LicenseExpiring,
        "client_task_created" => x.ClientTaskCreated,
        "incident_created" => x.IncidentCreated,
        "contract_expiring" => x.ContractExpiring,
        "warranty_expiring" => x.WarrantyExpiring,
        "role_membership_changed" => x.RoleOrMembershipChanged,
        _ => false
    };
}

public interface IEmailSettingsService
{
    Task<ApiOperationResult> GetGlobalAsync(CancellationToken token = default);
    Task<ApiOperationResult> UpdateGlobalAsync(UpdateGlobalEmailSettingsDto dto, CancellationToken token = default);
    Task<ApiOperationResult> SendTestAsync(TestEmailDto dto, CancellationToken token = default);
    Task<ApiOperationResult> GetOrganizationAsync(Guid organizationId, CancellationToken token = default);
    Task<ApiOperationResult> UpdateOrganizationAsync(Guid organizationId, UpdateOrganizationNotificationSettingsDto dto, CancellationToken token = default);
}

public sealed class EmailSettingsService(AppDbContext db, IEmailSecretProtector secrets, IEmailSender sender,
    ICurrentUserContext currentUser) : IEmailSettingsService
{
    public async Task<ApiOperationResult> GetGlobalAsync(CancellationToken token = default)
    {
        var x = await db.GlobalEmailSettings.AsNoTracking().SingleOrDefaultAsync(s => s.Id == 1, token) ?? new();
        return new(StatusCodes.Status200OK, ToDto(x));
    }

    public async Task<ApiOperationResult> UpdateGlobalAsync(UpdateGlobalEmailSettingsDto dto, CancellationToken token = default)
    {
        if (dto.Enabled && (string.IsNullOrWhiteSpace(dto.Host) || string.IsNullOrWhiteSpace(dto.FromAddress)))
            return new(StatusCodes.Status400BadRequest, "Host and from address are required when email is enabled.");
        var x = await db.GlobalEmailSettings.SingleOrDefaultAsync(s => s.Id == 1, token) ?? new();
        x.Enabled = dto.Enabled; x.Host = dto.Host.Trim(); x.Port = dto.Port; x.UseTls = dto.UseTls;
        x.Username = dto.Username.Trim(); x.FromAddress = dto.FromAddress.Trim(); x.FromName = dto.FromName.Trim(); x.UpdatedAt = DateTime.UtcNow;
        if (dto.Password is not null) x.EncryptedPassword = dto.Password.Length == 0 ? null : secrets.Protect(dto.Password);
        if (db.Entry(x).State == EntityState.Detached) db.GlobalEmailSettings.Add(x);
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status200OK, ToDto(x));
    }

    public async Task<ApiOperationResult> SendTestAsync(TestEmailDto dto, CancellationToken token = default) =>
        await sender.SendAsync(dto.Recipient.Trim(), "HexoraIT email test", "Your HexoraIT email configuration is working.", token)
            ? new(StatusCodes.Status204NoContent)
            : new(StatusCodes.Status503ServiceUnavailable, "Email is disabled, incomplete, or delivery failed.");

    public async Task<ApiOperationResult> GetOrganizationAsync(Guid organizationId, CancellationToken token = default)
    {
        if (await currentUser.GetRoleAsync(organizationId) is not (OrgRole.Admin or OrgRole.Owner)) return new(StatusCodes.Status403Forbidden);
        var x = await db.OrganizationNotificationSettings.AsNoTracking().SingleOrDefaultAsync(s => s.OrganizationId == organizationId, token) ?? new() { OrganizationId = organizationId };
        var available = await db.GlobalEmailSettings.AsNoTracking().AnyAsync(s => s.Id == 1 && s.Enabled, token);
        return new(StatusCodes.Status200OK, ToDto(x, available));
    }

    public async Task<ApiOperationResult> UpdateOrganizationAsync(Guid organizationId, UpdateOrganizationNotificationSettingsDto dto, CancellationToken token = default)
    {
        if (await currentUser.GetRoleAsync(organizationId) is not (OrgRole.Admin or OrgRole.Owner)) return new(StatusCodes.Status403Forbidden);
        var x = await db.OrganizationNotificationSettings.SingleOrDefaultAsync(s => s.OrganizationId == organizationId, token) ?? new() { OrganizationId = organizationId };
        x.LicenseExpiring = dto.LicenseExpiring; x.ClientTaskCreated = dto.ClientTaskCreated; x.IncidentCreated = dto.IncidentCreated;
        x.ContractExpiring = dto.ContractExpiring; x.WarrantyExpiring = dto.WarrantyExpiring;
        x.RoleOrMembershipChanged = dto.RoleOrMembershipChanged; x.ExpiryWarningDays = dto.ExpiryWarningDays; x.UpdatedAt = DateTime.UtcNow;
        if (db.Entry(x).State == EntityState.Detached) db.OrganizationNotificationSettings.Add(x);
        await db.SaveChangesAsync(token);
        return new(StatusCodes.Status204NoContent);
    }

    private static GlobalEmailSettingsDto ToDto(GlobalEmailSettings x) => new(x.Enabled, x.Host, x.Port, x.UseTls, x.Username,
        x.EncryptedPassword is { Length: > 0 }, x.FromAddress, x.FromName);
    private static OrganizationNotificationSettingsDto ToDto(OrganizationNotificationSettings x, bool available) => new(available,
        x.LicenseExpiring, x.ClientTaskCreated, x.IncidentCreated, x.ContractExpiring, x.WarrantyExpiring, x.RoleOrMembershipChanged, x.ExpiryWarningDays);
}
