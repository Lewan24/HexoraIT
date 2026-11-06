using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application;
using HexoraITApi.Application.DataTransfer;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;

namespace HexoraIT.Tests.Integration;

public sealed class PostgreSqlArchiveFactAttribute : FactAttribute
{
    public PostgreSqlArchiveFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("HEXORA_ARCHIVE_TEST_POSTGRES")))
            Skip = "Set HEXORA_ARCHIVE_TEST_POSTGRES to an administrative connection; a separate disposable test database is created.";
    }
}

public sealed class PostgreSqlArchiveTests
{
    [PostgreSqlArchiveFact]
    public async Task ConcurrentImportsAndOrdinaryWritesCannotOverwriteOrMergeDocumentation()
    {
        var admin = Environment.GetEnvironmentVariable("HEXORA_ARCHIVE_TEST_POSTGRES")!;
        var name = "hexora_archive_test_" + Guid.NewGuid().ToString("N");
        await using var connection = new NpgsqlConnection(admin);
        await connection.OpenAsync();
        // Only this randomly generated database is created and dropped; existing databases are never touched.
        await using (var command = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", connection)) await command.ExecuteNonQueryAsync();
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(admin) { Database = name, Pooling = false };
            var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(builder.ConnectionString).Options;
            var provider = new FakeCurrentUserIdProvider();
            var protection = new EphemeralDataProtectionProvider();
            var cipher = new FakePasswordCipher(); var storage = new FakeFileStorage(); var hasher = new Pbkdf2PasswordHasher();
            const string password = "Archive concurrency test password!";
            var (hash, salt) = hasher.Hash(password);
            var user = new User { Email = "concurrency@test.local", PasswordHash = hash, PasswordSalt = salt };
            provider.UserId = user.Id;
            var source = new Organization { Name = "Source" };
            var target = new Organization { Name = "Target" };
            var raced = new Organization { Name = "Raced" };
            await using var setup = new AppDbContext(options, provider);
            await setup.Database.EnsureCreatedAsync();
            setup.AddRange(user, source, target, raced, new Contact { OrganizationId = source.Id, Name = "Archive contact" });
            setup.AddRange(new[] { source, target, raced }.Select(org => new UserOrganization { OrganizationId = org.Id, UserId = user.Id, Role = OrgRole.Owner }));
            await setup.SaveChangesAsync();
            OrganizationArchiveService Service(AppDbContext db) => new(db, new DbCurrentUserContext(db, provider), hasher, cipher, storage,
                protection, new SecurityAuditLogger(NullLoggerFactory.Instance, new HttpContextAccessor()), NullLogger<OrganizationArchiveService>.Instance);
            var exported = await Service(setup).ExportAsync(source.Id, new(password, true, ArchiveTestZip.Password));
            exported.StatusCode.Should().Be(200, "{0}", exported.Value);
            await using var content = ((ArchiveDownload)exported.Value!).Content;
            using var buffer = new MemoryStream(); await content.CopyToAsync(buffer);
            var bytes = buffer.ToArray();
            await content.DisposeAsync();
            IFormFile Upload() => new FormFile(new MemoryStream(bytes), 0, bytes.Length, "file", "archive.zip");
            await using var first = new AppDbContext(options, provider);
            await using var second = new AppDbContext(options, provider);
            var firstService = Service(first); var secondService = Service(second);
            var review1 = (ArchivePreview)(await firstService.PreviewAsync(target.Id, Upload(), archivePassword: ArchiveTestZip.Password)).Value!;
            var review2 = (ArchivePreview)(await secondService.PreviewAsync(target.Id, Upload(), archivePassword: ArchiveTestZip.Password)).Value!;
            var results = await Task.WhenAll(
                firstService.ImportAsync(target.Id, Upload(), new(password, review1.ReviewToken, target.Name, true, ArchiveTestZip.Password)),
                secondService.ImportAsync(target.Id, Upload(), new(password, review2.ReviewToken, target.Name, true, ArchiveTestZip.Password)));
            results.Select(r => r.StatusCode).Should().BeEquivalentTo([200, 409]);
            (await setup.Contacts.CountAsync(c => c.OrganizationId == target.Id)).Should().Be(1);

            // A regular service write does not know about archive locks. It must still prevent an import from merging data.
            var review3 = (ArchivePreview)(await firstService.PreviewAsync(raced.Id, Upload(), archivePassword: ArchiveTestZip.Password)).Value!;
            await using var writer = new AppDbContext(options, provider);
            await using var transaction = await writer.Database.BeginTransactionAsync();
            writer.Contacts.Add(new Contact { OrganizationId = raced.Id, Name = "Ordinary write" });
            await writer.SaveChangesAsync();
            var import = firstService.ImportAsync(raced.Id, Upload(), new(password, review3.ReviewToken, raced.Name, true, ArchiveTestZip.Password));
            await Task.Delay(200);
            import.IsCompleted.Should().BeFalse("the import must wait for the ordinary database writer");
            await transaction.CommitAsync();
            (await import).StatusCode.Should().Be(409);
            (await setup.Contacts.SingleAsync(c => c.OrganizationId == raced.Id)).Name.Should().Be("Ordinary write");
            (await setup.Contacts.CountAsync(c => c.OrganizationId == source.Id)).Should().Be(1);
        }
        finally
        {
            await using var cleanup = new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)", connection);
            await cleanup.ExecuteNonQueryAsync();
        }
    }
}
