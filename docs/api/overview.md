# API

Current API contract: **2.0.0** (application release `v1.3.0`). Registration now requires email confirmation and returns `202` without a session, so the previous v1 contract is retained as a legacy artifact and the current contract is published in `openapi/v2.json`. See [email-notifications.md](email-notifications.md).

API używa ścieżek `/api/*` i funkcjonalnych grup Minimal API. Bieżący kontrakt OpenAPI jest dostępny w środowiskach `Development` i `Testing` pod `/swagger/v2/swagger.json`; produkcja go nie publikuje. Zasady wersjonowania opisuje [openapi-contract.md](openapi-contract.md), a zamrożony artefakt znajduje się w `openapi/v2.json`.

Odpowiedzi błędów używają Problem Details, a chronione operacje wymagają nagłówka `Authorization: Bearer <token>`. Uploady używają `multipart/form-data` bez ręcznego ustawiania `Content-Type` przez klienta.

Lista modułów obejmuje auth, assets, contacts, groups, incidents, knowledge, licenses, plans, projects, tasks, subnets, contracts, warranties, files, dashboard, diagram, passwords, private notes, reports, organizations, roles i panel administracyjny.
