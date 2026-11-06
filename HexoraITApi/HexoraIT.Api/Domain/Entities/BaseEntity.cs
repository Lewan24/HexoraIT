using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Entities;

public interface IOrderedRecord
{
    int? SortIndex { get; set; }
}

public abstract class BaseEntity : IOrderedRecord
{
    public int? SortIndex { get; set; }
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
}