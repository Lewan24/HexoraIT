using System.IO.Compression;
using ICSharpCode.SharpZipLib.Zip;

namespace HexoraIT.Tests;

internal static class ArchiveTestZip
{
    public const string Password = "Archive test passphrase #2026!";
    public static MemoryStream Decrypt(byte[] bytes)
    {
        using var input = new MemoryStream(bytes);
        using var zip = new ICSharpCode.SharpZipLib.Zip.ZipFile(input) { Password = Password };
        var output = new MemoryStream();
        using (var plain = new ZipArchive(output, ZipArchiveMode.Create, true))
            foreach (ZipEntry entry in zip)
            {
                using var source = zip.GetInputStream(entry);
                using var target = plain.CreateEntry(entry.Name).Open();
                source.CopyTo(target);
            }
        output.Position = 0;
        return output;
    }
}
