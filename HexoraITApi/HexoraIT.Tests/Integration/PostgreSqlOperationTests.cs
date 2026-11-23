using HexoraIT.Tests.Application;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace HexoraIT.Tests.Integration;

public sealed class PostgreSqlOperationFactAttribute : FactAttribute
{
    public PostgreSqlOperationFactAttribute()
    {
        if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("HEXORA_OPERATIONS_TEST_POSTGRES")))
            Skip = "Set HEXORA_OPERATIONS_TEST_POSTGRES; the test creates and drops its own random database.";
    }
}

public sealed class PostgreSqlOperationTests
{
    [PostgreSqlOperationFact]
    public async Task MigrationsConcurrentNumbersSearchStaleWritesAndAppendOnlyTriggersWorkOnPostgres()
    {
        var admin = Environment.GetEnvironmentVariable("HEXORA_OPERATIONS_TEST_POSTGRES")!;
        var name = "hexora_operations_test_" + Guid.NewGuid().ToString("N");
        await using var connection = new NpgsqlConnection(admin); await connection.OpenAsync();
        await using (var create = new NpgsqlCommand($"CREATE DATABASE \"{name}\"", connection)) await create.ExecuteNonQueryAsync();
        try
        {
            var builder = new NpgsqlConnectionStringBuilder(admin) { Database = name, Pooling = false };
            var options = new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(builder.ConnectionString).Options;
            var actor = new User { Email = "postgres@synthetic.invalid", PasswordHash = [1], PasswordSalt = [1] };
            var org = new Organization { Name = "SYNTHETIC operations" };
            var provider = new FakeCurrentUserIdProvider { UserId = actor.Id };
            await using var setup = new AppDbContext(options, provider);
            await setup.Database.MigrateAsync();
            Assert.False(setup.Database.HasPendingModelChanges());
            setup.AddRange(actor, org, new UserOrganization { OrganizationId = org.Id, UserId = actor.Id, Role = OrgRole.Owner }); await setup.SaveChangesAsync();
            await OperationCatalog.SeedAsync(setup); await OperationCatalog.SeedAsync(setup); Assert.Equal(72, await setup.OperationTemplates.CountAsync());
            var templateId = await setup.OperationTemplates.Where(t => t.Key == "A02").Select(t => t.Id).SingleAsync();
            var input = new OperationInput(templateId, "SYNTHETIC searchable GPO", "Configuration control evidence", OperationTests.Values(OperationCatalog.All.Single(s => s.Key == "A02")));
            var results = await Task.WhenAll(Enumerable.Range(0, 12).Select(async _ =>
            {
                await using var db = new AppDbContext(options, provider);
                return await new OperationService(db, new DbCurrentUserContext(db, provider)).Create(org.Id, input, default);
            }));
            Assert.All(results, r => Assert.Equal(201, r.StatusCode));
            Assert.Equal(Enumerable.Range(1, 12), await setup.OperationRecords.OrderBy(r => r.Sequence).Select(r => r.Sequence).ToListAsync());
            var service = new OperationService(setup, new DbCurrentUserContext(setup, provider));
            var search = await service.List(org.Id, "searchable", null, null, null, null, null, null, null, null, null, null, 1, 5, default);
            var list = Assert.IsType<OperationList>(search.Value); Assert.Equal(12, list.Total); Assert.Equal(5, list.Items.Count);
            var id = list.Items[0].Id;
            await using var first = new AppDbContext(options, provider); await using var second = new AppDbContext(options, provider);
            var firstService = new OperationService(first, new DbCurrentUserContext(first, provider));
            var secondService = new OperationService(second, new DbCurrentUserContext(second, provider));
            var original = (await firstService.Find(org.Id, id, default))!.RevisionToken;
            await secondService.Find(org.Id, id, default); // deliberately retain the old xmin and token
            Assert.Equal(200, (await firstService.Update(org.Id, id, input with { Title = "First", RevisionToken = original }, default)).StatusCode);
            Assert.Equal(409, (await secondService.Update(org.Id, id, input with { Title = "Lost update", RevisionToken = original }, default)).StatusCode);
            foreach (var command in new[] { "DELETE FROM \"OperationTemplates\"", "DELETE FROM \"OperationActivities\"", "DELETE FROM \"OperationRevisions\"", "UPDATE \"OperationActivities\" SET \"EventType\" = 'tampered'" })
            {
                var exception = await Assert.ThrowsAsync<PostgresException>(() => setup.Database.ExecuteSqlRawAsync(command));
                Assert.Contains("append-only", exception.MessageText);
            }
        }
        finally
        {
            await using var drop = new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)", connection); await drop.ExecuteNonQueryAsync();
        }
    }
}
