using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Application;

public sealed class ContactServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();

    private ContactService Service() => new(_fixture.Db, _fixture.Mapper, _fixture.UserContext);

    [Fact]
    public async Task Create_ThenGetAll_ReturnsContactWithPaginationMetadata()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();

        var created = await service.CreateAsync(organization.Id, Contact("John Doe"));
        var all = await service.GetAllAsync(organization.Id, null);

        created.StatusCode.Should().Be(StatusCodes.Status201Created);
        created.Location.Should().StartWith("/api/contacts/");
        var createdContact = created.Value.Should().BeOfType<ContactDto>().Subject;
        all.Value.Should().BeOfType<List<ContactDto>>().Subject
            .Should().ContainSingle(contact => contact.Id == createdContact.Id);
        all.Pagination!.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task GetById_ReturnsContact()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Contact("John")))
            .Value.Should().BeOfType<ContactDto>().Subject.Id;

        var response = await service.GetByIdAsync(id);

        response.StatusCode.Should().Be(StatusCodes.Status200OK);
        response.Value.Should().BeOfType<ContactDto>().Subject.Name.Should().Be("John");
    }

    [Fact]
    public async Task Update_ChangesContact()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Contact("Old")))
            .Value.Should().BeOfType<ContactDto>().Subject.Id;

        var update = await service.UpdateAsync(id,
            new UpdateContactDto("New", "", "", "", "", "", []));
        var fetched = await service.GetByIdAsync(id);

        update.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fetched.Value.Should().BeOfType<ContactDto>().Subject.Name.Should().Be("New");
    }

    [Fact]
    public async Task Delete_RemovesContact()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Contact("John")))
            .Value.Should().BeOfType<ContactDto>().Subject.Id;

        var deleted = await service.DeleteAsync(id);
        var fetched = await service.GetByIdAsync(id);

        deleted.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        fetched.StatusCode.Should().Be(StatusCodes.Status404NotFound);
    }

    [Fact]
    public async Task ToggleStar_FlipsStarred()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Contact("John")))
            .Value.Should().BeOfType<ContactDto>().Subject.Id;

        var toggled = await service.ToggleStarAsync(id);
        var fetched = await service.GetByIdAsync(id);

        toggled.Value.Should().BeEquivalentTo(new ContactStarredDto(true));
        fetched.Value.Should().BeOfType<ContactDto>().Subject.Starred.Should().BeTrue();
    }

    [Fact]
    public async Task ReadOnlyMember_CanReadButCannotUpdate()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var id = (await service.CreateAsync(organization.Id, Contact("John")))
            .Value.Should().BeOfType<ContactDto>().Subject.Id;
        var readOnlyUser = new User
        {
            Email = "contact-ro@test.local",
            DisplayName = "RO",
            PasswordHash = [1],
            PasswordSalt = [1]
        };
        _fixture.Db.Users.Add(readOnlyUser);
        _fixture.Db.UserOrganizations.Add(new UserOrganization
        {
            UserId = readOnlyUser.Id,
            OrganizationId = organization.Id,
            Role = OrgRole.ReadOnly
        });
        await _fixture.Db.SaveChangesAsync();
        _fixture.ActAs(readOnlyUser.Id);

        var read = await service.GetByIdAsync(id);
        var write = await service.UpdateAsync(id,
            new UpdateContactDto("Changed", "", "", "", "", "", []));

        read.StatusCode.Should().Be(StatusCodes.Status200OK);
        write.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    public void Dispose() => _fixture.Dispose();

    private static CreateContactDto Contact(string name) =>
        new(name, "ACME", "Admin", "123456789", "john@example.test", "desc", []);
}
