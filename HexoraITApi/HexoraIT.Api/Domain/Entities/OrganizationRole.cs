namespace HexoraITApi.Domain.Entities;

public class OrganizationRole
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid OrganizationId { get; set; }
    public Organization Organization { get; set; } = null!;
    public string Name { get; set; } = "";
    public List<RolePermission> Permissions { get; set; } = [];
}

public class RolePermission
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoleId { get; set; }
    public OrganizationRole Role { get; set; } = null!;
    public string Resource { get; set; } = "";
    // Guid.Empty is the module default; individual rules override it.
    public Guid ResourceId { get; set; }
    public bool CanRead { get; set; }
    public bool CanWrite { get; set; }
}

public static class OrganizationResources
{
    public static readonly string[] All =
    [
        "dashboard", "assets", "passwords", "networks", "licenses", "contacts",
        "contracts", "plans", "incidents", "knowledge", "tasks", "projects",
        "groups", "warranty", "diagram", "files", "settings"
    ];

    public static string ForEntity(Type type) => type.Name switch
    {
        nameof(Asset) => "assets",
        nameof(PasswordEntry) => "passwords",
        nameof(Subnet) => "networks",
        nameof(License) => "licenses",
        nameof(Contact) => "contacts",
        nameof(Contract) => "contracts",
        nameof(Plan) => "plans",
        nameof(Incident) => "incidents",
        nameof(KnowledgeArticle) => "knowledge",
        nameof(WorkTask) => "tasks",
        nameof(Project) => "projects",
        nameof(Group) => "groups",
        nameof(WarrantyItem) => "warranty",
        nameof(FileFolder) or nameof(StoredFile) => "files",
        _ => throw new InvalidOperationException($"No permission resource for {type.Name}.")
    };
}
