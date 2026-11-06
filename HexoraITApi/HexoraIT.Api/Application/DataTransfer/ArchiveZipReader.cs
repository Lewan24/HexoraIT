using ICSharpCode.SharpZipLib.Zip;

namespace HexoraITApi.Application.DataTransfer;

internal sealed class ArchiveZipReader : IDisposable
{
    private readonly ZipFile zip;
    public IReadOnlyList<Entry> Entries { get; }
    public ArchiveZipReader(Stream input, string? password)
    {
        zip = new ZipFile(input, leaveOpen: true) { Password = password };
        try
        {
            Entries = zip.Cast<ZipEntry>().Select(entry => new Entry(zip, entry)).ToArray();
            if (Entries.Any(e => e.Encrypted) && string.IsNullOrEmpty(password))
                throw new ArchiveValidationException("Enter the archive password to unlock the ZIP.");
        }
        catch { zip.Close(); throw; }
    }
    public Entry? GetEntry(string name) => Entries.FirstOrDefault(e => e.FullName == name);
    public void Dispose() => zip.Close();
    internal sealed class Entry(ZipFile zip, ZipEntry entry)
    {
        public string FullName => entry.Name;
        public long Length => entry.Size;
        public int ExternalAttributes => entry.ExternalFileAttributes;
        public bool Encrypted => entry.IsCrypted;
        public Stream Open() => zip.GetInputStream(entry);
    }
}
