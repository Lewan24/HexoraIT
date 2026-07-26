using HexoraITApi.Domain.Entities;

namespace HexoraITApi.Domain.Dtos;

public record GroupDto(Guid Id, string Name, GroupType Type, string Description, string Purpose,
    List<string> Members, List<Guid> LinkedAssets, List<string> Tags, DateTime CreatedAt);

public record CreateGroupDto(string Name, GroupType Type, string Description, string Purpose,
    List<string> Members, List<Guid> LinkedAssets, List<string> Tags);

public record UpdateGroupDto(string Name, GroupType Type, string Description, string Purpose,
    List<string> Members, List<Guid> LinkedAssets, List<string> Tags);