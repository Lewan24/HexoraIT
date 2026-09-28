# HexoraIT

HexoraIT is a modern, self-hosted IT documentation platform designed for system administrators, IT departments, managed service providers, and anyone responsible for maintaining technical infrastructure.

The project was created to provide a free, powerful alternative to commercial documentation systems without requiring subscriptions or vendor lock-in. Every organization can host HexoraIT within its own environment, keeping complete ownership of its data, infrastructure, backups, and security.

Built with modern technologies, HexoraIT focuses on performance, simplicity, and a clean technical user experience while offering advanced documentation capabilities for complex IT environments.

---

## Checkout the demo version to test out the application

[Demo website](https://hexorait.lewanmordor.workers.dev/)

---

![HexoraIT App Login gif](https://github.com/Lewan24/HexoraIT/blob/main/Images/Login.gif)

## Checkout [example images](https://github.com/Lewan24/HexoraIT/blob/main/presentation.md) of working application and few first pages.

---

## Quick Start

```bash
git clone https://github.com/Lewan24/HexoraIT.git

cd HexoraIT

# Set secrets, public HTTPS origin, NPM source IP and frontend bind address.
cp .env.example .env
# Edit .env for your deployment; see installation.md for NPM settings.

docker compose --profile database up -d --build
```

The `database` profile starts the bundled PostgreSQL and Adminer services. If you already have PostgreSQL, configure `ConnectionStrings__Default` for the API and start only `api` and `frontend`. Never commit `.env` or production secrets.

To bootstrap the first administrator, temporarily add `HEXORAIT_ADMIN_EMAIL` and `HEXORAIT_INITIAL_ADMIN_PASSWORD` (minimum 15 characters) to the deployment environment. Remove the bootstrap password immediately after the account is created.

Open:

- Frontend: your `HEXORAIT_PUBLIC_ORIGIN` through Nginx Proxy Manager
- API: `/api` on that same origin (no published API port)
- Adminer: http://localhost:8082

## Check out [Installation Guide](https://github.com/Lewan24/HexoraIT/blob/main/installation.md) to know better all settings and what you can do before start.

## Documentation

- [Technical documentation](docs/README.md)
- [User guide](instrukcja-obslugi.md) (Polish)
- [Administrator guide](docs/admin-guide/README.md) (Polish)
- [Deployment and production checklist](docs/deployment/deployment-guide.md)
- [Final security report](docs/audit/08-final-security-report.md)

## Features

**HexoraIT** allows you to organize and connect every important part of your infrastructure in a single place.

### Asset Management

Manage all hardware and infrastructure assets, including:

- Workstations
- Servers
- Virtual machines
- Printers
- Network devices
- Storage
- Custom asset types

Each asset supports detailed technical information, status tracking, relationships, documentation, warranties, licenses, contacts, passwords, incidents, and much more.

---

### Documentation

Create detailed technical documentation and knowledge base articles for anything that does not belong to a dedicated module.

Examples include:

- Internal procedures
- Deployment guides
- Disaster recovery documentation
- Maintenance instructions
- Company standards
- Troubleshooting guides
- Custom technical documentation

---

### Contacts

Store technical and business contacts, including employees, vendors, customers, service providers, and external partners.

---

### Contracts

Keep important contract information together with related assets, contacts, expiration dates and provided documents.

---

### Groups

Document logical groups used throughout your infrastructure, such as:

- Active Directory groups
- Local server groups
- Security groups
- Administrative groups
- Custom organizational groups

---

### Incidents

Track incidents together with their history, status, affected assets, and related documentation.

---

### Knowledge Base

Build an internal knowledge base that grows together with your infrastructure and operational experience.

---

### License Management

Store software licenses, activation keys, assigned assets, expiration dates, and additional licensing information.

---

### Network Management

Document:

- Networks
- VLANs
- IP addressing
- Subnets
- Network devices
- Infrastructure relationships

---

### Password Management

Securely organize credentials and associate them with assets, services, users, or infrastructure components.

---

### Roadmaps

Plan future infrastructure improvements, migrations, upgrades, and long-term technical goals.

---

### Task Management

Create internal TODO tasks related to documentation, infrastructure maintenance, migrations, or daily administrative work.

---

### Warranty Tracking

Track warranty periods for hardware and receive a complete overview of equipment lifecycle.

---

### Interactive Network Diagram

One of the core features of HexoraIT is the integrated network diagram editor.

Create visual representations of your infrastructure by connecting assets directly within the diagram.

Examples include:

- Routers
- Switches
- Firewalls
- Servers
- Workstations
- Printers
- Virtual machines
- Internet connections

The diagram integrates directly with your existing assets, allowing your documentation to stay synchronized with your infrastructure.

---

## Modern User Interface

**HexoraIT** provides a clean and professional interface designed specifically for technical users.

Features include:

- Dark theme
- Light theme
- Responsive layout
- Customizable Dashboard per user per organization
- Modern technical design
- Fast navigation
- Consistent user experience

The interface was designed to feel familiar to developers, system administrators, and IT professionals.

---

## Technology Stack

### Backend

- .NET 10
- ASP.NET Core Minimal API
- EF Core and PostgreSQL
- C#

### Frontend

- React
- Vite
- Tailwind CSS

### Deployment

- Docker
- Docker Compose

---

## Self-Hosted First

**HexoraIT** is built around a self-hosted philosophy.

There are no subscriptions, licensing servers, cloud dependencies, or feature limitations.

You own:

- Your data
- Your infrastructure
- Your backups
- Your security
- Your updates

Deploy **HexoraIT** on your own server, NAS, virtual machine, or homelab in just a few minutes using Docker.

---

## Installation

Deployment is intentionally straightforward.

1. Download the Docker Compose configuration.
2. Configure the required environment variables.
3. Start the containers.
4. Begin documenting your infrastructure.

The entire setup takes only a few minutes.

---

## Updating

Updating HexoraIT is simple.

1. Stop the running containers.
2. Pull the latest images.
3. Start the containers again.

Your database should be stored inside a persistent Docker volume, ensuring your data remains intact during updates.

Regular database backups are strongly recommended.

---

## Database Backups

Because **HexoraIT** is fully self-hosted, protecting your data is your responsibility.

It is highly recommended to perform regular automated backups of your database.

For this purpose, you can use [**OctoBackup**](https://github.com/Lewan24/OctoBackup), another free and self-hosted project available on my GitHub and Docker Hub.

OctoBackup provides:

- Scheduled automatic backups
- Support for multiple database engines
- Tunnel support
- Simple configuration
- Docker deployment
- Self-hosted architecture

Together, **HexoraIT** and OctoBackup provide a complete, free solution for documenting and protecting your IT infrastructure.

---

## Philosophy

**HexoraIT** was built with a few simple principles:

- Free forever
- Self-hosted
- Fast
- Modern
- Easy to deploy
- Easy to maintain
- No vendor lock-in
- Complete ownership of your data

Whether you're managing a small homelab, a growing company, or a large enterprise environment, **HexoraIT** gives you a centralized place to organize your technical knowledge and infrastructure.

---

## License

This project is distributed under the terms of the repository license.

See the `LICENSE` file for more information.
