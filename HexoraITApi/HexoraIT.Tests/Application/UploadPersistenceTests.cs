using FluentAssertions;
using HexoraIT.Tests.Fakes;
using HexoraITApi.Application;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexoraIT.Tests.Application;

public sealed class UploadPersistenceTests
{
    [Theory]
    [InlineData("contracts")]
    [InlineData("warranties")]
    [InlineData("files")]
    public async Task FailedMetadataWrite_RemovesNewBlobAndPreservesExistingDocument(string module)
    {
        using var fixture = new TestFixture();
        var (_, organization) = fixture.SeedUserWithOrg();
        var storage = new FakeFileStorage();
        var original = "%PDF-1.7\noriginal"u8.ToArray();
        var oldPath = await storage.SaveAsync(new MemoryStream(original), "original.pdf", "application/pdf");
        var contract = new Contract { OrganizationId = organization.Id, Name = "Contract", DocumentBlobPath = oldPath, DocumentName = "original.pdf" };
        var warranty = new WarrantyItem { OrganizationId = organization.Id, Name = "Warranty", DocumentBlobPath = oldPath, DocumentName = "original.pdf" };
        fixture.Db.AddRange(contract, warranty);
        await fixture.Db.SaveChangesAsync();
        // A database-side failure exercises the real SaveChanges transaction and blob compensation.
        var sql = module switch
        {
            "contracts" => "CREATE TRIGGER reject_write BEFORE UPDATE ON Contracts BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
            "warranties" => "CREATE TRIGGER reject_write BEFORE UPDATE ON WarrantyItems BEGIN SELECT RAISE(ABORT, 'test failure'); END;",
            _ => "CREATE TRIGGER reject_write BEFORE INSERT ON StoredFiles BEGIN SELECT RAISE(ABORT, 'test failure'); END;"
        };
        await fixture.Db.Database.ExecuteSqlRawAsync(sql);
        await using var stream = new MemoryStream("%PDF-1.7\nreplacement"u8.ToArray());
        var file = new FormFile(stream, 0, stream.Length, "file", "replacement.pdf") { Headers = new HeaderDictionary(), ContentType = "application/pdf" };
        Func<Task> upload = async () =>
        {
            if (module == "contracts")
                await new ContractService(fixture.Db, fixture.Mapper, fixture.UserContext, storage, NullLogger<ContractService>.Instance).UploadDocumentAsync(contract.Id, file);
            else if (module == "warranties")
                await new WarrantyService(fixture.Db, fixture.Mapper, fixture.UserContext, storage, NullLogger<WarrantyService>.Instance).UploadDocumentAsync(warranty.Id, file);
            else
                await new FileExplorerService(fixture.Db, fixture.Mapper, fixture.UserContext, storage, NullLogger<FileExplorerService>.Instance).UploadAsync(organization.Id, null, file);
        };
        await upload.Should().ThrowAsync<DbUpdateException>();
        fixture.Db.ChangeTracker.Clear();
        (await fixture.Db.Contracts.SingleAsync()).DocumentBlobPath.Should().Be(oldPath);
        (await fixture.Db.WarrantyItems.SingleAsync()).DocumentBlobPath.Should().Be(oldPath);
        (await fixture.Db.StoredFiles.CountAsync()).Should().Be(0);
        storage.Paths.Should().Equal(oldPath);
        await using var saved = await storage.OpenAsync(oldPath);
        using var downloaded = new MemoryStream();
        await saved.CopyToAsync(downloaded);
        downloaded.ToArray().Should().Equal(original);
    }
}
