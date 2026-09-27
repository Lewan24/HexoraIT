# API

API używa ścieżek `/api/*` i grup Minimal API. Kontrakt OpenAPI jest dostępny w środowisku testowym pod `/swagger/v1/swagger.json`; zasady wersjonowania opisuje [openapi-contract.md](openapi-contract.md).

Odpowiedzi błędów używają Problem Details, a chronione operacje wymagają nagłówka `Authorization: Bearer <token>`. Uploady używają `multipart/form-data` bez ręcznego ustawiania `Content-Type` przez klienta.

Lista modułów obejmuje auth, assets, contacts, groups, incidents, knowledge, licenses, plans, projects, tasks, subnets, contracts, warranties, files, dashboard, diagram, passwords, private notes, reports, organizations, roles i panel administracyjny.
