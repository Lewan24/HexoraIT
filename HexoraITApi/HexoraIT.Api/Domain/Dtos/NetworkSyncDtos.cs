namespace HexoraITApi.Domain.Dtos;

public record NetworkSyncIssueDto(Guid? AssetId, string Name, string Ip, string Reason);
public record NetworkSyncResultDto(int Added, int Updated, int Unchanged, int Skipped, int IssueCount, List<NetworkSyncIssueDto> Issues);
