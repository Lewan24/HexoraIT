# Inwentaryzacja systemu

Stan na 2026-09-26, przed refaktoryzacją. Dokument powstał na podstawie kodu, konfiguracji, migracji i uruchomionych testów. Nie opisuje założeń, których nie potwierdza repozytorium.

## Repozytorium i technologie

| Obszar | Stan bieżący |
|---|---|
| Backend | `HexoraITApi/HexoraIT.Api`, ASP.NET Core/.NET 10, kontrolery MVC, EF Core 10, Npgsql/PostgreSQL, AutoMapper |
| Frontend | `HexoraITWeb`, React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Testy | `HexoraITApi/HexoraIT.Tests` (xUnit, SQLite in-memory, 131 testów), `HexoraITWeb/tests` (Node test runner, 11 testów) |
| Uwierzytelnianie | Własne konta, PBKDF2-SHA256 (210 000 iteracji), bearer JWT HS256, ważność 8 godzin |
| Autoryzacja | Rola systemowa, członkostwo organizacji, role organizacyjne i reguły per moduł/per zasób; globalne filtry EF |
| Dane | PostgreSQL, 12 migracji głównych (bez plików Designer), automatyczne `MigrateAsync()` przy starcie |
| Pliki | Lokalny system plików; metadane w bazie; limity 20 MB dla dokumentów i 100 MB dla eksploratora |
| Sekrety użytkowników | Hasła kont hashowane; wpisy sejfu szyfrowane ASP.NET Data Protection; klucze na wolumenie |
| Deployment | Dockerfile API i UI, nginx dla SPA, `docker-compose.yml`; brak CI/CD w `.github` |
| Integracje | Publiczne API GitHub Releases, stały adres, cache in-memory 1 h |

W repozytorium jest 121 plików C# (łącznie z testami i migracjami), 51 plików TS/TSX, 24 pliki `*Controller.cs` (23 konkretne kontrolery i jedna klasa bazowa) oraz 136 akcji HTTP.

## Moduły biznesowe i dane

- Tożsamość: użytkownicy, administratorzy systemowi, blokowanie kont, zmiana/reset hasła.
- Organizacje: członkostwa, role Owner/Admin/Member/ReadOnly, role niestandardowe, konta klientów i szczegółowe uprawnienia.
- Dokumentacja infrastruktury: aktywa, podsieci i adresy IP, diagram sieci, grupy, licencje, kontakty, umowy, gwarancje.
- Operacje: projekty, zadania, plany, incydenty, baza wiedzy, dashboard.
- Dane wrażliwe: sejf haseł, prywatne notatki, dokumenty umów/gwarancji i dowolne pliki.
- Dostęp klienta: raportowanie problemów (tworzy zadanie) i selektywny odczyt udostępnionych zasobów.

Główne encje EF: `User`, `Organization`, `UserOrganization`, `OrganizationRole`, `RolePermission`, `ClientPermission`, `Asset`, `PasswordEntry`, `Subnet`, `IPEntry`, `License`, `Contact`, `Contract`, `Plan`, `Incident`, `KnowledgeArticle`, `Project`, `WorkTask`, `Group`, `WarrantyItem`, `DiagramNode`, `DiagramEdge`, `DashboardLayout`, `FileFolder`, `StoredFile`, `PrivateNote`.

## Inwentaryzacja API

Wszystkie ścieżki zachowują prefiks `/api`. Oznaczenia: `CRUD` = GET kolekcji, GET po ID, POST, PUT, DELETE; dodatkowe operacje są wypisane jawnie.

| Prefiks | Operacje |
|---|---|
| `/admin/users` | GET, POST; PATCH `/{id}/block`, PATCH `/{id}/role`, POST `/{id}/reset-password` |
| `/auth` | POST `/register`, `/login`, `/switch-org`, `/change-password`; GET i PUT `/me` |
| `/assets` | CRUD; PATCH `/{id}/star` |
| `/contacts` | CRUD; PATCH `/{id}/star` |
| `/contracts` | CRUD; PATCH `/{id}/star`; GET/POST `/{id}/document` |
| `/dashboard-layout` | GET, PUT, DELETE |
| `/diagram` | GET, PUT |
| `/files` | GET listy; POST `/upload`; GET `/{id}/content`, GET `/{id}/download`, PATCH/DELETE `/{id}`, PATCH `/{id}/move`; GET/POST `/folders`, PATCH/DELETE `/folders/{id}`, PATCH `/folders/{id}/move` |
| `/groups` | CRUD |
| `/incidents` | CRUD |
| `/knowledge` | CRUD; PATCH `/{id}/star` |
| `/licenses` | CRUD; PATCH `/{id}/star` |
| `/organizations` | GET, POST; GET `/deleted`; GET/PUT/DELETE `/{id}`; POST `/{id}/restore`; GET/POST `/{id}/members`; DELETE `/{id}/members/{userId}` |
| `/organizations/{organizationId}` | GET `/permissions`; CRUD ról pod `/roles` (bez GET po ID), PUT `/members/{userId}/role`; GET `/role-resources/{resource}`; GET/POST `/clients`; GET/PUT `/clients/{clientId}/permissions`; POST `/roles/{roleId}/copy`; POST `/reports`; CRUD prywatnych notatek (bez GET po ID) |
| `/passwords` | GET kolekcji, POST, PUT/DELETE `/{id}`, GET `/{id}/reveal`, PATCH `/{id}/star` |
| `/plans` | CRUD |
| `/projects` | CRUD |
| `/subnets` | CRUD; POST `/{subnetId}/ips`; PUT/DELETE `/{subnetId}/ips/{entryId}` |
| `/tasks` | CRUD |
| `/version` | GET; GET `/latest` |
| `/warranties` | CRUD; PATCH `/{id}/star`; GET/POST `/{id}/document` |

Pełna liczba powyższych akcji wynosi 136. Kontrolery aplikacyjne poza wersją i publicznymi akcjami rejestracji/logowania dziedziczą po `OrgScopedController` albo mają `[Authorize]`; admin używa polityki `AdminOnly`.

## Konfiguracja i zależności

- Backend rejestruje DbContext, AutoMapper, Data Protection, storage plików, hasher, JWT, kontekst użytkownika, klienta GitHub, memory cache, CORS, MVC, Swagger.
- Swagger jest dostępny tylko w `Development`.
- CORS wymaga niepustej allowlisty, dopuszcza credentials, dowolny nagłówek i metodę.
- Frontend ma centralny wrapper `fetch`, bearer token w `localStorage`, globalną reakcję na 401 oraz DTO utrzymywane ręcznie.
- Frontend nie używa routingu URL; aktywny ekran jest lokalnym stanem aplikacji.
- Docker Compose uruchamia PostgreSQL 17, opcjonalny Adminer, API i nginx/SPA.

## Istniejąca dokumentacja

`README.md`, `installation.md`, `instrukcja-obslugi.md`, `client-access.md` i `presentation.md` opisują funkcje oraz wdrożenie. Wymagają aktualizacji po zmianach i rozdzielenia na dokumentację techniczną, użytkownika i administratora.

