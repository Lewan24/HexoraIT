namespace HexoraITApi.Domain.Entities;

public class ClientPermission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid OrganizationId { get; set; }
    public string Resource { get; set; } = "";
    public Guid ResourceId { get; set; }
    public bool CanRead { get; set; }
    public bool CanWrite { get; set; }
}
