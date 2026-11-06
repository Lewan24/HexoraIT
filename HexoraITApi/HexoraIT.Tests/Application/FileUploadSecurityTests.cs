using FluentAssertions;
using HexoraITApi.Application;
using Microsoft.AspNetCore.Http;

namespace HexoraIT.Tests.Application;

public sealed class FileUploadSecurityTests
{
    [Fact]
    public async Task PdfWithMatchingSignature_IsAcceptedAndClientMimeIsIgnored()
    {
        var file = FormFile("%PDF-1.7\ncontent"u8.ToArray(), @"C:\fakepath\manual.pdf", "text/html");

        var result = await FileUploadSecurity.ValidateAsync(file, 1_000_000);

        result.FileName.Should().Be("manual.pdf");
        result.ContentType.Should().Be("application/pdf");
        FileUploadSecurity.CanRenderInline(result.FileName, result.ContentType).Should().BeTrue();
    }

    [Fact]
    public async Task PdfExtensionWithDifferentContent_IsRejected()
    {
        var file = FormFile("not a pdf"u8.ToArray(), "manual.pdf", "application/pdf");

        var action = () => FileUploadSecurity.ValidateAsync(file, 1_000_000);

        await action.Should().ThrowAsync<InvalidDataException>()
            .WithMessage("*does not match*");
    }

    [Fact]
    public async Task ActiveOrUnknownContent_IsStoredAsDownloadOnlyBinary()
    {
        var file = FormFile("<script>alert(1)</script>"u8.ToArray(), "payload.html", "text/html");

        var result = await FileUploadSecurity.ValidateAsync(file, 1_000_000);

        result.ContentType.Should().Be("application/octet-stream");
        FileUploadSecurity.CanRenderInline(result.FileName, result.ContentType).Should().BeFalse();
    }

    [Theory]
    [InlineData("../secret.txt")]
    [InlineData("folder\\secret.txt")]
    public void SubmittedPath_IsReducedToFileName(string submittedName)
    {
        FileUploadSecurity.NormalizeFileName(submittedName).Should().Be("secret.txt");
    }

    [Fact]
    public void InvalidResponseFileName_FallsBackToNeutralName()
    {
        FileUploadSecurity.SafeDownloadName("bad\0name.txt").Should().Be("download");
    }

    [Theory]
    [InlineData(1_073_741_824L)]
    [InlineData(2_147_483_648L)]
    public async Task GigabyteFilesAreValidatedWithoutReadingWholeStream(long length)
    {
        // Sparse backing file exercises real stream lengths without allocating gigabytes of RAM.
        var path = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString("N"));
        try
        {
            await using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.ReadWrite, FileShare.None);
            stream.SetLength(length);
            await stream.WriteAsync("PK\u0003\u0004"u8.ToArray());
            stream.Position = 0;
            var file = new FormFile(stream, 0, length, "file", "wordpress.zip") { Headers = new HeaderDictionary(), ContentType = "text/html" };
            var validated = await FileUploadSecurity.ValidateAsync(file, FileUploadSecurity.MaxFileBytes);
            validated.ContentType.Should().Be("application/octet-stream");
            stream.Position.Should().BeLessThan(100);
        }
        finally { System.IO.File.Delete(path); }
    }

    [Fact]
    public async Task FileAboveTwoGiBIsRejectedBeforeReading()
    {
        using var stream = new MemoryStream([1]);
        var file = new FormFile(stream, 0, FileUploadSecurity.MaxFileBytes + 1, "file", "large.zip");
        Func<Task> action = () => FileUploadSecurity.ValidateAsync(file, FileUploadSecurity.MaxFileBytes);
        await action.Should().ThrowAsync<InvalidDataException>().WithMessage("*limit*");
        stream.Position.Should().Be(0);
    }

    private static FormFile FormFile(byte[] content, string name, string contentType)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, stream.Length, "file", name)
        {
            Headers = new HeaderDictionary(),
            ContentType = contentType
        };
    }
}
