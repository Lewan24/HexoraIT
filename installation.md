# Docker Compose

The easiest way to run **HexoraIT** is using Docker Compose.

The provided `docker-compose.yml` starts:

| Service | Description |
|---------|-------------|
| **frontend** | React web application served by Nginx |
| **api** | ASP.NET Core Minimal API |
| **db** | PostgreSQL database *(optional if you already have PostgreSQL)* |
| **adminer** | Web database manager *(optional)* |

---

## Running

Before starting, copy `.env.example` to `.env` (ignored by Git) and edit it:

```dotenv
HEXORAIT_DB_PASSWORD=replace-with-a-strong-database-password
HEXORAIT_JWT_SIGNING_KEY=replace-with-at-least-32-random-bytes
HEXORAIT_PUBLIC_ORIGIN=https://it.example.com
HEXORAIT_NPM_IP=192.168.1.10
HEXORAIT_FRONTEND_BIND_IP=192.168.1.20
```

Start the application together with the bundled PostgreSQL and Adminer:

```bash
docker compose --profile database up -d --build
```

Without the `database` profile, configure `ConnectionStrings__Default` to point at an external PostgreSQL server before starting `api` and `frontend`.

Stop:

```bash
docker compose down
```

View logs:

```bash
docker compose logs -f
```

Rebuild images:

```bash
docker compose up --build
```

Do not commit `.env`. In production, prefer the deployment platform's secret store over a file.

---

# Services

## Frontend

Available at:

```
https://it.example.com
```

Environment variables:

| Variable | Description |
|----------|-------------|
| `HEXORAIT_API_BASE_URL` | Browser API base path (`/api` in Compose) |

Example:

```yaml
environment:
  HEXORAIT_API_BASE_URL: /api
```

---

## API

Available through `https://it.example.com/api`. The API port is not published on the host; frontend Nginx connects to `api:8080` over the backend Docker network.

### Database

| Variable | Description |
|----------|-------------|
| `ConnectionStrings__Default` | PostgreSQL connection string |

Example:

```text
Host=db;
Port=5432;
Database=HexoraITApp;
Username=HexoraIT;
Password=${HEXORAIT_DB_PASSWORD};
```

If you're using an external PostgreSQL server simply replace `Host=db` with your server address.

---

### JWT

| Variable | Description |
|----------|-------------|
| `Jwt__Issuer` | JWT issuer |
| `Jwt__Audience` | JWT audience |
| `Jwt__SigningKey` | Secret key used to sign JWT tokens |

> Provide `HEXORAIT_JWT_SIGNING_KEY` through the deployment secret store. Use at least **32 bytes** of cryptographically random material and never commit the value.

### Trusted reverse proxy

Compose trusts exactly two addresses: the frontend (`172.30.50.3` by default)
and `HEXORAIT_NPM_IP`, the NPM source address **as seen by frontend Nginx**.
`appsettings.Production.json` sets `ReverseProxy:ForwardLimit` to 2; Compose also
sets it explicitly. Base/development settings retain a one-hop limit. Empty trust
lists disable forwarded headers, including in production outside Compose.

The frontend appends its peer address and HTTP scheme to the header chains.
ASP.NET Core walks both chains right to left, checks each proxy against the trust
list, and restores the browser's IP and HTTPS scheme. No client subnet or
catch-all network is trusted. The middleware already runs before HTTPS
redirection, rate limiting and authentication. Proxy addresses are read when the
forwarded-header options are configured, alongside the hop limit and networks.

---

### File storage

| Variable | Description |
|----------|-------------|
| `FileStorage__RootPath` | Directory where uploaded files are stored |
| `FileStorage__DataProtectionKeysPath` | Directory containing the persistent encryption key ring |

Example:

```yaml
FileStorage__RootPath: /app/storage
```

You can mount this directory as a Docker volume to persist uploaded files.

The Data Protection key directory must also be persistent, access-controlled and backed up. Losing it can make password-vault entries impossible to decrypt.

---

### Application settings

| Variable | Description |
|----------|-------------|
| `AppSettings__HexoraITAdmin` | Initial administrator email |
| `AppSettings__InitialAdminPassword` | One-time initial administrator password (minimum 15 characters) |
| `AppSettings__AllowRegister` | Enable/disable public registration |
| `AppSettings__AllowOrigins__0` | Allowed frontend origin (CORS) |
| `AppSettings__AllowOrigins__1` | Additional allowed origin |

Example:

```yaml
AppSettings__AllowRegister: false
AppSettings__AllowOrigins__0: https://it.example.com
```

When bootstrap email is set and the account does not exist, the one-time password is required. Remove it from runtime configuration immediately after the account is created and change the password after the first login. The application never prints this password to logs.

---

## PostgreSQL (optional)

If you already have PostgreSQL installed, you can remove the `db` service and update the API connection string accordingly.

Default non-secret identifiers:

| Setting | Value |
|---------|-------|
| Database | `HexoraITApp` |
| Username | `HexoraIT` |
| Port | `5432` |

Set the database password through `HEXORAIT_DB_PASSWORD`; there is no default password.

---

## Adminer (optional)

Adminer is available at:

```
http://localhost:8082
```

Login using:

- Server: `db`
- Username: `HexoraIT`
- Password: the value supplied through `HEXORAIT_DB_PASSWORD`
- Database: `HexoraITApp`

---

# Production

Before deploying:

- Generate and securely inject `HEXORAIT_JWT_SIGNING_KEY`
- Disable registration if required
- Configure correct CORS origins
- Use HTTPS
- Use strong PostgreSQL credentials
- Mount persistent Docker volumes for:
  - PostgreSQL data
  - uploaded files (`/app/storage`)
  - Data Protection keys (`/app/data-protection-keys`)
- Back up and restore-test all three volumes together
- Connect `HexoraIT.SecurityAudit` logs to durable append-only storage or SIEM
- Review the remaining production conditions in `docs/audit/08-final-security-report.md`
 
---

## Nginx Proxy Manager setup

```text
Browser https://it.example.com
  → Nginx Proxy Manager (TLS termination)
  → http://DOCKER_HOST_IP:8080 (frontend Nginx)
  → http://api:8080/api/... (private API)
```

1. Set `HEXORAIT_PUBLIC_ORIGIN` to the public HTTPS origin without a trailing slash.
2. Set `HEXORAIT_FRONTEND_BIND_IP` to the Docker host address reachable from NPM.
   The default `127.0.0.1` is for a proxy running on the host. NPM in another
   container cannot use its own `127.0.0.1` to reach the frontend: use a reachable
   host address and bind the frontend port to that address. Restrict host port
   8080 to NPM in the host/network firewall. Host ports 80/443 remain free for NPM.
3. Set `HEXORAIT_NPM_IP` to the exact source IP shown in
   `docker compose logs frontend` after a request through NPM. When Docker NAT
   rewrites the source, this can be a bridge gateway instead of NPM's LAN/container
   IP. Keep this address stable and restrict access to the frontend port; all
   traffic sharing a trusted NAT address shares that trust.
4. In NPM create one Proxy Host with your domain, **Scheme: http**,
   **Forward Hostname/IP: the Docker host address**, **Forward Port: 8080** (or
   `HEXORAIT_FRONTEND_PORT`). Enable a valid SSL certificate and **Force SSL**.
   Forward all paths to this one frontend destination; no custom `/api` location
   or separate API hostname is needed. Retain NPM's standard Host,
   X-Forwarded-For and X-Forwarded-Proto headers.
5. In NPM's Advanced configuration set `client_max_body_size 100000000;` to match
   the frontend and largest API upload request limit. API endpoint limits still
   apply. For slow operations also set `proxy_read_timeout 120s;`.
6. Build and start with `docker compose --profile database up -d --build`.
   Building is required to include this checkout's new Nginx configuration;
   existing published `latest` images may still contain the previous setup.

The backend subnet defaults to `172.30.50.0/29`. If it overlaps your existing
Docker/LAN networks, change `HEXORAIT_BACKEND_SUBNET`, `HEXORAIT_API_IP` and
`HEXORAIT_FRONTEND_IP` together. Compose keeps the frontend's trusted IP in sync
with its static address. Do not attach unrelated containers to this network.

Verify the public URL loads the SPA and its deep links. In browser Network tools,
API requests must use `https://it.example.com/api/...`. Verify login, a file upload
and download, and the client IP in the administrator audit log. API failures must
return API status/JSON rather than the SPA's `index.html`. Check that HTTPS
requests do not loop through redirects. Port 8081 should no longer be published.
