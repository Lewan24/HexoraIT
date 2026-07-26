using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record LicenseDto(Guid Id, string Name, string Vendor, LicenseCategory Category, LicenseType Type,
    int Seats, int SeatsUsed, DateOnly PurchaseDate, DateOnly ExpiryDate, decimal Cost, string Currency,
    string LicenseKey, string Notes, bool Starred, LicenseStatus Status);

public record CreateLicenseDto(string Name, string Vendor, LicenseCategory Category, LicenseType Type,
    int Seats, int SeatsUsed, DateOnly PurchaseDate, DateOnly ExpiryDate, decimal Cost, string Currency,
    string LicenseKey, string Notes);

public record UpdateLicenseDto(string Name, string Vendor, LicenseCategory Category, LicenseType Type,
    int Seats, int SeatsUsed, DateOnly PurchaseDate, DateOnly ExpiryDate, decimal Cost, string Currency,
    string LicenseKey, string Notes);