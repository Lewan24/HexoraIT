using System.ComponentModel.DataAnnotations;
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

public record CreateWarrantyItemDto([Required, StringLength(36)] string Id, [Required, StringLength(200)] string Name,
    [StringLength(200)] string Vendor, [StringLength(200)] string SerialNumber, DateOnly PurchaseDate,
    DateOnly WarrantyEndDate, WarrantyType WarrantyType, [StringLength(200)] string ContactName,
    [StringLength(100)] string ContactPhone, [StringLength(320)] string ContactEmail,
    [StringLength(100000)] string Notes, Guid? AssetId, bool Starred);

public record UpdateWarrantyItemDto([Required, StringLength(36)] string Id, [Required, StringLength(200)] string Name,
    [StringLength(200)] string Vendor, [StringLength(200)] string SerialNumber, DateOnly PurchaseDate,
    DateOnly WarrantyEndDate, WarrantyType WarrantyType, [StringLength(200)] string ContactName,
    [StringLength(100)] string ContactPhone, [StringLength(320)] string ContactEmail,
    [StringLength(100000)] string Notes, Guid? AssetId, bool Starred);
