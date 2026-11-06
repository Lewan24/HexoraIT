using FluentAssertions;
using HexoraITApi.Api.Interfaces;
using HexoraITApi.Application;
using HexoraITApi.Application.DataTransfer;
using HexoraITApi.Domain.Entities;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace HexoraIT.Tests.Application;

public sealed class LargeArchiveFactAttribute : FactAttribute
{
    public LargeArchiveFactAttribute()
    {
        if (Environment.GetEnvironmentVariable("HEXORA_ARCHIVE_LARGE_TEST") != "1") Skip = "Opt-in: writes and verifies a real archive larger than 4 GiB.";
    }
}

public sealed class LargeArchiveTests
{
    [LargeArchiveFact]
    public async Task AFileLargerThanFourGiBRoundTripsThroughEncryptedZip64WithBoundedBuffers()
    {
        using var fixture = new TestFixture();
        var (user, source) = fixture.SeedUserWithOrg();
        var hasher = new Pbkdf2PasswordHasher();
        const string password = "Account password for large test!";
        (user.PasswordHash, user.PasswordSalt) = hasher.Hash(password);
        var target = new Organization { Name = "Large restore" };
        const long length = 4L * 1024 * 1024 * 1024 + 1024;
        fixture.Db.AddRange(target, new UserOrganization { OrganizationId = target.Id, UserId = user.Id, Role = OrgRole.Owner },
            new StoredFile { OrganizationId = source.Id, Name = "security-analysis.bin", Size = length, BlobPath = "generated" });
        await fixture.Db.SaveChangesAsync();
        var storage = new GeneratedStorage(length);
        var service = new OrganizationArchiveService(fixture.Db, fixture.UserContext, hasher, fixture.Cipher, storage,
            new EphemeralDataProtectionProvider(), new SecurityAuditLogger(NullLoggerFactory.Instance, new HttpContextAccessor()),
            NullLogger<OrganizationArchiveService>.Instance);
        var result = await service.ExportAsync(source.Id, new(password, true, ArchiveTestZip.Password));
        result.StatusCode.Should().Be(200, "{0}", result.Value);
        await using var zip = ((ArchiveDownload)result.Value!).Content;
        zip.Length.Should().BeGreaterThan(uint.MaxValue);
        IFormFile Upload() => new FormFile(zip, 0, zip.Length, "file", "large.zip");
        var previewResult = await service.PreviewAsync(target.Id, Upload(), archivePassword: ArchiveTestZip.Password);
        previewResult.StatusCode.Should().Be(200, "{0}", previewResult.Value);
        var preview = (ArchivePreview)previewResult.Value!;
        preview.FileBytes.Should().Be(length);
        var imported = await service.ImportAsync(target.Id, Upload(), new(password, preview.ReviewToken, target.Name, true, ArchiveTestZip.Password));
        imported.StatusCode.Should().Be(200, "{0}", imported.Value);
        storage.Written.Should().Be(length);
        storage.Source!.LargestRead.Should().BeLessThanOrEqualTo(81920);
        (await fixture.Db.StoredFiles.SingleAsync(f => f.OrganizationId == target.Id)).Size.Should().Be(length);
    }

    private sealed class GeneratedStorage(long length) : IFileStorage
    {
        public GeneratedStream? Source { get; private set; }
        public long Written { get; private set; }
        public Task<Stream> OpenAsync(string path) => Task.FromResult<Stream>(Source = new GeneratedStream(length));
        public async Task<string> SaveAsync(Stream content, string fileName, string contentType)
        {
            var buffer = new byte[81920];
            int read;
            while ((read = await content.ReadAsync(buffer)) > 0)
            {
                buffer.AsSpan(0, read).IndexOfAnyExcept((byte)0x5a).Should().Be(-1);
                Written += read;
            }
            return "restored";
        }
        public Task DeleteAsync(string path) => Task.CompletedTask;
    }
    private sealed class GeneratedStream(long length) : Stream
    {
        public int LargestRead { get; private set; }
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => length;
        public override long Position { get; set; }
        public override int Read(byte[] buffer, int offset, int count)
        {
            LargestRead = Math.Max(LargestRead, count);
            var read = (int)Math.Min(count, length - Position);
            buffer.AsSpan(offset, read).Fill(0x5a); Position += read; return read;
        }
        public override ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken token = default)
        {
            token.ThrowIfCancellationRequested(); LargestRead = Math.Max(LargestRead, buffer.Length);
            var read = (int)Math.Min(buffer.Length, length - Position);
            buffer.Span[..read].Fill(0x5a); Position += read; return ValueTask.FromResult(read);
        }
        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
