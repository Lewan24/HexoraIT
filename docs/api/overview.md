# API

API używa ścieżek `/api/*` i funkcjonalnych grup Minimal API. Kontrakt OpenAPI jest dostępny w środowiskach `Development` i `Testing` pod `/swagger/v1/swagger.json`; produkcja go nie publikuje. Zasady wersjonowania opisuje [openapi-contract.md](openapi-contract.md), a zamrożony artefakt znajduje się w `openapi/v1.json`.

Odpowiedzi błędów używają Problem Details, a chronione operacje wymagają nagłówka `Authorization: Bearer <token>`. Uploady używają `multipart/form-data` bez ręcznego ustawiania `Content-Type` przez klienta.

Lista modułów obejmuje auth, assets, contacts, groups, incidents, knowledge, licenses, plans, projects, tasks, subnets, contracts, warranties, files, dashboard, diagram, passwords, private notes, reports, organizations, roles i panel administracyjny.
