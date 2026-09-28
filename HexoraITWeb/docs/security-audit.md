# Security audit deployment and investigation

The API migration `AddSecurityAudit` creates `AuditEvents` with indexes for time, client IP, actor/target account, attempted login account, session and request IDs. Existing startup migration handling applies it when the updated API starts. Deploy the API and frontend together. No database migration has been run against your live database by this change.

## What is collected

Every request reaching the API is persisted, including successful reads/writes, HTTP errors, API 404 paths, redirects (destination path without query), authentication/authorization rejections, rate limits and server errors. Existing explicit hooks add account changes and sensitive resource access; failed logins include the normalized attempted account and a target user ID when the account exists. The actor ID is only taken from a validated identity. JWT session IDs allow correlation without saving bearer tokens. Direct peer and resolved client IPs are stored separately.

Browser navigation and initial unknown frontend paths are submitted as explicitly **unverified client reports**. The server supplies their identity, timestamp and IP; clients cannot declare a successful login or impersonate an actor through telemetry. Reports are size limited and rate limited. A request can have several related events; use the trace ID to group them. The HTTP status on a browser report is its submission status, not a claim about a server 404.

A small set of known probe paths is marked `possible_path_probe`. These are investigation hints, not proof of an attack or a vulnerability scanner. Requests rejected before reaching ASP.NET (CDN/WAF/TLS/nginx/Kestrel parsing failures), nginx static-file 404s, and browser visits with JavaScript disabled require infrastructure access/security logs. Correlate those with the API audit. Detection does not establish that an account was compromised.

No request or response bodies, credentials, bearer tokens, cookies, arbitrary headers, query strings, fragments, document contents or stack traces are stored in the audit table. Account identifiers, IPs, resource IDs, paths and bounded user-agent strings are retained for investigation. Treat the database and backups as sensitive. Avoid putting secrets in URL path segments; paths are recorded.

## Docker / reverse proxy IPs

Forwarded headers are disabled when no trusted proxy is configured. Never clear the trust lists to trust the whole internet. Configure the immediate proxy address, or a dedicated network that contains only trusted proxies:

```yaml
# Add under the api service's environment in your compose deployment.
ReverseProxy__KnownProxies__0: "172.30.40.2" # replace with your proxy's stable container IP
ReverseProxy__ForwardLimit: "1"
# Alternatively, only for an isolated proxy network:
# ReverseProxy__KnownNetworks__0: "172.30.40.0/29"
# Audit__RetentionDays: "90" # optional; default 0 retains all records
```

Reserve the proxy's IP in Docker IPAM or configure your actual ingress subnet. Do not trust the entire default bridge if untrusted containers can join it. For multiple trusted proxy hops, list each proxy/network and set `ForwardLimit` to the actual hop count (1–10). IPv4-mapped IPv6 client addresses are normalized for exact IP searches.

At the **internet-facing** nginx proxy, overwrite incoming client-supplied forwarding headers:

```nginx
location /api/ {
    proxy_pass http://api:8080;
    client_max_body_size 21m; # includes multipart overhead for 20 MB contract documents
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

For an additional internal proxy hop, append with `$proxy_add_x_forwarded_for` only after the public edge has sanitized it. Preserve the original HTTPS scheme through trusted hops. Terminate TLS at the edge, restrict direct API exposure, and configure allowed hostnames for your deployment. The browser's configured API URL must point through this proxy. The frontend image's nginx currently serves static assets; this example belongs to your ingress/API proxy.

Check with a request through your proxy: the audit row's `Client IP` must be the requester and `Proxy IP` the immediate proxy. A direct request with a forged `X-Forwarded-For` header must retain its actual socket IP. Tests cover trusted, untrusted and multi-hop behavior, but deployment-specific proxy/container IPs must match your infrastructure.

Reference: [ASP.NET Core forwarded headers configuration](https://learn.microsoft.com/en-us/aspnet/core/host-and-deploy/proxy-load-balancer?view=aspnetcore-10.0).

## Investigating

Administration → Security audit offers exact IP, actor/target user ID, attempted login account, event type, session ID, request trace, HTTP status, severity, path substring, and date-range filters. Dates entered in the UI use the browser's local time and are converted to UTC. Results are paginated, newest first. Open an event to inspect details or pivot to the same IP, user or session. API access requires the current, validated system Admin role; organization membership alone does not grant access.

The API exposes only reads for saved events. Audit records have no cascading foreign keys, so deleting an account or resource cannot delete its evidence. A database administrator can still alter rows; this is not a tamper-proof archive. Use restricted DB credentials, backups, and external immutable log storage if required.

Writes use an independent database scope and a five-second timeout, including when clients disconnect or the business operation fails. If persistence fails, the API emits `AUDIT_PERSISTENCE_FAILED` and structured fallback events to application logs without changing the business response. Monitor that error: logs cannot be guaranteed in the database during a database outage. High request volumes increase table/write volume; provision and monitor database capacity.

Retention is opt-in: `Audit:RetentionDays=0` (default) keeps all evidence. A positive setting removes up to 10,000 expired records every six hours. Choose a retention period appropriate for your organization, archive first when necessary, and monitor the backlog on busy installations.
