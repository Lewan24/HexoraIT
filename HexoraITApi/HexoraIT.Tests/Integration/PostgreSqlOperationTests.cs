using HexoraIT.Tests.Application;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using System.Text.Json.Nodes;
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
            // Upgrade a real pre-administration database containing an immutable legacy version.
            await setup.Database.GetService<IMigrator>().MigrateAsync("20261123162102_AddOperationHistoryProtection");
            var legacy = JsonNode.Parse(OperationSchemas.Serialize(OperationCatalog.All.Single(s => s.Key == "A02")))!.AsObject();
            foreach (var key in new[] { "kind", "requiresApproval", "validationProfile", "category" }) legacy.Remove(key);
            void LegacyFields(JsonArray fields)
            {
                foreach (var field in fields.OfType<JsonObject>())
                {
                    foreach (var key in field.Select(p => p.Key).Where(key => key is not ("key" or "label" or "type" or "required" or "maxLength" or "options" or "fields" or "help")).ToArray()) field.Remove(key);
                    if (field["fields"] is JsonArray children) LegacyFields(children);
                }
            }
            LegacyFields(legacy["fields"]!.AsArray());
            var legacyJson = legacy.ToJsonString(); var legacyId = Guid.NewGuid(); var legacyHash = OperationSchemas.Hash(legacyJson); var publishedAt = DateTime.UtcNow;
            await setup.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO \"OperationTemplates\" (\"Id\", \"Key\", \"Version\", \"ContentHash\", \"SchemaJson\", \"PublishedAt\") VALUES ({legacyId}, 'A02', 1, {legacyHash}, CAST({legacyJson} AS jsonb), {publishedAt})");
            await setup.Database.MigrateAsync();
            Assert.False(setup.Database.HasPendingModelChanges());
            setup.AddRange(actor, org, new UserOrganization { OrganizationId = org.Id, UserId = actor.Id, Role = OrgRole.Owner }); await setup.SaveChangesAsync();
            await OperationCatalog.SeedAsync(setup); await OperationCatalog.SeedAsync(setup); Assert.Equal(73, await setup.OperationTemplates.CountAsync());
            var retained = await setup.OperationTemplates.AsNoTracking().SingleAsync(t => t.Id == legacyId);
            Assert.Equal(legacyHash, retained.ContentHash); Assert.Equal(1, retained.Version); OperationSchemas.Parse(retained.SchemaJson);
            var templateId = await setup.OperationTemplates.Where(t => t.Key == "A02").OrderByDescending(t => t.Version).Select(t => t.Id).FirstAsync();
            var administration = new OperationAdministrationService(setup, new DbCurrentUserContext(setup, provider));
            Assert.Equal(200, (await administration.SavePolicy(org.Id, new(Guid.Empty, StandardPreApproved: true), default)).StatusCode);
            Assert.Equal(201, (await administration.Clone(org.Id, templateId, default)).StatusCode);
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
            foreach (var command in new[] { "DELETE FROM \"OperationTemplates\"", "DELETE FROM \"OperationActivities\"", "DELETE FROM \"OperationRevisions\"", "UPDATE \"OperationActivities\" SET \"EventType\" = 'tampered'", "DELETE FROM \"OperationPolicyRevisions\"" })
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
