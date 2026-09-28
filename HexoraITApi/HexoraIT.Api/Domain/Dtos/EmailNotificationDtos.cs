using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record GlobalEmailSettingsDto(bool Enabled, string Host, int Port, bool UseTls,
    string Username, bool HasPassword, string FromAddress, string FromName);

public record UpdateGlobalEmailSettingsDto(bool Enabled,
    [StringLength(255)] string Host,
    [Range(1, 65535)] int Port,
    bool UseTls,
    [StringLength(255)] string Username,
    [StringLength(512)] string? Password,
    [EmailAddress, StringLength(256)] string FromAddress,
    [StringLength(200)] string FromName);

public record TestEmailDto([Required, EmailAddress, StringLength(256)] string Recipient);

public record OrganizationNotificationSettingsDto(bool EmailServiceAvailable, bool LicenseExpiring,
    bool ClientTaskCreated, bool IncidentCreated, bool ContractExpiring, bool WarrantyExpiring,
    bool RoleOrMembershipChanged, int ExpiryWarningDays);

public record UpdateOrganizationNotificationSettingsDto(bool LicenseExpiring, bool ClientTaskCreated,
    bool IncidentCreated, bool ContractExpiring, bool WarrantyExpiring, bool RoleOrMembershipChanged,
    [Range(1, 365)] int ExpiryWarningDays);
