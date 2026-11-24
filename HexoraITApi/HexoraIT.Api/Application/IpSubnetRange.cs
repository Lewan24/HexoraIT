using System.Buffers.Binary;
using System.Net;
using System.Net.Sockets;

namespace HexoraITApi.Application;

/// <summary>A canonical IPv4/IPv6 range; host bits in submitted CIDR notation are masked.</summary>
public sealed record IpSubnetRange(byte[] Network, int PrefixLength)
{
    public bool Contains(IPAddress address)
    {
        var bytes = Normalize(address).GetAddressBytes();
        if (bytes.Length != Network.Length) return false;
        for (var i = 0; i < bytes.Length; i++)
        {
            var bits = Math.Clamp(PrefixLength - i * 8, 0, 8);
            var mask = (byte)(0xff << (8 - bits));
            if ((bytes[i] & mask) != Network[i]) return false;
        }
        return true;
    }
    public bool ContainsHost(IPAddress address)
    {
        if (!Contains(address)) return false;
        if (Network.Length != 4 || PrefixLength >= 31) return true;
        var network = BinaryPrimitives.ReadUInt32BigEndian(Network);
        var value = BinaryPrimitives.ReadUInt32BigEndian(Normalize(address).GetAddressBytes());
        var broadcast = network | (uint.MaxValue >> PrefixLength);
        return value > network && value < broadcast;
    }

    public static IPAddress Normalize(IPAddress address) => address.IsIPv4MappedToIPv6 ? address.MapToIPv4() : address;
    public static bool TryAddress(string? value, out IPAddress address)
    {
        address = IPAddress.None;
        if (string.IsNullOrWhiteSpace(value) || !IPAddress.TryParse(value.Trim(), out var parsed) || parsed.ScopeIdOrZero() != 0) return false;
        if (parsed.AddressFamily == AddressFamily.InterNetwork)
        {
            var octets = value.Trim().Split('.');
            if (octets.Length != 4 || octets.Any(octet => octet.Length == 0 || (octet.Length > 1 && octet[0] == '0') || octet.Any(c => c is < '0' or > '9'))) return false;
        }
        address = Normalize(parsed);
        return true;
    }
    public static bool TryDhcpRange(string cidr, string? start, string? end, out string? first, out string? last)
    {
        first = last = null;
        if (string.IsNullOrWhiteSpace(start) && string.IsNullOrWhiteSpace(end)) return true;
        if (!TryParse(cidr, out var range) || !TryAddress(start, out var startAddress) || !TryAddress(end, out var endAddress) ||
            !range.ContainsHost(startAddress) || !range.ContainsHost(endAddress)) return false;
        var startBytes = startAddress.GetAddressBytes();
        var endBytes = endAddress.GetAddressBytes();
        if (startBytes.AsSpan().SequenceCompareTo(endBytes) > 0) return false;
        first = startAddress.ToString();
        last = endAddress.ToString();
        return true;
    }

    public static bool TryParse(string cidr, out IpSubnetRange range)
    {
        range = null!;
        var parts = cidr.Split('/');
        if (parts.Length != 2 || !TryAddress(parts[0], out var address) || !int.TryParse(parts[1], out var prefix)) return false;
        var bytes = address.GetAddressBytes();
        if (prefix < 0 || prefix > bytes.Length * 8) return false;
        for (var i = 0; i < bytes.Length; i++) bytes[i] &= (byte)(0xff << (8 - Math.Clamp(prefix - i * 8, 0, 8)));
        range = new(bytes, prefix);
        return true;
    }
}

internal static class AddressScope
{
    public static long ScopeIdOrZero(this IPAddress address) => address.AddressFamily == AddressFamily.InterNetworkV6 ? address.ScopeId : 0;
}
