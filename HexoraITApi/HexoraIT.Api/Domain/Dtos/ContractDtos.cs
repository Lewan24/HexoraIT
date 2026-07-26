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

public record CreateContractDto(string Name, string Vendor, ContractCategory Category, DateOnly StartDate,
    DateOnly EndDate, decimal Value, string Currency, bool AutoRenew, string Notes);

public record UpdateContractDto(string Name, string Vendor, ContractCategory Category, DateOnly StartDate,
    DateOnly EndDate, decimal Value, string Currency, bool AutoRenew, string Notes);