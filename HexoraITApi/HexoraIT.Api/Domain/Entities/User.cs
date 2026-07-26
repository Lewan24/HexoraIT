namespace HexoraITApi.Domain.Entities;

public enum SystemRole { User, Admin }

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Email { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public byte[] PasswordHash { get; set; } = [];
    public byte[] PasswordSalt { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public bool IsBlocked { get; set; }
    public SystemRole SystemRole { get; set; } = SystemRole.User;

    public List<UserOrganization> Memberships { get; set; } = [];
}

public enum OrgRole { ReadOnly = 0, Member = 1, Admin = 2, Owner = 3 }

public class UserOrganization
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;

    public OrgRole Role { get; set; } = OrgRole.Member;
}