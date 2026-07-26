using System.Linq.Expressions;
using System.Reflection;
using System.Text.Json;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace HexoraITApi.Infrastructure;

public static class JsonValueConverters
{
    public static ValueConverter<List<string>, string> StringList { get; } = new(
        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
        v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>());

    public static ValueComparer<List<string>> StringListComparer { get; } = new(
        (a, b) => (a ?? new()).SequenceEqual(b ?? new()),
        v => v.Aggregate(0, (h, s) => HashCode.Combine(h, s.GetHashCode())),
        v => v.ToList());

    public static ValueConverter<List<Guid>, string> GuidList { get; } = new(
        v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
        v => JsonSerializer.Deserialize<List<Guid>>(v, (JsonSerializerOptions?)null) ?? new List<Guid>());

    public static ValueComparer<List<Guid>> GuidListComparer { get; } = new(
        (a, b) => (a ?? new()).SequenceEqual(b ?? new()),
        v => v.Aggregate(0, (h, g) => HashCode.Combine(h, g.GetHashCode())),
        v => v.ToList());
}

public static class PropertyBuilderExtensions
{
    public static void HasJsonStringList(this Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<List<string>> builder)
    {
        builder.HasConversion(JsonValueConverters.StringList, JsonValueConverters.StringListComparer)
               .HasColumnType("jsonb");
    }

    public static void HasJsonGuidList(this Microsoft.EntityFrameworkCore.Metadata.Builders.PropertyBuilder<List<Guid>> builder)
    {
        builder.HasConversion(JsonValueConverters.GuidList, JsonValueConverters.GuidListComparer)
               .HasColumnType("jsonb");
    }
}

public interface ICurrentOrgAccessor
{
    Guid? OrganizationId { get; }
}

public class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserIdProvider currentUser) : DbContext(options)
{
    public DbSet<DashboardLayout> DashboardLayouts => Set<DashboardLayout>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserOrganization> UserOrganizations => Set<UserOrganization>();
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<PasswordEntry> Passwords => Set<PasswordEntry>();
    public DbSet<Subnet> Subnets => Set<Subnet>();
    public DbSet<IPEntry> IPEntries => Set<IPEntry>();
    public DbSet<License> Licenses => Set<License>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<Contract> Contracts => Set<Contract>();
    public DbSet<Plan> Plans => Set<Plan>();
    public DbSet<Incident> Incidents => Set<Incident>();
    public DbSet<KnowledgeArticle> KnowledgeArticles => Set<KnowledgeArticle>();
    public DbSet<Project> Projects => Set<Project>();
    public DbSet<WorkTask> Tasks => Set<WorkTask>();
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<WarrantyItem> WarrantyItems => Set<WarrantyItem>();
    public DbSet<DiagramNode> DiagramNodes => Set<DiagramNode>();
    public DbSet<DiagramEdge> DiagramEdges => Set<DiagramEdge>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        b.Entity<DashboardLayout>(e =>
        {
            e.HasIndex(d => new { d.UserId, d.OrganizationId }).IsUnique();
            e.Property(d => d.SectionOrder).HasJsonStringList();
            e.Property(d => d.HiddenSections).HasJsonStringList();
        });
        
        b.Entity<Organization>(e =>
        {
            e.Property(o => o.Name).HasMaxLength(200).IsRequired();
            e.Property(o => o.Color).HasMaxLength(20);
            e.Property(o => o.Initials).HasMaxLength(8);
        });

        b.Entity<Asset>(e =>
        {
            e.Property(a => a.Name).HasMaxLength(200).IsRequired();
            e.Property(a => a.Tags).HasJsonStringList();
            e.HasIndex(a => new { a.OrganizationId, a.Name });
        });

        b.Entity<PasswordEntry>(e =>
        {
            e.Property(p => p.Name).HasMaxLength(200).IsRequired();
            e.Property(p => p.Tags).HasJsonStringList();
        });

        b.Entity<Subnet>(e =>
        {
            e.Property(s => s.Name).HasMaxLength(200).IsRequired();
            e.HasMany(s => s.Ips)
             .WithOne(ip => ip.Subnet)
             .HasForeignKey(ip => ip.SubnetId)
             .OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<IPEntry>(e =>
        {
            e.Property(ip => ip.Ip).HasMaxLength(45).IsRequired();
        });

        b.Entity<License>(e =>
        {
            e.Property(l => l.Name).HasMaxLength(200).IsRequired();
            e.Property(l => l.Cost).HasColumnType("decimal(18,2)");
        });

        b.Entity<Contact>(e =>
        {
            e.Property(c => c.Tags).HasJsonStringList();
        });

        b.Entity<Contract>(e =>
        {
            e.Property(c => c.Value).HasColumnType("decimal(18,2)");
        });

        b.Entity<Plan>(e =>
        {
            e.Property(p => p.Tags).HasJsonStringList();
        });

        b.Entity<Incident>(e =>
        {
            e.Property(i => i.Tags).HasJsonStringList();
            e.Property(i => i.AffectedSystems).HasJsonStringList();
        });

        b.Entity<KnowledgeArticle>(e =>
        {
            e.Property(a => a.Tags).HasJsonStringList();
        });

        b.Entity<Project>(e =>
        {
            e.Property(p => p.Name).HasMaxLength(200).IsRequired();
        });
        
        b.Entity<WorkTask>(e =>
        {
            e.Property(t => t.Tags).HasJsonStringList();
            e.HasOne(t => t.Project)
                .WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        b.Entity<Group>(e =>
        {
            e.Property(g => g.Tags).HasJsonStringList();
            e.Property(g => g.Members).HasJsonStringList();
            e.Property(g => g.LinkedAssets).HasJsonGuidList();
        });

        b.Entity<WarrantyItem>(e =>
        {
            e.Property(w => w.Name).HasMaxLength(200).IsRequired();
        });

        b.Entity<DiagramNode>(e =>
        {
            e.Property(n => n.Label).HasMaxLength(200);
        });
        b.Entity<DiagramEdge>(e =>
        {
            e.HasOne<DiagramNode>()
             .WithMany()
             .HasForeignKey(edge => edge.SourceNodeId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasOne<DiagramNode>()
             .WithMany()
             .HasForeignKey(edge => edge.TargetNodeId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        b.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Email).HasMaxLength(256).IsRequired();
            e.Property(u => u.DisplayName).HasMaxLength(200);
        });

        b.Entity<UserOrganization>(e =>
        {
            e.HasKey(uo => new { uo.UserId, uo.OrganizationId });
            e.HasOne(uo => uo.User).WithMany(u => u.Memberships).HasForeignKey(uo => uo.UserId);
            e.HasOne(uo => uo.Organization).WithMany(o => o.Memberships).HasForeignKey(uo => uo.OrganizationId);
        });
        
        b.Entity<Organization>().HasQueryFilter(o => !o.IsDeleted);
        
        ApplyOrganizationQueryFilters(b);
        ApplyUtcDateTimeConversion(b);
    }
    
    private void ApplyUtcDateTimeConversion(ModelBuilder b)
    {
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc ? v : DateTime.SpecifyKind(v, DateTimeKind.Utc),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        var utcNullableConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v.HasValue
                ? (v.Value.Kind == DateTimeKind.Utc ? v.Value : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc))
                : v,
            v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);

        foreach (var entityType in b.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                    property.SetValueConverter(utcConverter);
                else if (property.ClrType == typeof(DateTime?))
                    property.SetValueConverter(utcNullableConverter);
            }
        }
    }

    private void ApplyOrganizationQueryFilters(ModelBuilder b)
    {
        var buildFilter = typeof(AppDbContext)
            .GetMethod(nameof(BuildOrgFilter), BindingFlags.NonPublic | BindingFlags.Instance)!;

        foreach (var entityType in b.Model.GetEntityTypes())
        {
            if (!typeof(BaseEntity).IsAssignableFrom(entityType.ClrType)) continue;

            var filter = buildFilter.MakeGenericMethod(entityType.ClrType).Invoke(this, null);
            b.Entity(entityType.ClrType).HasQueryFilter((LambdaExpression)filter!);

            if (Database.IsNpgsql())
            {
                b.Entity(entityType.ClrType)
                    .Property<uint>("xmin")
                    .HasColumnName("xmin")
                    .HasColumnType("xid")
                    .ValueGeneratedOnAddOrUpdate()
                    .IsConcurrencyToken();
            }
        }
    }
    
    private LambdaExpression BuildOrgFilter<TEntity>() where TEntity : BaseEntity
    {
        Expression<Func<TEntity, bool>> filter = e =>
            currentUser.UserId != null &&
            Set<UserOrganization>()
                .Any(uo =>
                    uo.UserId == currentUser.UserId &&
                    uo.OrganizationId == e.OrganizationId) &&
            Set<Organization>()
                .Any(o => o.Id == e.OrganizationId);

        return filter;
    }
}