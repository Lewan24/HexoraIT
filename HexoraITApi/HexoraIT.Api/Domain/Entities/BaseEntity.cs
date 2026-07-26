using System.ComponentModel.DataAnnotations;

namespace HexoraITApi.Domain.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
}