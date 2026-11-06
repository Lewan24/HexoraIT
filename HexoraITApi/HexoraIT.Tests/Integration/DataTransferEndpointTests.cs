using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using HexoraITApi.Application;
using HexoraITApi.Application.DataTransfer;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace HexoraIT.Tests.Integration;

public sealed class DataTransferEndpointTests
{
    private const string Password = "Test archive account password!";

    private static async Task<(HttpClient Client, Organization Source, Organization Destination)> Seed(SecurityWebApplicationFactory factory, OrgRole role)
    {
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        await db.Database.EnsureCreatedAsync();
        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
        var (hash, salt) = hasher.Hash(Password);
        var user = new User { Email = "archive@test.local", PasswordHash = hash, PasswordSalt = salt };
        var source = new Organization { Name = "Source" };
        var target = new Organization { Name = "Destination" };
        db.AddRange(user, source, target, new Contact { OrganizationId = source.Id, Name = "Restored contact" },
            new UserOrganization { UserId = user.Id, OrganizationId = source.Id, Role = role },
            new UserOrganization { UserId = user.Id, OrganizationId = target.Id, Role = role });
        await db.SaveChangesAsync();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>().CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        var client = factory.CreateClient(); client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        return (client, source, target);
    }

    private static MultipartFormDataContent Form(byte[] bytes, ArchivePreview? preview = null, string password = Password)
    {
        var form = new MultipartFormDataContent();
        form.Add(new ByteArrayContent(bytes), "file", "archive.zip");
        form.Add(new StringContent(ArchiveTestZip.Password), "archivePassword");
        if (preview is not null)
        {
            form.Add(new StringContent(password), "password");
            form.Add(new StringContent(preview.ReviewToken), "reviewToken");
            form.Add(new StringContent("Destination"), "confirmOrganizationName");
            form.Add(new StringContent("true"), "confirmImport");
        }
        return form;
    }

    [Theory]
    [InlineData(OrgRole.Owner, HttpStatusCode.OK)]
    [InlineData(OrgRole.Admin, HttpStatusCode.OK)]
    [InlineData(OrgRole.Member, HttpStatusCode.Forbidden)]
    [InlineData(OrgRole.ReadOnly, HttpStatusCode.Forbidden)]
    public async Task HttpEndpointsEnforceOrganizationRolesAndAnonymousAccess(OrgRole role, HttpStatusCode expected)
    {
        using var factory = new SecurityWebApplicationFactory();
        var (client, source, target) = await Seed(factory, role); using var authenticated = client;
        var path = $"/api/organizations/{source.Id}/data-transfer";
        using var anonymous = factory.CreateClient();
        (await anonymous.GetAsync(path + "/capabilities")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await anonymous.PostAsJsonAsync(path + "/export", new ArchiveExportRequest(Password, true, ArchiveTestZip.Password))).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.GetAsync(path + "/capabilities")).StatusCode.Should().Be(expected);
        var response = await client.PostAsJsonAsync(path + "/export", new ArchiveExportRequest(Password, true, ArchiveTestZip.Password));
        response.StatusCode.Should().Be(expected);
        if (expected == HttpStatusCode.OK)
        {
            response.Content.Headers.ContentType!.MediaType.Should().Be("application/zip");
            response.Content.Headers.ContentDisposition!.DispositionType.Should().Be("attachment");
            response.Headers.CacheControl!.NoStore.Should().BeTrue();
            var data = await response.Content.ReadAsByteArrayAsync();
            data.Take(2).Should().Equal("PK"u8.ToArray());
        }
        else
        {
            using var form = Form([1]);
            (await client.PostAsync($"/api/organizations/{target.Id}/data-transfer/preview", form)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        }
    }

    [Fact]
    public async Task NativeBrowserDownloadIsOneUseAndRevocationBlocksUnclaimedDownloads()
    {
        using var factory = new SecurityWebApplicationFactory();
        var (client, source, _) = await Seed(factory, OrgRole.Owner); using var authenticated = client;
        var path = $"/api/organizations/{source.Id}/data-transfer/export-download";
        var request = new ArchiveExportRequest(Password, true, ArchiveTestZip.Password, ["contacts"]);
        var prepared = await client.PostAsJsonAsync(path, request);
        prepared.StatusCode.Should().Be(HttpStatusCode.OK);
        var ticket = await prepared.Content.ReadFromJsonAsync<ArchiveDownloadTicket>();
        using var nativeBrowser = factory.CreateClient();
        var downloadPath = "/api/data-transfer/download?ticket=" + ticket!.DownloadToken;
        var response = await nativeBrowser.GetAsync(downloadPath);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Headers.CacheControl!.NoStore.Should().BeTrue();
        var bytes = await response.Content.ReadAsByteArrayAsync();
        using (var zip = new ICSharpCode.SharpZipLib.Zip.ZipFile(new MemoryStream(bytes)))
            zip.Cast<ICSharpCode.SharpZipLib.Zip.ZipEntry>().Should().OnlyContain(entry => entry.IsCrypted && entry.AESKeySize == 256);
        (await nativeBrowser.GetAsync(downloadPath)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        var second = await client.PostAsJsonAsync(path, request);
        var revoked = await second.Content.ReadFromJsonAsync<ArchiveDownloadTicket>();
        using (var scope = factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var member = await db.UserOrganizations.SingleAsync(m => m.OrganizationId == source.Id);
            member.Role = OrgRole.Member; await db.SaveChangesAsync();
        }
        (await nativeBrowser.GetAsync("/api/data-transfer/download?ticket=" + revoked!.DownloadToken)).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ArchiveRateLimitIsPerAuthenticatedAccountNotSharedAcrossTheSameIp()
    {
        using var factory = new SecurityWebApplicationFactory();
        var (client, source, _) = await Seed(factory, OrgRole.Owner); using var authenticated = client;
        var path = $"/api/organizations/{source.Id}/data-transfer/capabilities";
        for (var i = 0; i < 12; i++) (await client.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await client.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = new User { Email = "second-archive@test.local", PasswordHash = [1], PasswordSalt = [1] };
        db.AddRange(user, new UserOrganization { UserId = user.Id, OrganizationId = source.Id, Role = OrgRole.Owner });
        await db.SaveChangesAsync();
        using var second = factory.CreateClient();
        var jwt = scope.ServiceProvider.GetRequiredService<IJwtTokenService>().CreateToken(user.Id, user.Email, user.SystemRole, user.SecurityStamp);
        second.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        (await second.GetAsync(path)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task MultipartReviewAndPasswordConfirmedImportRoundTripWorksAndCannotReplayOrOverwrite()
    {
        using var factory = new SecurityWebApplicationFactory();
        var (client, source, target) = await Seed(factory, OrgRole.Owner); using var authenticated = client;
        var sourcePath = $"/api/organizations/{source.Id}/data-transfer";
        var targetPath = $"/api/organizations/{target.Id}/data-transfer";
        (await client.PostAsJsonAsync(sourcePath + "/export", new ArchiveExportRequest("wrong", true))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var exported = await client.PostAsJsonAsync(sourcePath + "/export", new ArchiveExportRequest(Password, true, ArchiveTestZip.Password));
        exported.StatusCode.Should().Be(HttpStatusCode.OK);
        var bytes = await exported.Content.ReadAsByteArrayAsync();
        using var reviewForm = Form(bytes);
        var response = await client.PostAsync(targetPath + "/preview", reviewForm);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        response.Headers.CacheControl!.NoStore.Should().BeTrue();
        var preview = await response.Content.ReadFromJsonAsync<ArchivePreview>();
        preview!.Counts["contacts"].Should().Be(1);
        using var wrongForm = Form(bytes, preview, "wrong");
        (await client.PostAsync(targetPath + "/import", wrongForm)).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        using var importForm = Form(bytes, preview);
        var imported = await client.PostAsync(targetPath + "/import", importForm);
        imported.StatusCode.Should().Be(HttpStatusCode.OK, await imported.Content.ReadAsStringAsync());
        using var repeatForm = Form(bytes, preview);
        (await client.PostAsync(targetPath + "/import", repeatForm)).StatusCode.Should().Be(HttpStatusCode.Conflict);
        using var scope = factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Contacts.IgnoreQueryFilters().SingleAsync(c => c.OrganizationId == target.Id)).Name.Should().Be("Restored contact");
        (await db.AuditEvents.AnyAsync(e => e.EventType == "organization_archive_exported")).Should().BeTrue();
        (await db.AuditEvents.AnyAsync(e => e.EventType == "organization_archive_imported")).Should().BeTrue();
    }
}
