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
