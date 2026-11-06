using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Dtos;

public record RecordIndexChangeDto(Guid Id, [Range(1, 1_000_000)] int? SortIndex);
public record SaveRecordOrderDto([Required, MinLength(1), MaxLength(500)] List<RecordIndexChangeDto> Changes);
public sealed class RecordOrderItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public int? SortIndex { get; set; }
    public bool CanWrite { get; set; }
}
