using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace HexoraITApi.Application.DataTransfer;

// A one-use capability lets the browser save a response directly to disk without a JS Blob.
// It never contains an account password or encryption password. Existing stream leases bound disk usage.
public sealed class ArchiveDownloadStore : IDisposable
{
    public sealed record Ticket(ArchiveDownload Download, Guid UserId, Guid OrganizationId, Guid SecurityStamp, DateTime ExpiresAt);
    private readonly Dictionary<string, Ticket> tickets = [];
    private readonly object gate = new();
    private readonly Timer timer;
    public ArchiveDownloadStore() => timer = new Timer(_ => Expire(), null, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30));
    private static string Key(string token) => Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));
    public string Add(ArchiveDownload download, Guid user, Guid org, Guid stamp)
    {
        var token = WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
        lock (gate) tickets.Add(Key(token), new(download, user, org, stamp, DateTime.UtcNow.AddMinutes(10)));
        return token;
    }
    public Ticket? Take(string token)
    {
        if (token.Length != 43) return null;
        Ticket? ticket;
        lock (gate) tickets.Remove(Key(token), out ticket);
        if (ticket?.ExpiresAt <= DateTime.UtcNow) { ticket.Download.Content.Dispose(); return null; }
        return ticket;
    }
    private void Expire()
    {
        List<Ticket> expired;
        lock (gate)
        {
            var keys = tickets.Where(pair => pair.Value.ExpiresAt <= DateTime.UtcNow).Select(pair => pair.Key).ToList();
            expired = keys.Select(key => tickets[key]).ToList();
            foreach (var key in keys) tickets.Remove(key);
        }
        foreach (var ticket in expired) ticket.Download.Content.Dispose();
    }
    public void Dispose()
    {
        timer.Dispose();
        lock (gate) { foreach (var ticket in tickets.Values) ticket.Download.Content.Dispose(); tickets.Clear(); }
    }
}
