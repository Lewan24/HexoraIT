using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record IPEntryDto(Guid Id, string Ip, string Label, IPEntryStatus Status, Guid? AssetId, string? PlainText, string Notes);
public record CreateIPEntryDto([Required, StringLength(45)] string Ip, [StringLength(200)] string Label, IPEntryStatus Status,
    Guid? AssetId, [StringLength(500)] string? PlainText, [StringLength(100000)] string Notes);
public record UpdateIPEntryDto([Required, StringLength(45)] string Ip, [StringLength(200)] string Label, IPEntryStatus Status,
    Guid? AssetId, [StringLength(500)] string? PlainText, [StringLength(100000)] string Notes);

public record SubnetDto(Guid Id, string Name, string Cidr, int? Vlan, SubnetType Type,
    string Gateway, string Dns, string Description, List<IPEntryDto> Ips);

public record CreateSubnetDto([Required, StringLength(200)] string Name, [Required, StringLength(50)] string Cidr,
    [Range(0, 4094)] int? Vlan, SubnetType Type, [StringLength(45)] string Gateway, [StringLength(500)] string Dns,
    [StringLength(100000)] string Description);
public record UpdateSubnetDto([Required, StringLength(200)] string Name, [Required, StringLength(50)] string Cidr,
    [Range(0, 4094)] int? Vlan, SubnetType Type, [StringLength(45)] string Gateway, [StringLength(500)] string Dns,
    [StringLength(100000)] string Description);
