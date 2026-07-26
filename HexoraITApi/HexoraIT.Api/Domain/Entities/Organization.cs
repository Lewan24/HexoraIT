namespace HexoraITApi.Domain.Entities;

public class Organization
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = "";
    public string Color { get; set; } = "";
    public string Initials { get; set; } = "";
    public string Description { get; set; } = "";
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }

    public List<Asset> Assets { get; set; } = [];
    public List<PasswordEntry> Passwords { get; set; } = [];
    public List<Subnet> Subnets { get; set; } = [];
    public List<License> Licenses { get; set; } = [];
    public List<Contact> Contacts { get; set; } = [];
    public List<Contract> Contracts { get; set; } = [];
    public List<Plan> Plans { get; set; } = [];
    public List<Incident> Incidents { get; set; } = [];
    public List<KnowledgeArticle> KnowledgeArticles { get; set; } = [];
    public List<WorkTask> Tasks { get; set; } = [];
    public List<Group> Groups { get; set; } = [];
    public List<WarrantyItem> WarrantyItems { get; set; } = [];
    public List<DiagramNode> DiagramNodes { get; set; } = [];
    public List<DiagramEdge> DiagramEdges { get; set; } = [];
    
    public List<UserOrganization> Memberships { get; set; } = [];
}