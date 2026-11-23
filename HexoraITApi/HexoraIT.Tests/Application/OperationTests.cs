using System.Text.Json;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class OperationTests
{
    public static JsonElement Values(OperationSchema schema) => JsonSerializer.SerializeToElement(schema.Fields.ToDictionary(f => f.Key, f =>
        f.Type == "table" ? (object)new[] { f.Fields!.ToDictionary(c => c.Key, c => Sample(c)), f.Fields!.ToDictionary(c => c.Key, c => Sample(c)) } : Sample(f)));
    private static string Sample(OperationField f) => f.Type switch { "select" => f.Options![0], "date" => "2026-11-23", "url" => "https://example.invalid/evidence", _ => "SYNTHETIC — zażółć gęślą jaźń" };

    [Fact]
    public void AllImplementedTemplatesValidateAndSupportRepeatingRows()
    {
        Assert.Equal(new[] { "A02", "A06", "D02" }, OperationCatalog.All.Select(s => s.Key));
        foreach (var schema in OperationCatalog.All)
        {
            var parsed = OperationSchemas.Parse(OperationSchemas.Serialize(schema));
            Assert.Empty(OperationSchemas.Validate(parsed, Values(schema), true));
        }
        var fixturePath = Environment.GetEnvironmentVariable("HEXORA_OPERATIONS_UI_FIXTURE");
        if (!string.IsNullOrWhiteSpace(fixturePath)) File.WriteAllText(fixturePath, JsonSerializer.Serialize(OperationCatalog.All.Select(schema => new { schema, values = Values(schema) }), OperationSchemas.Json));
    }

    [Theory]
    [InlineData("{\"schemaVersion\":1,\"key\":\"A02\",\"eval\":\"process.exit()\"}")]
    [InlineData("{}")]
    public void MalformedOrExecutableDefinitionsAreRejected(string input) => Assert.ThrowsAny<Exception>(() => OperationSchemas.Parse(input));

    [Fact]
    public void OversizeDepthUnknownFieldsAndInvalidTypesAreRejected()
    {
        Assert.Throws<ArgumentException>(() => OperationSchemas.Parse(new string('x', 128001)));
        var schema = OperationCatalog.All[0];
        Assert.Throws<ArgumentException>(() => OperationSchemas.Parse(OperationSchemas.Serialize(schema with { Fields = [new("code", new("Code", "Kod"), "javascript")] })));
        Assert.Throws<ArgumentException>(() => OperationSchemas.Parse(OperationSchemas.Serialize(schema with { Fields = [new("rows", new("Rows", "Wiersze"), "table", Fields: [new("rows", new("Rows", "Wiersze"), "table", Fields: schema.Fields)])] })));
        Assert.NotEmpty(OperationSchemas.Validate(schema, JsonSerializer.SerializeToElement(new { domain = 5 }), false));
        Assert.NotEmpty(OperationSchemas.Validate(schema, JsonSerializer.SerializeToElement(new { unknown = "value" }), false));
        Assert.Empty(OperationSchemas.Validate(schema, JsonSerializer.SerializeToElement(new { }), false));
        Assert.NotEmpty(OperationSchemas.Validate(schema, JsonSerializer.SerializeToElement(new { }), true));
    }

    [Fact]
    public void RestoreSuccessRequiresBothVerificationResults()
    {
        var schema = OperationCatalog.All.Single(s => s.Key == "D02");
        var values = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(Values(schema))!;
        values["integrity"] = JsonSerializer.SerializeToElement("");
        values["functionality"] = JsonSerializer.SerializeToElement("");
        var errors = OperationSchemas.Validate(schema, JsonSerializer.SerializeToElement(values), true);
        Assert.Contains("integrity", errors.Keys); Assert.Contains("functionality", errors.Keys);
    }

    [Fact]
    public async Task SeedIsIdempotentAndPublishedTemplatesAndHistoryCannotBeChanged()
    {
        using var f = new TestFixture();
        await OperationCatalog.SeedAsync(f.Db); await OperationCatalog.SeedAsync(f.Db);
        Assert.Equal(3, await f.Db.OperationTemplates.CountAsync());
        var template = await f.Db.OperationTemplates.FirstAsync();
        template.SchemaJson = "{}";
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Db.SaveChangesAsync());
    }

    [Fact]
    public async Task ReadOnlyCannotCreateAndForeignAssetsAreRejected()
    {
        using var f = new TestFixture();
        var (actor, org) = f.SeedUserWithOrg(OrgRole.ReadOnly); await OperationCatalog.SeedAsync(f.Db);
        var service = new OperationService(f.Db, f.UserContext);
        var template = await f.Db.OperationTemplates.FirstAsync(t => t.Key == "A02");
        var input = new OperationInput(template.Id, "GPO", "", Values(OperationCatalog.All[0]));
        Assert.Equal(403, (await service.Create(org.Id, input, default)).StatusCode);
        var member = await f.Db.UserOrganizations.SingleAsync(m => m.UserId == actor.Id); member.Role = OrgRole.Member;
        var other = new Organization { Name = "Foreign" }; var asset = new Asset { OrganizationId = other.Id, Name = "Foreign asset" }; f.Db.AddRange(other, asset); await f.Db.SaveChangesAsync();
        Assert.Equal(400, (await service.Create(org.Id, input with { AssetId = asset.Id }, default)).StatusCode);
        Assert.Empty(await f.Db.OperationRecords.ToListAsync());
    }

    [Theory]
    [InlineData("Draft", "Submitted", "Normal", true)]
    [InlineData("Draft", "Closed", "Normal", false)]
    [InlineData("Closed", "In Progress", "Emergency", false)]
    [InlineData("Rejected", "Submitted", "Normal", false)]
    [InlineData("Draft", "In Progress", "Emergency", true)]
    [InlineData("Draft", "In Progress", "Normal", false)]
    public void TransitionMatrixIsClosed(string from, string to, string type, bool expected) => Assert.Equal(expected, OperationWorkflow.CanTransition(from, to, type, false));

    [Fact]
    public async Task EmergencyBypassRequiresReasonAndIndependentReviewBeforeClosure()
    {
        using var f = new TestFixture();
        var (requester, org) = f.SeedUserWithOrg(); await OperationCatalog.SeedAsync(f.Db);
        var template = await f.Db.OperationTemplates.SingleAsync(t => t.Key == "A02");
        var service = new OperationService(f.Db, f.UserContext);
        Assert.Equal(201, (await service.Create(org.Id, new(template.Id, "Emergency", "", Values(OperationCatalog.All[0]), ChangeType: "Emergency"), default)).StatusCode);
        var record = await f.Db.OperationRecords.SingleAsync();
        async Task<int> Act(string to, string reason = "") => (await service.Transition(org.Id, record.Id, new(record.RevisionToken, to, reason), default)).StatusCode;
        Assert.Equal(400, await Act("In Progress"));
        Assert.Equal(200, await Act("In Progress", "SYNTHETIC critical outage")); Assert.True(record.EmergencyBypassed);
        Assert.Equal(200, await Act("Verification", "Results checked"));
        Assert.Equal(200, await Act("Completed", "Recovered"));
        Assert.Equal(409, await Act("Closed", "Closure"));
        Assert.Equal(403, await Act("RetrospectiveReview", "Self review"));
        var reviewer = new User { Email = "reviewer@synthetic.invalid", PasswordHash = [1], PasswordSalt = [1] };
        f.Db.AddRange(reviewer, new UserOrganization { UserId = reviewer.Id, OrganizationId = org.Id, Role = OrgRole.Admin }); await f.Db.SaveChangesAsync();
        f.ActAs(reviewer.Id);
        Assert.Equal(200, await Act("RetrospectiveReview", "Independent retrospective review"));
        Assert.Equal(200, await Act("Closed", "Closure after review"));
        var activity = await f.Db.OperationActivities.ToListAsync();
        Assert.DoesNotContain(activity, a => a.EventType.Contains("critical outage"));
        var first = activity[0]; first.EventType = "tamper";
        await Assert.ThrowsAsync<InvalidOperationException>(() => f.Db.SaveChangesAsync());
    }

    [Theory]
    [InlineData("A06")]
    [InlineData("D02")]
    public async Task AdditionalTemplatesSupportPersistentLifecycleWithRestoreValidation(string key)
    {
        using var f = new TestFixture();
        var (_, org) = f.SeedUserWithOrg(); await OperationCatalog.SeedAsync(f.Db);
        var template = await f.Db.OperationTemplates.SingleAsync(t => t.Key == key);
        var schema = OperationCatalog.All.Single(t => t.Key == key);
        var service = new OperationService(f.Db, f.UserContext);
        Assert.Equal(201, (await service.Create(org.Id, new(template.Id, "Synthetic " + key, "", Values(schema)), default)).StatusCode);
        var record = await f.Db.OperationRecords.SingleAsync();
        var detail = Assert.IsType<OperationDetail>((await service.Detail(org.Id, record.Id, default)).Value);
        Assert.Equal(key, detail.Schema.Key);
        Assert.Equal(200, (await service.Transition(org.Id, record.Id, new(record.RevisionToken, "Submitted"), default)).StatusCode);
        if (key == "D02") Assert.Equal(200, (await service.Transition(org.Id, record.Id, new(record.RevisionToken, "Closed", "Verified synthetic restore"), default)).StatusCode);
        else Assert.Equal(200, (await service.Transition(org.Id, record.Id, new(record.RevisionToken, "Awaiting Approval"), default)).StatusCode);
    }
}
