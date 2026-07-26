namespace HexoraITApi.Domain.Dtos;

public record ContactDto(Guid Id, string Name, string Company, string Role, string Phone, string Email, string Description, List<string> Tags, bool Starred);
public record CreateContactDto(string Name, string Company, string Role, string Phone, string Email, string Description, List<string> Tags);
public record UpdateContactDto(string Name, string Company, string Role, string Phone, string Email, string Description, List<string> Tags);