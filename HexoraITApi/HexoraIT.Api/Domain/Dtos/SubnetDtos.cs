using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record IPEntryDto(Guid Id, string Ip, string Label, IPEntryStatus Status, Guid? AssetId, string? PlainText, string Notes);
public record CreateIPEntryDto(string Ip, string Label, IPEntryStatus Status, Guid? AssetId, string? PlainText, string Notes);
public record UpdateIPEntryDto(string Ip, string Label, IPEntryStatus Status, Guid? AssetId, string? PlainText, string Notes);

public record SubnetDto(Guid Id, string Name, string Cidr, int? Vlan, SubnetType Type,
    string Gateway, string Dns, string Description, List<IPEntryDto> Ips);

public record CreateSubnetDto(string Name, string Cidr, int? Vlan, SubnetType Type, string Gateway, string Dns, string Description);
public record UpdateSubnetDto(string Name, string Cidr, int? Vlan, SubnetType Type, string Gateway, string Dns, string Description);