using HexoraITApi.Domain.Dtos;
using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application;

/// <summary>Updates only automatically managed entries; all user-managed rows are immutable to this operation.</summary>
public sealed class NetworkAssetSyncService(AppDbContext db, ICurrentUserContext user)
{
    private sealed record Plan(Asset Asset, Subnet Target, string Address, IPEntry? Existing);

    public async Task<ApiOperationResult> SyncAsync(Guid organizationId, CancellationToken token = default)
    {
        if (!await user.HasAccessAsync(organizationId) || !await user.HasPermissionAsync(organizationId, "assets") || !await user.HasPermissionAsync(organizationId, "networks")) return new(403);
        var subnets = await db.Subnets.Where(subnet => subnet.OrganizationId == organizationId).Include(subnet => subnet.Ips).ToListAsync(token);
        var writable = await user.GetWritableResourceIdsAsync(organizationId, "networks", subnets.Select(subnet => subnet.Id).ToList(), token);
        if (writable.Count == 0) return new(403);
        var assets = await db.Assets.AsNoTracking().Where(asset => asset.OrganizationId == organizationId).ToListAsync(token);
        var issues = new List<NetworkSyncIssueDto>(); var issueCount = 0; var skipped = 0; var unchanged = 0;
        void Issue(Asset? asset, string name, string ip, string reason)
        {
            issueCount++;
            if (issues.Count < 50) issues.Add(new(asset?.Id, name, ip, reason));
        }
        var ranges = new List<(Subnet Subnet, IpSubnetRange Range)>();
        foreach (var subnet in subnets)
        {
            if (IpSubnetRange.TryParse(subnet.Cidr, out var range)) ranges.Add((subnet, range));
            else Issue(null, subnet.Name, subnet.Cidr, "invalid-subnet");
        }
        var entries = subnets.SelectMany(subnet => subnet.Ips).ToList();
        var autoByAsset = entries.Where(entry => entry.IsAutoManaged && entry.AssetId.HasValue).ToDictionary(entry => entry.AssetId!.Value);
        var manualAssets = entries.Where(entry => !entry.IsAutoManaged && entry.AssetId.HasValue).Select(entry => entry.AssetId!.Value).ToHashSet();
        var plans = new List<Plan>();
        foreach (var asset in assets)
        {
            token.ThrowIfCancellationRequested();
            if (manualAssets.Contains(asset.Id)) { unchanged++; continue; }
            if (!IpSubnetRange.TryAddress(asset.Ip, out var address)) { skipped++; Issue(asset, asset.Name, asset.Ip, "invalid-address"); continue; }
            var matches = ranges.Where(candidate => candidate.Range.Contains(address)).OrderByDescending(candidate => candidate.Range.PrefixLength).ToList();
            if (matches.Count == 0) { skipped++; Issue(asset, asset.Name, asset.Ip, "no-subnet"); continue; }
            if (matches.Count > 1 && matches[0].Range.PrefixLength == matches[1].Range.PrefixLength) { skipped++; Issue(asset, asset.Name, asset.Ip, "ambiguous-subnet"); continue; }
            var target = matches[0].Subnet;
            autoByAsset.TryGetValue(asset.Id, out var existing);
            if (!writable.Contains(target.Id) || (existing is not null && !writable.Contains(existing.SubnetId))) { skipped++; Issue(asset, asset.Name, asset.Ip, "write-denied"); continue; }
            plans.Add(new(asset, target, address.ToString(), existing));
        }
        var rejected = new Dictionary<Guid, string>();
        foreach (var duplicate in plans.GroupBy(plan => (plan.Target.Id, plan.Address)).Where(group => group.Count() > 1))
            foreach (var plan in duplicate) rejected[plan.Asset.Id] = "duplicate-asset-address";
        var byAsset = plans.ToDictionary(plan => plan.Asset.Id);
        var occupied = entries.Where(entry => IpSubnetRange.TryAddress(entry.Ip, out _)).ToLookup(entry => (entry.SubnetId, Canonical(entry.Ip)));
        // An address swap is allowed only if every involved automatic row can actually move.
        bool changed;
        do
        {
            changed = false;
            foreach (var plan in plans.Where(plan => !rejected.ContainsKey(plan.Asset.Id)))
            {
                foreach (var entry in occupied[(plan.Target.Id, plan.Address)])
                {
                    if (entry.Id == plan.Existing?.Id) continue;
                    var willMove = entry.IsAutoManaged && entry.AssetId is { } id && byAsset.TryGetValue(id, out var other) && !rejected.ContainsKey(id) && (other.Target.Id != entry.SubnetId || other.Address != Canonical(entry.Ip));
                    if (willMove) continue;
                    rejected[plan.Asset.Id] = entry.IsAutoManaged ? "address-conflict" : "manual-address-conflict";
                    changed = true; break;
                }
            }
        } while (changed);
        var added = 0; var updated = 0; var touched = new HashSet<Guid>();
        foreach (var plan in plans)
        {
            if (rejected.TryGetValue(plan.Asset.Id, out var reason)) { skipped++; Issue(plan.Asset, plan.Asset.Name, plan.Asset.Ip, reason); continue; }
            if (plan.Existing is null)
            {
                db.IPEntries.Add(new IPEntry { SubnetId = plan.Target.Id, AssetId = plan.Asset.Id, Ip = plan.Address, Label = plan.Asset.Name, Status = IPEntryStatus.Used, IsAutoManaged = true });
                touched.Add(plan.Target.Id); added++;
            }
            else if (plan.Existing.SubnetId != plan.Target.Id || plan.Existing.Ip != plan.Address || plan.Existing.Label != plan.Asset.Name || plan.Existing.Status != IPEntryStatus.Used)
            {
                touched.Add(plan.Existing.SubnetId); touched.Add(plan.Target.Id);
                plan.Existing.SubnetId = plan.Target.Id; plan.Existing.Ip = plan.Address; plan.Existing.Label = plan.Asset.Name; plan.Existing.Status = IPEntryStatus.Used;
                updated++;
            }
            else unchanged++;
        }
        foreach (var subnet in subnets.Where(subnet => touched.Contains(subnet.Id))) subnet.SyncRevision++;
        try { await db.SaveChangesAsync(token); }
        catch (DbUpdateConcurrencyException) { return new(409, "Network entries changed during synchronization. Refresh and try again."); }
        catch (DbUpdateException) { return new(409, "The network update could not be saved. Refresh and try again."); }
        return new(200, new NetworkSyncResultDto(added, updated, unchanged, skipped, issueCount, issues));
    }
    private static string Canonical(string ip) => IpSubnetRange.TryAddress(ip, out var address) ? address.ToString() : ip;
}
