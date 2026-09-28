using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record ContractDocumentDto(
    string Name,
    string MimeType,
    long Size
);

public record ContractDto(Guid Id, string Name, string Vendor, ContractCategory Category, DateOnly StartDate,
    DateOnly EndDate, decimal Value, string Currency, bool AutoRenew, string Notes, bool Starred, ContractStatus Status,
    ContractDocumentDto? Document);

public record CreateContractDto([Required, StringLength(200)] string Name, [StringLength(200)] string Vendor,
    ContractCategory Category, DateOnly StartDate, DateOnly EndDate,
    [Range(typeof(decimal), "-9999999999999999.99", "9999999999999999.99")] decimal Value,
    [Required, StringLength(10)] string Currency, bool AutoRenew, [StringLength(100000)] string Notes);

public record UpdateContractDto([Required, StringLength(200)] string Name, [StringLength(200)] string Vendor,
    ContractCategory Category, DateOnly StartDate, DateOnly EndDate,
    [Range(typeof(decimal), "-9999999999999999.99", "9999999999999999.99")] decimal Value,
    [Required, StringLength(10)] string Currency, bool AutoRenew, [StringLength(100000)] string Notes);
