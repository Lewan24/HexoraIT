using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Api.Interfaces;
using Microsoft.EntityFrameworkCore;
using HexoraITApi.Application;
using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexoraIT.Tests.Application;

public sealed class FileExplorerServiceTests : IDisposable
{
    private readonly TestFixture _fixture = new();
    private FileExplorerService Service() => new(_fixture.Db, _fixture.Mapper, _fixture.UserContext, _fixture.Storage, NullLogger<FileExplorerService>.Instance);

    [Fact]
    public async Task FolderAndFileOperations_PreserveHierarchyAndContentContracts()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var parent = (await service.CreateFolderAsync(organization.Id, new("Parent", null))).Value.Should().BeOfType<FileFolderDto>().Subject;
        var child = (await service.CreateFolderAsync(organization.Id, new("Child", parent.Id))).Value.Should().BeOfType<FileFolderDto>().Subject;
        await using var content = new MemoryStream("%PDF-1.7\ndocument"u8.ToArray());
        var stored = (await service.UploadAsync(organization.Id, child.Id, File(content, "file.pdf", "application/pdf"))).Value.Should().BeOfType<StoredFileDto>().Subject;

        (await service.RenameFolderAsync(child.Id, new("Renamed"))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.MoveFileAsync(stored.Id, new(parent.Id))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        (await service.RenameFileAsync(stored.Id, new("renamed.pdf"))).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        var download = (await service.GetContentAsync(stored.Id, true)).Value.Should().BeOfType<DocumentDownload>().Subject;
        download.FileName.Should().Be("renamed.pdf");
        download.Inline.Should().BeFalse();
        (await service.GetFilesAsync(organization.Id, parent.Id, null)).Value.Should().BeOfType<List<StoredFileDto>>().Subject.Should().ContainSingle(item => item.Id == stored.Id);
    }

    [Fact]
    public async Task MoveFolder_RejectsSelfAndDescendantCycles()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var parent = (await service.CreateFolderAsync(organization.Id, new("Parent", null))).Value.Should().BeOfType<FileFolderDto>().Subject;
        var child = (await service.CreateFolderAsync(organization.Id, new("Child", parent.Id))).Value.Should().BeOfType<FileFolderDto>().Subject;

        (await service.MoveFolderAsync(parent.Id, new(parent.Id))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await service.MoveFolderAsync(parent.Id, new(child.Id))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
    }

    [Fact]
    public async Task Upload_RejectsMismatchedSignatureAndForeignFolder()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var other = new Organization { Name = "Other" };
        var foreignFolder = new FileFolder { OrganizationId = other.Id, Name = "Foreign" };
        _fixture.Db.AddRange(other, foreignFolder); await _fixture.Db.SaveChangesAsync();
        var service = Service();
        await using var invalidContent = new MemoryStream("not a pdf"u8.ToArray());
        await using var validContent = new MemoryStream("%PDF-1.7\nvalid"u8.ToArray());

        (await service.UploadAsync(organization.Id, null, File(invalidContent, "bad.pdf", "application/pdf"))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        (await service.UploadAsync(organization.Id, foreignFolder.Id, File(validContent, "good.pdf", "application/pdf"))).StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        _fixture.Db.StoredFiles.Should().BeEmpty();
    }

    [Fact]
    public async Task DeleteFolder_RemovesDescendantsAndFileMetadata()
    {
        var (_, organization) = _fixture.SeedUserWithOrg();
        var service = Service();
        var parent = (await service.CreateFolderAsync(organization.Id, new("Parent", null))).Value.Should().BeOfType<FileFolderDto>().Subject;
        var child = (await service.CreateFolderAsync(organization.Id, new("Child", parent.Id))).Value.Should().BeOfType<FileFolderDto>().Subject;
        await using var content = new MemoryStream("%PDF-1.7\ndocument"u8.ToArray());
        await service.UploadAsync(organization.Id, child.Id, File(content, "file.pdf", "application/pdf"));

        (await service.DeleteFolderAsync(parent.Id)).StatusCode.Should().Be(StatusCodes.Status204NoContent);
        _fixture.Db.FileFolders.Should().BeEmpty();
        _fixture.Db.StoredFiles.Should().BeEmpty();
    }

    [Fact]
    public async Task Replace_PreservesIdentityFolderAndPermissionsAndDeletesOldBlob()
    {
        var (_, org) = _fixture.SeedUserWithOrg();
        var service = Service();
        var folder = (FileFolderDto)(await service.CreateFolderAsync(org.Id, new("Docs", null))).Value!;
        using var original = new MemoryStream("original"u8.ToArray());
        var stored = (StoredFileDto)(await service.UploadAsync(org.Id, folder.Id, File(original, "old.txt", "text/plain"))).Value!;
        var previousPath = (await _fixture.Db.StoredFiles.SingleAsync()).BlobPath;
        using var replacement = new MemoryStream("replacement"u8.ToArray());
        var result = await service.ReplaceAsync(stored.Id, File(replacement, "new.txt", "text/html"));
        var updated = result.Value.Should().BeOfType<StoredFileDto>().Subject;
        updated.Id.Should().Be(stored.Id);
        updated.FolderId.Should().Be(folder.Id);
        updated.Name.Should().Be("new.txt");
        updated.MimeType.Should().Be("text/plain");
        var storage = (FakeFileStorage)_fixture.Storage;
        storage.Paths.Should().NotContain(previousPath).And.HaveCount(1);
        var download = (DocumentDownload)(await service.GetContentAsync(stored.Id, true)).Value!;
        using var reader = new StreamReader(download.Content);
        (await reader.ReadToEndAsync()).Should().Be("replacement");
    }

    [Fact]
    public async Task Replace_ReadOnlyAndForeignUsersCannotChangeContent()
    {
        var (owner, org) = _fixture.SeedUserWithOrg();
        var service = Service();
        using var original = new MemoryStream("original"u8.ToArray());
        var stored = (StoredFileDto)(await service.UploadAsync(org.Id, null, File(original, "old.txt", "text/plain"))).Value!;
        var (other, _) = _fixture.SeedUserWithOrg();
        using var replacement = new MemoryStream("replacement"u8.ToArray());
        (await service.ReplaceAsync(stored.Id, File(replacement, "new.txt", "text/plain"))).StatusCode.Should().Be(404);
        _fixture.Db.UserOrganizations.Add(new UserOrganization { OrganizationId = org.Id, UserId = other.Id, Role = OrgRole.ReadOnly });
        await _fixture.Db.SaveChangesAsync();
        (await service.ReplaceAsync(stored.Id, File(replacement, "new.txt", "text/plain"))).StatusCode.Should().Be(403);
        _fixture.ActAs(owner.Id);
        (await _fixture.Db.StoredFiles.SingleAsync()).Name.Should().Be("old.txt");
        ((FakeFileStorage)_fixture.Storage).Paths.Should().HaveCount(1);
    }

    [Fact]
    public async Task Replace_DatabaseFailurePreservesOldContentAndCleansNewBlob()
    {
        var (_, org) = _fixture.SeedUserWithOrg();
        var service = Service();
        using var original = new MemoryStream("original"u8.ToArray());
        var stored = (StoredFileDto)(await service.UploadAsync(org.Id, null, File(original, "old.txt", "text/plain"))).Value!;
        var previousPath = (await _fixture.Db.StoredFiles.SingleAsync()).BlobPath;
        await _fixture.Db.Database.ExecuteSqlRawAsync("CREATE TRIGGER reject_replacement BEFORE UPDATE ON StoredFiles BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
        using var replacement = new MemoryStream("replacement"u8.ToArray());
        Func<Task> action = () => service.ReplaceAsync(stored.Id, File(replacement, "new.txt", "text/plain"));
        await action.Should().ThrowAsync<DbUpdateException>();
        _fixture.Db.ChangeTracker.Clear();
        (await _fixture.Db.StoredFiles.SingleAsync()).BlobPath.Should().Be(previousPath);
        ((FakeFileStorage)_fixture.Storage).Paths.Should().Equal(previousPath);
    }

    [Fact]
    public async Task Replace_InvalidSignatureDoesNotRemoveOldContent()
    {
        var (_, org) = _fixture.SeedUserWithOrg();
        using var original = new MemoryStream("original"u8.ToArray());
        var stored = (StoredFileDto)(await Service().UploadAsync(org.Id, null, File(original, "old.txt", "text/plain"))).Value!;
        using var invalid = new MemoryStream("invalid pdf"u8.ToArray());
        (await Service().ReplaceAsync(stored.Id, File(invalid, "new.pdf", "application/pdf"))).StatusCode.Should().Be(400);
        ((FakeFileStorage)_fixture.Storage).Paths.Should().HaveCount(1);
        (await _fixture.Db.StoredFiles.SingleAsync()).Name.Should().Be("old.txt");
    }

    [Fact]
    public async Task Replace_ConcurrentUpdateReturnsConflictAndPreservesWinningContent()
    {
        var (_, org) = _fixture.SeedUserWithOrg();
        using var original = new MemoryStream("original"u8.ToArray());
        var stored = (StoredFileDto)(await Service().UploadAsync(org.Id, null, File(original, "old.txt", "text/plain"))).Value!;
        var previousPath = (await _fixture.Db.StoredFiles.SingleAsync()).BlobPath;
        using var winnerContent = new MemoryStream("winner"u8.ToArray());
        var winningPath = await _fixture.Storage.SaveAsync(winnerContent, "winner.txt", "text/plain");
        var storage = new ConcurrentStorage(_fixture.Storage, async () =>
        {
            await _fixture.Db.Database.ExecuteSqlInterpolatedAsync($"UPDATE StoredFiles SET BlobPath = {winningPath}, Name = 'winner.txt' WHERE Id = {stored.Id}");
            await _fixture.Storage.DeleteAsync(previousPath);
        });
        var service = new FileExplorerService(_fixture.Db, _fixture.Mapper, _fixture.UserContext, storage, NullLogger<FileExplorerService>.Instance);
        using var replacement = new MemoryStream("loser"u8.ToArray());
        (await service.ReplaceAsync(stored.Id, File(replacement, "loser.txt", "text/plain"))).StatusCode.Should().Be(409);
        _fixture.Db.ChangeTracker.Clear();
        (await _fixture.Db.StoredFiles.SingleAsync()).Name.Should().Be("winner.txt");
        ((FakeFileStorage)_fixture.Storage).Paths.Should().Equal(winningPath);
    }

    private sealed class ConcurrentStorage(IFileStorage inner, Func<Task> concurrentUpdate) : IFileStorage
    {
        public async Task<string> SaveAsync(Stream content, string fileName, string contentType)
        {
            var path = await inner.SaveAsync(content, fileName, contentType);
            await concurrentUpdate();
            return path;
        }
        public Task<Stream> OpenAsync(string path) => inner.OpenAsync(path);
        public Task DeleteAsync(string path) => inner.DeleteAsync(path);
    }

    public void Dispose() => _fixture.Dispose();
    private static FormFile File(Stream content, string name, string type) => new(content, 0, content.Length, "file", name) { Headers = new HeaderDictionary(), ContentType = type };
}
