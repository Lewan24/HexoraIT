using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using HexoraIT.Tests.Application;
using HexoraITApi.Application;
using HexoraITApi.Application.Operations;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using PdfSharp.Pdf.IO;

namespace HexoraIT.Tests.Integration;

public sealed class OperationEndpointTests
{
    [Fact]
    public async Task GpoDraftReopenApprovalExecutionCloseHistoryAndPdfWorkWithOrganizationIsolation()
    {
        using var factory = new SecurityWebApplicationFactory();
        var requester = new User { Email = "requester@synthetic.invalid", DisplayName = "Synthetic requester", PasswordHash = [1], PasswordSalt = [1] };
        var approver = new User { Email = "approver@synthetic.invalid", DisplayName = "Synthetic approver", PasswordHash = [1], PasswordSalt = [1] };
        var outsider = new User { Email = "outsider@synthetic.invalid", PasswordHash = [1], PasswordSalt = [1] };
        var org = new Organization { Name = "SYNTHETIC — Łódź" }; var foreign = new Organization { Name = "Other org" };
        var asset = new Asset { Name = "SYNTHETIC-DC01", OrganizationId = org.Id };
        string requesterJwt, approverJwt, outsiderJwt;
        Guid templateId;
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>(); await db.Database.EnsureCreatedAsync();
            db.AddRange(requester, approver, outsider, org, foreign, asset);
            db.UserOrganizations.AddRange(new() { UserId = requester.Id, OrganizationId = org.Id, Role = OrgRole.Owner }, new() { UserId = approver.Id, OrganizationId = org.Id, Role = OrgRole.Admin }, new() { UserId = outsider.Id, OrganizationId = foreign.Id, Role = OrgRole.Owner });
            await db.SaveChangesAsync(); await OperationCatalog.SeedAsync(db);
            var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>();
            requesterJwt = jwt.CreateToken(requester.Id, requester.Email, requester.SystemRole, requester.SecurityStamp);
            approverJwt = jwt.CreateToken(approver.Id, approver.Email, approver.SystemRole, approver.SecurityStamp);
            outsiderJwt = jwt.CreateToken(outsider.Id, outsider.Email, outsider.SystemRole, outsider.SecurityStamp);
            templateId = await db.OperationTemplates.Where(t => t.Key == "A02").Select(t => t.Id).SingleAsync();
        }
        using var client = factory.CreateClient();
        var path = $"/api/operations/{org.Id}";
        Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path + "/templates")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", requesterJwt);
        var values = JsonNode.Parse(OperationTests.Values(OperationCatalog.All.Single(s => s.Key == "A02")).GetRawText())!.AsObject();
        values["settings"]![0]!["previous"] = "Disabled"; values["settings"]![0]!["next"] = "Success and Failure";
        values["settings"]![1]!["previous"] = "32 MB"; values["settings"]![1]!["next"] = "128 MB";
        var input = new OperationInput(templateId, "SYNTHETIC GPO — ąćęłńóśźż", "Synthetic change evidence", JsonSerializer.SerializeToElement(values), AssetId: asset.Id);
        var created = await client.PostAsJsonAsync(path + "/records", input);
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var id = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        var recordPath = path + $"/records/{id}";
        async Task<OperationDetail> Load() => (await client.GetFromJsonAsync<OperationDetail>(recordPath))!;
        var draft = await Load(); Assert.Equal(2, draft.Values.GetProperty("settings").GetArrayLength());
        Assert.Equal("Disabled", draft.Values.GetProperty("settings")[0].GetProperty("previous").GetString());
        Assert.Equal("Success and Failure", draft.Values.GetProperty("settings")[0].GetProperty("next").GetString());
        Assert.Equal("128 MB", draft.Values.GetProperty("settings")[1].GetProperty("next").GetString());
        Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync(recordPath + "/pdf")).StatusCode);
        var update = input with { Title = "SYNTHETIC updated — ąćęłńóśźż", RevisionToken = draft.Record.RevisionToken };
        Assert.Equal(HttpStatusCode.OK, (await client.PutAsJsonAsync(recordPath, update)).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync(recordPath, update)).StatusCode);
        async Task<HttpStatusCode> Act(string target, string reason = "") => (await client.PostAsJsonAsync(recordPath + "/transitions", new OperationTransition((await Load()).Record.RevisionToken, target, reason))).StatusCode;
        Assert.Equal(HttpStatusCode.Conflict, await Act("Closed", "Invalid shortcut"));
        Assert.Equal(HttpStatusCode.OK, await Act("Submitted"));
        Assert.Equal(HttpStatusCode.OK, await Act("Awaiting Approval"));
        Assert.Equal(HttpStatusCode.Forbidden, await Act("Approved"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", approverJwt);
        Assert.Equal(HttpStatusCode.OK, await Act("Approved", "Independent approval"));
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", requesterJwt);
        Assert.Equal(HttpStatusCode.OK, await Act("In Progress"));
        Assert.Equal(HttpStatusCode.OK, await Act("Verification", "gpresult evidence checked"));
        Assert.Equal(HttpStatusCode.OK, await Act("Completed", "Synthetic tests passed"));
        Assert.Equal(HttpStatusCode.OK, await Act("Closed", "Synthetic closure"));
        var closed = await Load(); Assert.Equal("Closed", closed.Record.Status); Assert.NotNull(closed.Record.ClosedAt); Assert.Equal(9, closed.Revisions.Count);
        Assert.Contains(closed.Activity, a => a.EventType == "Approved" && a.ActorId == approver.Id);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PutAsJsonAsync(recordPath, update with { RevisionToken = closed.Record.RevisionToken })).StatusCode);
        var list = (await client.GetFromJsonAsync<OperationList>(path + $"/records?search=SYNTHETIC&assetId={asset.Id}"))!; Assert.Single(list.Items);
        var pdf = await client.GetAsync(recordPath + "/pdf?language=pl"); Assert.Equal(HttpStatusCode.OK, pdf.StatusCode);
        Assert.Equal("application/pdf", pdf.Content.Headers.ContentType?.MediaType); Assert.Equal("attachment", pdf.Content.Headers.ContentDisposition?.DispositionType);
        var bytes = await pdf.Content.ReadAsByteArrayAsync(); Assert.True(bytes.AsSpan(0, 5).SequenceEqual("%PDF-"u8));
        using (var document = PdfReader.Open(new MemoryStream(bytes), PdfDocumentOpenMode.Import))
        {
            Assert.True(document.PageCount >= 3);
            Assert.Contains("ąćęłńóśźż", document.Info.Title);
        }
        var samplePath = Environment.GetEnvironmentVariable("HEXORA_OPERATIONS_SAMPLE_PDF"); if (!string.IsNullOrWhiteSpace(samplePath)) await File.WriteAllBytesAsync(samplePath, bytes);
        Assert.Equal(HttpStatusCode.MethodNotAllowed, (await client.DeleteAsync(recordPath)).StatusCode);
        var revisionId = closed.Revisions[0].Id;
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(recordPath + $"/revisions/{revisionId}")).StatusCode);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", outsiderJwt);
        foreach (var suffix in new[] { "", "/pdf", $"/revisions/{revisionId}" }) Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync(recordPath + suffix)).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await client.GetAsync(path + "/records?search=SYNTHETIC")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.PostAsJsonAsync(recordPath + "/transitions", new OperationTransition(closed.Record.RevisionToken, "Archived"))).StatusCode);
    }
}
