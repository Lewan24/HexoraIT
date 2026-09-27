using FluentAssertions;
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

    public void Dispose() => _fixture.Dispose();
    private static FormFile File(Stream content, string name, string type) => new(content, 0, content.Length, "file", name) { Headers = new HeaderDictionary(), ContentType = type };
}
