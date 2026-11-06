using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Application.Documentation;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class RecordOrderTests : IDisposable
{
    private readonly TestFixture fixture = new();
    private RecordOrderService Service() => new(fixture.Db, fixture.UserContext);

    [Fact]
    public async Task IndicesPersistAndSortBeforePaginationAndNormalEditsPreserveThem()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var a = new Contact { OrganizationId = org.Id, Name = "A" };
        var b = new Contact { OrganizationId = org.Id, Name = "B" };
        var c = new Contact { OrganizationId = org.Id, Name = "C" };
        fixture.Db.AddRange(a, b, c); await fixture.Db.SaveChangesAsync();
        (await Service().SaveAsync(org.Id, "contacts", new([new(a.Id, 20), new(b.Id, 10)]))).StatusCode.Should().Be(200);
        fixture.Db.ChangeTracker.Clear();
        var service = new ContactService(fixture.Db, fixture.Mapper, fixture.UserContext);
        var first = await service.GetAllAsync(org.Id, new() { Page = 1, PageSize = 2 });
        ((List<ContactDto>)first.Value!).Select(x => x.Id).Should().Equal(b.Id, a.Id);
        await service.UpdateAsync(a.Id, new("Renamed", "", "", "", "", "", []));
        (await fixture.Db.Contacts.SingleAsync(x => x.Id == a.Id)).SortIndex.Should().Be(20);
        await Service().SaveAsync(org.Id, "contacts", new([new(a.Id, null)]));
        (await fixture.Db.Contacts.SingleAsync(x => x.Id == a.Id)).SortIndex.Should().BeNull();
    }

    [Fact]
    public async Task InvalidOrForeignBatchCannotPartiallyChangeVisibleRecords()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Foreign" };
        var mine = new Contact { OrganizationId = org.Id, Name = "Mine", SortIndex = 10 };
        var foreign = new Contact { OrganizationId = other.Id, Name = "Foreign" };
        fixture.Db.AddRange(other, mine, foreign); await fixture.Db.SaveChangesAsync();
        (await Service().SaveAsync(org.Id, "contacts", new([new(mine.Id, 5), new(foreign.Id, 1)]))).StatusCode.Should().Be(400);
        mine.SortIndex.Should().Be(10); foreign.SortIndex.Should().BeNull();
        foreach (var invalid in new[] { 0, -1, 1_000_001 })
            (await Service().SaveAsync(org.Id, "contacts", new([new(mine.Id, invalid)]))).StatusCode.Should().Be(400);
        (await Service().SaveAsync(org.Id, "contacts", new([new(mine.Id, 5), new(mine.Id, 6)]))).StatusCode.Should().Be(400);
        mine.SortIndex.Should().Be(10);
    }

    [Fact]
    public async Task ReadOnlyMemberSeesIndicesButCannotModifyThem()
    {
        var (_, org) = fixture.SeedUserWithOrg(OrgRole.ReadOnly);
        var item = new Contact { OrganizationId = org.Id, Name = "Read", SortIndex = 30 };
        fixture.Db.Add(item); await fixture.Db.SaveChangesAsync();
        var result = await Service().GetAsync(org.Id, "contacts", new());
        ((List<RecordOrderItemDto>)result.Value!).Should().ContainSingle(x => x.Id == item.Id && x.SortIndex == 30 && !x.CanWrite);
        (await Service().SaveAsync(org.Id, "contacts", new([new(item.Id, 1)]))).StatusCode.Should().Be(403);
        (await Service().GetAsync(Guid.NewGuid(), "contacts", new())).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task EverySupportedResourceMetadataQueryTranslatesAndReturnsAnEmptyList()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        foreach (var resource in RecordOrderService.Resources)
        {
            var result = await Service().GetAsync(org.Id, resource, new(), "query");
            result.StatusCode.Should().Be(200, resource);
            ((List<RecordOrderItemDto>)result.Value!).Should().BeEmpty(resource);
        }
    }

    [Fact]
    public async Task AllContentSectionsCanPersistIndicesAndExposeThemThroughTheirReadDtos()
    {
        var (user, org) = fixture.SeedUserWithOrg();
        var subnet = new Subnet { OrganizationId = org.Id, Name = "LAN", Cidr = "10.0.0.0/24" };
        var entities = new Dictionary<string, IOrderedRecord>
        {
            ["assets"] = new Asset { OrganizationId = org.Id },
            ["passwords"] = new PasswordEntry { OrganizationId = org.Id },
            ["networks"] = subnet,
            ["licenses"] = new HexoraITApi.Domain.Entities.License { OrganizationId = org.Id },
            ["contacts"] = new Contact { OrganizationId = org.Id },
            ["contracts"] = new Contract { OrganizationId = org.Id },
            ["plans"] = new Plan { OrganizationId = org.Id },
            ["incidents"] = new Incident { OrganizationId = org.Id },
            ["knowledge"] = new KnowledgeArticle { OrganizationId = org.Id },
            ["tasks"] = new WorkTask { OrganizationId = org.Id },
            ["projects"] = new Project { OrganizationId = org.Id },
            ["groups"] = new Group { OrganizationId = org.Id },
            ["warranty"] = new WarrantyItem { OrganizationId = org.Id },
            ["files"] = new StoredFile { OrganizationId = org.Id },
            ["folders"] = new FileFolder { OrganizationId = org.Id },
            ["ip-entries"] = new IPEntry { SubnetId = subnet.Id },
            ["diagram"] = new DiagramNode { OrganizationId = org.Id },
            ["private-notes"] = new PrivateNote { OrganizationId = org.Id, UserId = user.Id }
        };
        fixture.Db.AddRange(entities.Values.Cast<object>()); await fixture.Db.SaveChangesAsync();
        foreach (var resource in RecordOrderService.Resources)
        {
            var metadata = (List<RecordOrderItemDto>)(await Service().GetAsync(org.Id, resource, new())).Value!;
            metadata.Should().ContainSingle(resource);
            (await Service().SaveAsync(org.Id, resource, new([new(metadata.Single().Id, 17)]))).StatusCode.Should().Be(200, resource);
            entities[resource].SortIndex.Should().Be(17, resource);
        }
        var contracts = (List<ContractDto>)(await new ContractService(fixture.Db, fixture.Mapper, fixture.UserContext, fixture.Storage, Microsoft.Extensions.Logging.Abstractions.NullLogger<ContractService>.Instance).GetAllAsync(org.Id, null)).Value!;
        contracts.Single().SortIndex.Should().Be(17);
        var warranties = (List<WarrantyItemDto>)(await new WarrantyService(fixture.Db, fixture.Mapper, fixture.UserContext, fixture.Storage, Microsoft.Extensions.Logging.Abstractions.NullLogger<WarrantyService>.Instance).GetAllAsync(org.Id, null)).Value!;
        warranties.Single().SortIndex.Should().Be(17);
        var dtoTypes = new Dictionary<string, Type> { ["assets"] = typeof(AssetDto), ["passwords"] = typeof(PasswordListDto), ["networks"] = typeof(SubnetDto), ["licenses"] = typeof(LicenseDto), ["contacts"] = typeof(ContactDto), ["plans"] = typeof(PlanDto), ["incidents"] = typeof(IncidentDto), ["knowledge"] = typeof(KnowledgeArticleDto), ["tasks"] = typeof(WorkTaskDto), ["projects"] = typeof(ProjectDto), ["groups"] = typeof(GroupDto), ["folders"] = typeof(FileFolderDto), ["files"] = typeof(StoredFileDto), ["ip-entries"] = typeof(IPEntryDto), ["diagram"] = typeof(DiagramNodeDto) };
        foreach (var (resource, dtoType) in dtoTypes)
        {
            var dto = fixture.Mapper.Map(entities[resource], entities[resource].GetType(), dtoType);
            dtoType.GetProperty("SortIndex")!.GetValue(dto).Should().Be(17, resource);
        }
    }

    [Fact]
    public async Task IndividualWriteDenyPreventsEntireBatchWhileHiddenRecordsStayHidden()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var writable = new Contact { OrganizationId = org.Id, Name = "Writable", SortIndex = 10 };
        var readOnly = new Contact { OrganizationId = org.Id, Name = "Read only", SortIndex = 20 };
        var hidden = new Contact { OrganizationId = org.Id, Name = "Hidden" };
        var role = new OrganizationRole { OrganizationId = org.Id, Name = "Custom", Permissions = [
            new() { Resource = "contacts", CanRead = true, CanWrite = true },
            new() { Resource = "contacts", ResourceId = readOnly.Id, CanRead = true, CanWrite = false },
            new() { Resource = "contacts", ResourceId = hidden.Id, CanRead = false, CanWrite = false }] };
        fixture.Db.AddRange(writable, readOnly, hidden, role);
        (await fixture.Db.UserOrganizations.SingleAsync()).CustomRoleId = role.Id;
        await fixture.Db.SaveChangesAsync();
        var metadata = (List<RecordOrderItemDto>)(await Service().GetAsync(org.Id, "contacts", new())).Value!;
        metadata.Should().HaveCount(2); metadata.Should().NotContain(x => x.Id == hidden.Id);
        metadata.Single(x => x.Id == readOnly.Id).CanWrite.Should().BeFalse();
        (await Service().SaveAsync(org.Id, "contacts", new([new(writable.Id, 1), new(readOnly.Id, 2)]))).StatusCode.Should().Be(403);
        writable.SortIndex.Should().Be(10); readOnly.SortIndex.Should().Be(20);
        (await Service().SaveAsync(org.Id, "contacts", new([new(hidden.Id, 1)]))).StatusCode.Should().Be(400);
    }

    [Fact]
    public async Task ClientOrderingRequiresAnExplicitWriteGrantAndPrivateNotesRemainUnavailable()
    {
        var (user, org) = fixture.SeedUserWithOrg(); user.SystemRole = SystemRole.Client;
        var writable = new Contact { OrganizationId = org.Id, Name = "Writable" };
        var readOnly = new Contact { OrganizationId = org.Id, Name = "Read only" };
        fixture.Db.AddRange(writable, readOnly,
            new ClientPermission { OrganizationId = org.Id, UserId = user.Id, Resource = "contacts", ResourceId = writable.Id, CanRead = true, CanWrite = true },
            new ClientPermission { OrganizationId = org.Id, UserId = user.Id, Resource = "contacts", ResourceId = readOnly.Id, CanRead = true });
        await fixture.Db.SaveChangesAsync();
        var metadata = (List<RecordOrderItemDto>)(await Service().GetAsync(org.Id, "contacts", new())).Value!;
        metadata.Single(x => x.Id == writable.Id).CanWrite.Should().BeTrue();
        metadata.Single(x => x.Id == readOnly.Id).CanWrite.Should().BeFalse();
        (await Service().SaveAsync(org.Id, "contacts", new([new(readOnly.Id, 1)]))).StatusCode.Should().Be(403);
        (await Service().SaveAsync(org.Id, "contacts", new([new(writable.Id, 1)]))).StatusCode.Should().Be(200);
        (await Service().GetAsync(org.Id, "private-notes", new())).StatusCode.Should().Be(403);
    }

    [Fact]
    public async Task PrivateNotesAreOrderedOnlyByTheirAuthor()
    {
        var (user, org) = fixture.SeedUserWithOrg();
        var another = new User { Email = "another@test.local", PasswordHash = [1], PasswordSalt = [1] };
        var mine = new PrivateNote { OrganizationId = org.Id, UserId = user.Id, Title = "Mine" };
        var theirs = new PrivateNote { OrganizationId = org.Id, UserId = another.Id, Title = "Theirs" };
        fixture.Db.AddRange(another, mine, theirs); await fixture.Db.SaveChangesAsync();
        ((List<RecordOrderItemDto>)(await Service().GetAsync(org.Id, "private-notes", new())).Value!).Should().ContainSingle(x => x.Id == mine.Id);
        (await Service().SaveAsync(org.Id, "private-notes", new([new(theirs.Id, 1)]))).StatusCode.Should().Be(400);
        (await Service().SaveAsync(org.Id, "private-notes", new([new(mine.Id, 1)]))).StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task PdfSelectionAndDocumentUseSavedIndicesIncludingNestedNetworkEntries()
    {
        var (_, org) = fixture.SeedUserWithOrg();
        var a = new Contact { OrganizationId = org.Id, Name = "A", SortIndex = 20 };
        var b = new Contact { OrganizationId = org.Id, Name = "B", SortIndex = 10 };
        var network = new Subnet { OrganizationId = org.Id, Name = "LAN", Cidr = "10.0.0.0/24", SortIndex = 5,
            Ips = [new() { Ip = "10.0.0.2", SortIndex = 20 }, new() { Ip = "10.0.0.9", SortIndex = 10 }] };
        fixture.Db.AddRange(a, b, network); await fixture.Db.SaveChangesAsync();
        var renderer = new CaptureRenderer();
        var docs = new DocumentationService(fixture.Db, fixture.UserContext, fixture.Cipher, renderer);
        ((List<ResourceOptionDto>)(await docs.GetItemsAsync(org.Id, "contacts", new())).Value!).Select(x => x.Id).Should().Equal(b.Id, a.Id);
        (await docs.GenerateAsync(org.Id, new([new("contacts"), new("networks")]))).StatusCode.Should().Be(200);
        renderer.Snapshot!.Sections.Single(s => s.Key == "contacts").Records.Select(x => x.Id).Should().Equal(b.Id, a.Id);
        renderer.Snapshot.Sections.Single(s => s.Key == "contacts").Records.Select(x => x.SortIndex).Should().Equal(10, 20);
        var nested = renderer.Snapshot.Sections.Single(s => s.Key == "networks").Records.Single();
        nested.Fields.Where(x => x.Label == "IP entry").Select(x => x.Value).Should().Equal("10.0.0.9 —  (Used)", "10.0.0.2 —  (Used)");
    }

    public void Dispose() => fixture.Dispose();
    private sealed class CaptureRenderer : IDocumentationPdfRenderer
    {
        public DocumentationSnapshot? Snapshot { get; private set; }
        public Task<byte[]> RenderAsync(DocumentationSnapshot snapshot, CancellationToken token = default) { Snapshot = snapshot; return Task.FromResult("%PDF-test"u8.ToArray()); }
    }
}
