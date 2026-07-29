using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record WarrantyDocumentDto(
    string Name,
    string MimeType,
    long Size
);

public record WarrantyItemDto(
    Guid Id,
    string Name,
    string Vendor,
    string SerialNumber,
    DateOnly PurchaseDate,
    DateOnly WarrantyEndDate,
    WarrantyType WarrantyType,
    string ContactName,
    string ContactPhone,
    string ContactEmail,
    string Notes,
    Guid? AssetId,
    bool Starred,
    WarrantyStatus Status,
    WarrantyDocumentDto? Document
);

public record CreateWarrantyItemDto(string Id, string Name, string Vendor, string SerialNumber, DateOnly PurchaseDate,
    DateOnly WarrantyEndDate, WarrantyType WarrantyType, string ContactName, string ContactPhone, string ContactEmail,
    string Notes, Guid? AssetId, bool Starred);

public record UpdateWarrantyItemDto(string Id, string Name, string Vendor, string SerialNumber, DateOnly PurchaseDate,
    DateOnly WarrantyEndDate, WarrantyType WarrantyType, string ContactName, string ContactPhone, string ContactEmail,
    string Notes, Guid? AssetId, bool Starred);