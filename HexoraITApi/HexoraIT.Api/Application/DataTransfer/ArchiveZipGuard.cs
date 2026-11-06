using System.Buffers.Binary;

namespace HexoraITApi.Application.DataTransfer;

internal static class ArchiveZipGuard
{
    // Inspect the bounded central directory before ZipArchive allocates an entry object for every header.
    // ZIP64 is supported; multi-disk archives are not. Directory sizes remain bounded independently of file sizes.
    public static void Validate(Stream stream, CancellationToken token)
    {
        if (!stream.CanSeek || stream.Length < 22) throw new ArchiveValidationException("Invalid ZIP archive.");
        try
        {
            var tailLength = (int)Math.Min(stream.Length, 65557);
            stream.Position = stream.Length - tailLength;
            var tail = new byte[tailLength]; stream.ReadExactly(tail);
            var end = -1;
            for (var i = tail.Length - 22; i >= 0; i--)
                if (U32(tail.AsSpan(i)) == 0x06054b50 && i + 22 + U16(tail.AsSpan(i + 20)) == tail.Length) { end = i; break; }
            if (end < 0) throw new ArchiveValidationException("ZIP end record is missing.");
            var eocd = tail.AsSpan(end);
            ulong count = U16(eocd[10..]);
            ulong bytes = U32(eocd[12..]);
            ulong offset = U32(eocd[16..]);
            var directoryEnd = stream.Length - tailLength + end;
            if (count == ushort.MaxValue || bytes == uint.MaxValue || offset == uint.MaxValue)
            {
                if (directoryEnd < 20) throw new ArchiveValidationException("Missing ZIP64 locator.");
                stream.Position = directoryEnd - 20;
                Span<byte> locator = stackalloc byte[20]; stream.ReadExactly(locator);
                var zip64Offset = U64(locator[8..]);
                if (U32(locator) != 0x07064b50 || U32(locator[4..]) != 0 || U32(locator[16..]) != 1 || zip64Offset > (ulong)(directoryEnd - 76))
                    throw new ArchiveValidationException("Invalid ZIP64 locator.");
                stream.Position = (long)zip64Offset;
                Span<byte> zip64 = stackalloc byte[56]; stream.ReadExactly(zip64);
                var recordLength = U64(zip64[4..]);
                if (U32(zip64) != 0x06064b50 || recordLength < 44 || recordLength > 4096 ||
                    zip64Offset + 12 + recordLength != (ulong)(directoryEnd - 20) || U32(zip64[16..]) != 0 ||
                    U32(zip64[20..]) != 0 || U64(zip64[24..]) != U64(zip64[32..]))
                    throw new ArchiveValidationException("Invalid ZIP64 end record.");
                count = U64(zip64[32..]); bytes = U64(zip64[40..]); offset = U64(zip64[48..]);
                directoryEnd = (long)zip64Offset;
            }
            if (U16(eocd[4..]) != 0 || U16(eocd[6..]) != 0 ||
                (U16(eocd[8..]) != ushort.MaxValue && U16(eocd[8..]) != count) ||
                count is < 1 or > ArchiveSchema.MaxFiles + 1 || bytes > 8 * 1024 * 1024 ||
                offset > (ulong)directoryEnd || bytes != (ulong)directoryEnd - offset)
                throw new ArchiveValidationException("Unsupported ZIP directory or entry count.");
            stream.Position = (long)offset;
            Span<byte> header = stackalloc byte[46];
            for (ulong i = 0; i < count; i++)
            {
                token.ThrowIfCancellationRequested();
                stream.ReadExactly(header);
                if (U32(header) != 0x02014b50 || U16(header[34..]) != 0 ||
                    U16(header[28..]) is < 1 or > 160 || U16(header[30..]) > 4096 || U16(header[32..]) > 4096 ||
                    U32(header[42..]) >= offset)
                    throw new ArchiveValidationException("Invalid ZIP directory entry.");
                stream.Position += U16(header[28..]) + U16(header[30..]) + U16(header[32..]);
                if ((ulong)stream.Position > offset + bytes) throw new ArchiveValidationException("Invalid ZIP directory length.");
            }
            if ((ulong)stream.Position != offset + bytes) throw new ArchiveValidationException("ZIP entry count does not match the directory.");
        }
        catch (EndOfStreamException) { throw new ArchiveValidationException("Truncated ZIP directory."); }
        finally { stream.Position = 0; }
    }
    private static ushort U16(ReadOnlySpan<byte> bytes) => BinaryPrimitives.ReadUInt16LittleEndian(bytes);
    private static uint U32(ReadOnlySpan<byte> bytes) => BinaryPrimitives.ReadUInt32LittleEndian(bytes);
    private static ulong U64(ReadOnlySpan<byte> bytes) => BinaryPrimitives.ReadUInt64LittleEndian(bytes);
}
