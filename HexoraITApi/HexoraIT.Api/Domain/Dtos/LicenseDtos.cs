using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record LicenseDto(Guid Id, string Name, string Vendor, LicenseCategory Category, LicenseType Type,
    int Seats, int SeatsUsed, DateOnly PurchaseDate, DateOnly ExpiryDate, decimal Cost, string Currency,
    string LicenseKey, string Notes, bool Starred, LicenseStatus Status);

public record CreateLicenseDto(
    [Required, StringLength(200)] string Name,
    [StringLength(200)] string Vendor,
    LicenseCategory Category,
    LicenseType Type,
    [Range(0, int.MaxValue)] int Seats,
    [Range(0, int.MaxValue)] int SeatsUsed,
    DateOnly PurchaseDate,
    DateOnly ExpiryDate,
    [Range(typeof(decimal), "-9999999999999999.99", "9999999999999999.99")] decimal Cost,
    [Required, StringLength(10)] string Currency,
    [StringLength(10000)] string LicenseKey,
    [StringLength(100000)] string Notes);

public record UpdateLicenseDto(
    [Required, StringLength(200)] string Name,
    [StringLength(200)] string Vendor,
    LicenseCategory Category,
    LicenseType Type,
    [Range(0, int.MaxValue)] int Seats,
    [Range(0, int.MaxValue)] int SeatsUsed,
    DateOnly PurchaseDate,
    DateOnly ExpiryDate,
    [Range(typeof(decimal), "-9999999999999999.99", "9999999999999999.99")] decimal Cost,
    [Required, StringLength(10)] string Currency,
    [StringLength(10000)] string LicenseKey,
    [StringLength(100000)] string Notes);
