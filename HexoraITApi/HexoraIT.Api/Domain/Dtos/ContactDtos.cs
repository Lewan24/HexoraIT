using System.ComponentModel.DataAnnotations;
using HexoraITApi.Domain.Validation;

namespace HexoraITApi.Domain.Dtos;

public record ContactDto(Guid Id, string Name, string Company, string Role, string Phone, string Email, string Description, List<string> Tags, bool Starred);
public record CreateContactDto(
    [Required, StringLength(200)] string Name, [StringLength(200)] string Company,
    [StringLength(200)] string Role, [StringLength(100)] string Phone, [StringLength(256)] string Email,
    [StringLength(100000)] string Description, [Required, StringCollection(100, 100)] List<string> Tags);
public record UpdateContactDto(
    [Required, StringLength(200)] string Name, [StringLength(200)] string Company,
    [StringLength(200)] string Role, [StringLength(100)] string Phone, [StringLength(256)] string Email,
    [StringLength(100000)] string Description, [Required, StringCollection(100, 100)] List<string> Tags);
