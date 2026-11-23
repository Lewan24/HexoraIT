using System.Text.Json;
using HexoraITApi.Api.App;
using HexoraITApi.Application.Documentation;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace HexoraIT.Tests.Application;

public sealed class OperationAdministrationTests
{
    private static JsonElement J(object value) => JsonSerializer.SerializeToElement(value);
    private static OperationSchema Example => OperationCatalog.All.Single(s => s.Key == "A02");

    [Theory]
    [InlineData("equals", "x", "x", true)]
    [InlineData("notEquals", "x", "y", true)]
    [InlineData("empty", "", null, true)]
    [InlineData("notEmpty", "x", null, true)]
    [InlineData("equals", "x", "y", false)]
    public void ClosedConditionsCompareValues(string op, string actual, string? expected, bool result)
    {
        var condition = new OperationCondition("AND", [new("mode", op, expected is null ? null : J(expected))]);
        Assert.Equal(result, OperationSchemas.Visible(condition, J(new { mode = actual }), J(new { mode = actual })));
    }

    [Fact]
    public void ConditionsNumbersChoicesDefaultsAndSecretRulesAreValidated()
    {
        var schema = Example with { Fields = [new("enabled", new("Enabled", "Włączone"), "boolean", DefaultValue: J(false)),
            new("count", new("Count", "Liczba"), "integer", Minimum: 1, Maximum: 5),
            new("tags", new("Tags", "Tagi"), "multiselect", Options: ["A", "B"]),
            new("details", new("Details", "Szczegóły"), Required: true, VisibleWhen: new("AND", [new("enabled", "equals", J(true))]))] };
        schema = OperationSchemas.Parse(OperationSchemas.Serialize(schema));
        Assert.Empty(OperationSchemas.Validate(schema, J(new { enabled = false, count = 3, tags = new[] { "A" } }), true));
        Assert.Contains("details", OperationSchemas.Validate(schema, J(new { enabled = true }), true).Keys);
        Assert.Contains("count", OperationSchemas.Validate(schema, J(new { count = 1.5 }), false).Keys);
        Assert.Contains("count", OperationSchemas.Validate(schema, J(new { count = 6 }), false).Keys);
        Assert.Contains("enabled", OperationSchemas.Validate(schema, J(new { enabled = "true" }), false).Keys);
        Assert.Contains("tags", OperationSchemas.Validate(schema, J(new { tags = new[] { "A", "A" } }), false).Keys);
        Assert.False(OperationSchemas.PrepareValues(schema, J(new { }), true).GetProperty("enabled").GetBoolean());
        foreach (var op in new[] { "greaterThan", "lessThan", "in", "notIn" })
        {
            var condition = new OperationCondition("OR", [new("count", op, op is "in" or "notIn" ? J(new[] { 3, 4 }) : J(2))]);
            Assert.Equal(op is "greaterThan" or "in", OperationSchemas.Visible(condition, J(new { count = 3 }), J(new { })));
        }
        var malicious = schema with { Fields = [new("mode", new("Mode", "Tryb")), new("target", new("Target", "Cel"), VisibleWhen: new("AND", [new("mode", "eval", J("alert(1)"))]))] };
        Assert.Throws<ArgumentException>(() => OperationSchemas.Parse(OperationSchemas.Serialize(malicious)));
        foreach (var key in new[] { "__proto__", "constructor", "prototype" }) Assert.Throws<ArgumentException>(() => OperationSchemas.Parse(OperationSchemas.Serialize(schema with { Fields = [new(key, new("Unsafe", "Niebezpieczne"))] })));
        Assert.Throws<ArgumentException>(() => OperationSchemas.Parse(OperationSchemas.Serialize(schema with { Fields = [new("code", new("Code", "Kod"), Pattern: "(a+)+$")] })));
        Assert.Throws<ArgumentException>(() => OperationSchemas.Parse(OperationSchemas.Serialize(schema with { Fields = [new("secret", new("Secret", "Sekret"), Required: true, Sensitivity: "Secret")] })));
    }

    [Fact]
    public async Task OrganizationVersionsAreImmutableScopedConcurrentAndIndependentlyDisabled()
    {
        using var f = new TestFixture(); var (actor, org) = f.SeedUserWithOrg(); await OperationCatalog.SeedAsync(f.Db);
        var admin = new OperationAdministrationService(f.Db, f.UserContext); var records = new OperationService(f.Db, f.UserContext);
        var source = await f.Db.OperationTemplates.SingleAsync(t => t.Key == "A02");
        Assert.Equal(201, (await admin.Clone(org.Id, source.Id, default)).StatusCode);
        var old = await f.Db.OperationTemplates.SingleAsync(t => t.OrganizationId == org.Id);
        var oldJson = old.SchemaJson;
        Assert.Equal(201, (await records.Create(org.Id, new(old.Id, "Old version document", "", OperationTests.Values(Example)), default)).StatusCode);
        var record = await f.Db.OperationRecords.SingleAsync();
        var schema = OperationSchemas.Parse(oldJson) with { Name = new("Organization GPO v2", "GPO organizacji v2") };
        Assert.Equal(201, (await admin.Publish(org.Id, old.Key, new(old.Id, OperationSchemas.Serialize(schema)), default)).StatusCode);
        Assert.Equal(409, (await admin.Publish(org.Id, old.Key, new(old.Id, OperationSchemas.Serialize(schema)), default)).StatusCode);
        Assert.Equal(oldJson, (await f.Db.OperationTemplates.AsNoTracking().SingleAsync(t => t.Id == old.Id)).SchemaJson);
        var detail = Assert.IsType<OperationDetail>((await records.Detail(org.Id, record.Id, default)).Value); Assert.Equal(old.Id, detail.Template.Id);
        var latest = await f.Db.OperationTemplates.Where(t => t.Key == old.Key).OrderByDescending(t => t.Version).FirstAsync();
        Assert.Equal(200, (await admin.Activate(org.Id, old.Key, new(Guid.Empty, false), default)).StatusCode);
        Assert.Equal(409, (await admin.Activate(org.Id, old.Key, new(Guid.Empty, true), default)).StatusCode);
        Assert.Equal(409, (await records.Create(org.Id, new(latest.Id, "Disabled", "", OperationTests.Values(Example)), default)).StatusCode);
        Assert.Equal(200, (await records.Update(org.Id, record.Id, new(old.Id, "Old draft still editable", "", OperationTests.Values(Example), RevisionToken: record.RevisionToken), default)).StatusCode);
        var other = new Organization { Name = "Other" }; f.Db.AddRange(other, new UserOrganization { UserId = actor.Id, OrganizationId = other.Id, Role = OrgRole.Owner }); await f.Db.SaveChangesAsync();
        Assert.Equal(400, (await records.Create(other.Id, new(latest.Id, "Foreign", "", J(new { })), default)).StatusCode);
        Assert.Equal(404, (await admin.Publish(other.Id, old.Key, new(latest.Id, OperationSchemas.Serialize(schema)), default)).StatusCode);
        Assert.Equal(404, (await admin.Activate(other.Id, old.Key, new(Guid.Empty, true), default)).StatusCode);
        Assert.DoesNotContain(Assert.IsType<List<OperationTemplateView>>((await admin.Templates(other.Id, default)).Value), t => t.Key == old.Key);
        Assert.False((await f.Db.OperationTemplateSettings.AsNoTracking().SingleAsync()).Active);
    }

    [Fact]
    public async Task PoliciesEnforceDefaultsLowRiskSelfApprovalAndDocumentedHighRiskExceptions()
    {
        using var f = new TestFixture(); var (_, org) = f.SeedUserWithOrg(); await OperationCatalog.SeedAsync(f.Db);
        var admin = new OperationAdministrationService(f.Db, f.UserContext); var service = new OperationService(f.Db, f.UserContext);
        var template = await f.Db.OperationTemplates.SingleAsync(t => t.Key == "A02");
        Assert.Equal(201, (await service.Create(org.Id, new(template.Id, "Low", "", OperationTests.Values(Example), Risk: "Low"), default)).StatusCode);
        var low = await f.Db.OperationRecords.SingleAsync();
        async Task<int> Act(OperationRecord r, string target, string exception = "") => (await service.Transition(org.Id, r.Id, new(r.RevisionToken, target, "Synthetic decision", exception), default)).StatusCode;
        Assert.Equal(200, await Act(low, "Submitted")); Assert.Equal(409, await Act(low, "Approved"));
        Assert.Equal(200, await Act(low, "Awaiting Approval")); Assert.Equal(403, await Act(low, "Approved"));
        Assert.Equal(200, (await admin.SavePolicy(org.Id, new(Guid.Empty, AllowLowRiskSelfApproval: true), default)).StatusCode);
        Assert.Equal(409, (await admin.SavePolicy(org.Id, new(Guid.Empty), default)).StatusCode);
        Assert.Equal(200, await Act(low, "Approved"));
        Assert.Equal(201, (await service.Create(org.Id, new(template.Id, "High", "", OperationTests.Values(Example), Risk: "High"), default)).StatusCode);
        var high = await f.Db.OperationRecords.SingleAsync(r => r.Title == "High"); Assert.Equal(400, await Act(high, "Submitted"));
        var policy = await admin.Policy(org.Id);
        Assert.Equal(200, (await admin.SavePolicy(org.Id, new(policy.RevisionToken, AllowLowRiskSelfApproval: true, AllowDocumentedExceptions: true), default)).StatusCode);
        Assert.Equal(200, await Act(high, "Submitted", "SYNTHETIC small-team exception")); Assert.Equal(200, await Act(high, "Awaiting Approval"));
        Assert.Equal(403, await Act(high, "Approved")); Assert.Equal(200, await Act(high, "Approved", "SYNTHETIC documented exception"));
        Assert.Equal(2, await f.Db.OperationActivities.CountAsync(a => a.RecordId == high.Id && a.EventType == "PolicyException"));
        Assert.True(await f.Db.OperationPolicyRevisions.CountAsync() >= 2);
        Assert.Equal(400, (await admin.SavePolicy(org.Id, new((await admin.Policy(org.Id)).RevisionToken, RetentionDays: 0), default)).StatusCode);
    }

    [Fact]
    public async Task RestrictedValuesAreHiddenInReadsRevisionsAndPdfAndPreservedOnMemberEdits()
    {
        using var f = new TestFixture(); var (owner, org) = f.SeedUserWithOrg();
        var member = new User { Email = "member@synthetic.invalid", PasswordHash = [1], PasswordSalt = [1] };
        f.Db.AddRange(member, new UserOrganization { UserId = member.Id, OrganizationId = org.Id, Role = OrgRole.Member }); await f.Db.SaveChangesAsync();
        var schema = Example with { Kind = "Record", Fields = [new("normal", new("Normal", "Zwykłe"), Required: true), new("restricted", new("Restricted", "Ograniczone"), Sensitivity: "Restricted"), new("secret", new("Secret", "Sekret"), Sensitivity: "Secret")] };
        var admin = new OperationAdministrationService(f.Db, f.UserContext); var records = new OperationService(f.Db, f.UserContext);
        Assert.Equal(201, (await admin.Import(org.Id, new(null, OperationSchemas.Serialize(schema)), default)).StatusCode);
        var template = await f.Db.OperationTemplates.SingleAsync();
        f.ActAs(member.Id);
        Assert.Equal(403, (await admin.Clone(org.Id, template.Id, default)).StatusCode);
        Assert.Equal(400, (await records.Create(org.Id, new(template.Id, "Secret rejected", "", J(new { normal = "ordinary", secret = "DO-NOT-STORE" })), default)).StatusCode);
        Assert.Equal(201, (await records.Create(org.Id, new(template.Id, "Restricted record", "", J(new { normal = "ordinary" })), default)).StatusCode);
        var record = await f.Db.OperationRecords.SingleAsync();
        f.ActAs(owner.Id);
        Assert.Equal(200, (await records.Update(org.Id, record.Id, new(template.Id, record.Title, "", J(new { normal = "ordinary", restricted = "RESTRICTED-SENTINEL" }), RevisionToken: record.RevisionToken), default)).StatusCode);
        f.ActAs(member.Id);
        Assert.Equal(403, (await records.Update(org.Id, record.Id, new(template.Id, record.Title, "", J(new { normal = "ordinary", restricted = "overwrite" }), RevisionToken: record.RevisionToken), default)).StatusCode);
        Assert.Equal(200, (await records.Update(org.Id, record.Id, new(template.Id, "Member edit", "", J(new { normal = "changed" }), RevisionToken: record.RevisionToken), default)).StatusCode);
        Assert.Contains("RESTRICTED-SENTINEL", record.ValuesJson); Assert.DoesNotContain("secret", record.ValuesJson);
        var detail = Assert.IsType<OperationDetail>((await records.Detail(org.Id, record.Id, default)).Value);
        Assert.DoesNotContain("RESTRICTED-SENTINEL", JsonSerializer.Serialize(detail));
        Assert.DoesNotContain("restricted", detail.Template.SchemaJson);
        foreach (var revision in detail.Revisions) Assert.DoesNotContain("RESTRICTED-SENTINEL", JsonSerializer.Serialize((await records.Revision(org.Id, record.Id, revision.Id, default)).Value));
        Assert.Equal(200, (await records.Transition(org.Id, record.Id, new(record.RevisionToken, "Submitted"), default)).StatusCode);
        var renderer = new CapturingRenderer();
        await OperationEndpoints.Export(org.Id, record.Id, "en", records, f.Db, renderer, default);
        Assert.NotNull(renderer.Snapshot); Assert.DoesNotContain("RESTRICTED-SENTINEL", JsonSerializer.Serialize(renderer.Snapshot));
        f.ActAs(owner.Id); Assert.Contains("RESTRICTED-SENTINEL", JsonSerializer.Serialize((await records.Detail(org.Id, record.Id, default)).Value));
    }

    private sealed class CapturingRenderer : IDocumentationPdfRenderer
    {
        public DocumentationSnapshot? Snapshot;
        public Task<byte[]> RenderAsync(DocumentationSnapshot snapshot, CancellationToken token = default) { Snapshot = snapshot; return Task.FromResult("%PDF-"u8.ToArray()); }
    }
}
