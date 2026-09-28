# Wyniki regresji

Stan po wydaniu API 2.0.0 / aplikacji v1.3.0: 2026-09-28.

| Kontrola | Wynik |
|---|---|
| `dotnet test HexoraITApi/HexoraIT.Tests/HexoraIT.Tests.csproj` | **PASS 172/172** |
| Translacja 17 głównych zapytań przez Npgsql | **PASS** bez połączenia z bazą |
| `npm test --prefix HexoraITWeb` | **PASS 42/42**, w tym kontrakty API, lokalizacja, seed, CRUD i separacja ról transportu demo |
| `npm run lint --prefix HexoraITWeb` | **PASS** |
| `npm run build --prefix HexoraITWeb` | **PASS**, bez ostrzeżenia o dużych chunkach |
| `npm run build:demo --prefix HexoraITWeb` | **PASS**, samodzielny artefakt mock bez wymaganego API |
| `npm audit --prefix HexoraITWeb --audit-level=high` | **PASS**, 0 podatności |
| `git diff --check` | **PASS** |

Backend obejmuje testy serwisów, pełnego hosta HTTP, OpenAPI, autoryzacji Minimal API, izolacji organizacji, walidacji, paginacji, uploadów i cyklu życia JWT. Frontend obejmuje kontrakty DTO, centralną warstwę HTTP, statusy 400/401/403/404/409/422/429, utratę sesji, multipart, bezpieczne podglądy, routing uprawnień, paginację i lazy loading.

Główny chunk JS ma około 418 kB. ExcelJS pozostaje osobnym chunkiem on-demand około 930 kB, a `docx-preview` około 171 kB. Otwarte ograniczenie: brak testu wykonawczego na rzeczywistym PostgreSQL. Ostrzeżenie `NU1903` usunięto przez aktualizację testowej biblioteki SQLite do 2.1.13.
