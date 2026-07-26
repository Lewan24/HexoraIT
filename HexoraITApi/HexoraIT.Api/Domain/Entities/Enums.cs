using System.Text.Json.Serialization;

namespace HexoraITApi.Domain.Entities;

public enum AssetType { Server, Workstation, Network, Storage, AP, Printer, Phone }
public enum AssetStatus
{
    [JsonStringEnumMemberName("online")] Online,
    [JsonStringEnumMemberName("offline")] Offline,
    [JsonStringEnumMemberName("maintenance")] Maintenance,
    [JsonStringEnumMemberName("unknown")] Unknown
}

public enum PasswordStrength
{
    [JsonStringEnumMemberName("strong")] Strong, 
    [JsonStringEnumMemberName("medium")] Medium,
    [JsonStringEnumMemberName("weak")] Weak
}

public enum IPEntryStatus
{
    [JsonStringEnumMemberName("used")] Used, 
    [JsonStringEnumMemberName("reserved")] Reserved, 
    [JsonStringEnumMemberName("free")] Free
}
public enum SubnetType { LAN, DMZ, WAN, WLAN, MGMT, VPN }
public enum LicenseType { Subscription, Perpetual, OEM, Volume, Trial }
public enum LicenseCategory { Software, OS, Antivirus, Domain, Cloud, Security, Office, Virtualization, Backup, Monitoring, Other }

public enum LicenseStatus
{
    [JsonStringEnumMemberName("active")] Active,
    [JsonStringEnumMemberName("expiring")] Expiring,
    [JsonStringEnumMemberName("expired")] Expired, 
    [JsonStringEnumMemberName("inactive")] Inactive
}
public enum ContractCategory { Service, Support, Maintenance, Lease, NDA, SLA, Software, Other }

public enum ContractStatus
{
    [JsonStringEnumMemberName("active")] Active,
    [JsonStringEnumMemberName("expiring")] Expiring,
    [JsonStringEnumMemberName("expired")] Expired,
    [JsonStringEnumMemberName("draft")] Draft
}

public enum Priority
{
    [JsonStringEnumMemberName("high")] High,
    [JsonStringEnumMemberName("medium")] Medium, 
    [JsonStringEnumMemberName("low")] Low
}

public enum PlanStatus
{
    [JsonStringEnumMemberName("planned")]
    Planned,
    [JsonStringEnumMemberName("in-progress")]
    InProgress,
    [JsonStringEnumMemberName("completed")]
    Completed,
    [JsonStringEnumMemberName("cancelled")]
    Cancelled
}

public enum IncidentSeverity
{
    [JsonStringEnumMemberName("critical")] Critical,
    [JsonStringEnumMemberName("high")] High,
    [JsonStringEnumMemberName("medium")] Medium,
    [JsonStringEnumMemberName("low")] Low
}

public enum IncidentStatus
{
    [JsonStringEnumMemberName("open")] Open,
    [JsonStringEnumMemberName("investigating")] Investigating,
    [JsonStringEnumMemberName("resolved")] Resolved,
    [JsonStringEnumMemberName("closed")] Closed
}

public enum WorkTaskStatus
{
    [JsonStringEnumMemberName("todo")]
    Todo,
    [JsonStringEnumMemberName("in-progress")]
    InProgress,
    [JsonStringEnumMemberName("done")]
    Done
}
public enum GroupType
{
    [JsonStringEnumMemberName("AD Security")] AdSecurity,
    [JsonStringEnumMemberName("AD Distribution")] AdDistribution,
    [JsonStringEnumMemberName("AD OU")] AdOu,
    [JsonStringEnumMemberName("Local Group")] LocalGroup,
    [JsonStringEnumMemberName("VLAN Group")] VlanGroup,
    [JsonStringEnumMemberName("Project Team")] ProjectTeam,
    [JsonStringEnumMemberName("Other")] Other
}
public enum WarrantyType { Standard, Extended, OnSiteNbd, CarryIn, MailIn, Other }

public enum WarrantyStatus
{
    [JsonStringEnumMemberName("active")] Active,
    [JsonStringEnumMemberName("expiring")] Expiring,
    [JsonStringEnumMemberName("expired")] Expired
}

public enum DiagramDeviceType
{
    [JsonStringEnumMemberName("server")] Server,
    [JsonStringEnumMemberName("firewall")] Firewall,
    [JsonStringEnumMemberName("switch")] Switch,
    [JsonStringEnumMemberName("router")] Router,
    [JsonStringEnumMemberName("workstation")] Workstation,
    [JsonStringEnumMemberName("ap")] Ap,
    [JsonStringEnumMemberName("storage")] Storage,
    [JsonStringEnumMemberName("cloud")] Cloud,
    [JsonStringEnumMemberName("internet")] Internet,
    [JsonStringEnumMemberName("printer")] Printer,
    [JsonStringEnumMemberName("custom")] Custom
}

public enum DiagramConnectionType
{
    [JsonStringEnumMemberName("ethernet")] Ethernet,
    [JsonStringEnumMemberName("fiber")] Fiber,
    [JsonStringEnumMemberName("wireless")] Wireless,
    [JsonStringEnumMemberName("vpn")] Vpn,
    [JsonStringEnumMemberName("wan")] Wan
}