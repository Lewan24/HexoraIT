using AutoMapper;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Domain;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace HexoraIT.Tests;

public class TestFixture : IDisposable
{
    private readonly SqliteConnection _connection;
    public AppDbContext Db { get; }
    public IMapper Mapper { get; }
    public FakeCurrentUserIdProvider IdProvider { get; }
    public DbCurrentUserContext UserContext { get; }
    public IPasswordCipher Cipher { get; } = new FakePasswordCipher();
    public IFileStorage Storage { get; } = new FakeFileStorage();

    public TestFixture()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(_connection)
            .Options;

        IdProvider = new FakeCurrentUserIdProvider();
        Db = new AppDbContext(options, IdProvider);
        Db.Database.EnsureCreated();

        UserContext = new DbCurrentUserContext(Db, IdProvider);

        var mapperConfig = new MapperConfiguration(cfg => cfg.AddProfile<AppMappingProfile>(), new LoggerFactory());
        Mapper = mapperConfig.CreateMapper();
    }

    public (User user, Organization org) SeedUserWithOrg(OrgRole role = OrgRole.Owner)
    {
        var user = new User { Email = $"{Guid.NewGuid()}@test.local", DisplayName = "Test User", PasswordHash = [1], PasswordSalt = [1] };
        var org = new Organization { Name = "Test Org", Color = "#000", Initials = "TO" };

        Db.Users.Add(user);
        Db.Organizations.Add(org);
        Db.UserOrganizations.Add(new UserOrganization { UserId = user.Id, OrganizationId = org.Id, Role = role });
        Db.SaveChanges();

        IdProvider.UserId = user.Id;
        return (user, org);
    }

    public void ActAs(Guid userId) => IdProvider.UserId = userId;

    public void Dispose()
    {
        Db.Dispose();
        _connection.Dispose();
    }
}