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

Before starting, create a local `.env` file (it is ignored by Git):

```dotenv
HEXORAIT_DB_PASSWORD=replace-with-a-strong-database-password
HEXORAIT_JWT_SIGNING_KEY=replace-with-at-least-32-random-bytes
```

Start the application together with the bundled PostgreSQL and Adminer:

```bash
docker compose --profile database up -d
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
http://localhost
```

Environment variables:

| Variable | Description |
|----------|-------------|
| `HEXORAIT_API_BASE_URL` | URL of the backend API (for example `http://localhost:8081/api`) |

Example:

```yaml
environment:
  HEXORAIT_API_BASE_URL: http://localhost:8081/api
```

---

## API

Available at:

```
http://localhost:8081
```

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

If the API is published behind a reverse proxy, configure each trusted proxy IP as
`ReverseProxy__KnownProxies__0`, `ReverseProxy__KnownProxies__1`, and so on. Only
these exact proxies may supply `X-Forwarded-For` and `X-Forwarded-Proto`; do not add
client networks or a catch-all address. Leave the list empty when clients connect
directly to the API.

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
AppSettings__AllowOrigins__0: http://localhost
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

## HTTPS and Reverse Proxy (Recommended)
If you don't want only local access and hosting.

For production deployments it is recommended to expose HexoraIT through a reverse proxy instead of publishing the containers directly.

A common setup is:

```
Internet
     │
     ▼
Nginx Proxy Manager
     │
     ├── Frontend → http://frontend:80
     └── API      → http://api:8080
```

I personally recommend **Nginx Proxy Manager** because it makes the setup very simple:

- Connect your own domain to the application.
- Automatically obtain and renew Let's Encrypt SSL certificates.
- Configure HTTPS without manually editing Nginx configuration.
- Easily manage multiple applications from a web interface.

When exposing **HexoraIT** to the Internet, it is also recommended to:

- Disable public user registration:
  ```yaml
  AppSettings__AllowRegister: false
  ```
- Set `AppSettings__AllowOrigins__*` to your actual frontend domain.
- Use a strong `Jwt__SigningKey`.
- Use strong PostgreSQL credentials.
- Persist both the PostgreSQL data volume and the file storage directory.

With this setup, Nginx Proxy Manager will handle SSL termination and forward traffic to the frontend and API containers over your internal Docker network.
