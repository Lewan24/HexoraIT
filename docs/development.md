# Rozwój HexoraIT

## Struktura repozytorium

| Ścieżka | Zawartość |
| --- | --- |
| `HexoraITApi/HexoraIT.Api/Api/App` | Grupy tras ASP.NET Core Minimal API, powiązane z modułami. |
| `HexoraITApi/HexoraIT.Api/Application` | Reguły biznesowe, generowanie PDF, transfer danych i obsługa operacji IT. |
| `HexoraITApi/HexoraIT.Api/Domain`, `Infrastructure`, `Migrations` | Encje oraz konfiguracja EF Core i migracje PostgreSQL. |
| `HexoraITWeb/src` | Ekrany React, kontekst organizacji, klient HTTP, interfejs demonstracyjny i tłumaczenia PL/EN. |
| `HexoraITWeb/public/audit-studio` | Samodzielne CyberAudit Studio w HTML, CSS i JavaScript, dołączane do obrazu frontendu. |

Przy zmianie modułu sprawdź autoryzację po stronie API i zgodność interfejsu z trybem demonstracyjnym. Dane demonstracyjne są lokalne w przeglądarce. CyberAudit Studio można uruchomić, otwierając jego `index.html`. Zasady rozwoju i weryfikacji tej paczki opisuje jej [README](../HexoraITWeb/public/audit-studio/README.md).

## Testy i budowanie

Wymagania i uruchomienie środowiska opisuje [README projektu](../README.md#uruchomienie-lokalne). Z katalogu głównego wykonaj:

```bash
dotnet test HexoraITApi/HexoraIT.Tests/HexoraIT.Tests.csproj
npm ci --prefix HexoraITWeb
npm test --prefix HexoraITWeb
npm run lint --prefix HexoraITWeb
npm run build --prefix HexoraITWeb
```

Testy integracyjne API domyślnie używają SQLite. Testy zależne od PostgreSQL są uruchamiane po wskazaniu izolowanego serwera odpowiednimi zmiennymi `HEXORA_ARCHIVE_TEST_POSTGRES` i `HEXORA_OPERATIONS_TEST_POSTGRES`. Weryfikację bezpośrednio na PostgreSQL warto wykonać przy zmianie migracji lub zapytań EF Core.

`npm run build:demo --prefix HexoraITWeb` tworzy statyczne demo w `HexoraITWeb/dist`. Hosting SPA powinien kierować ścieżki aplikacji, w tym `/audyt`, do głównego `index.html`.

## Aktualizacja OpenAPI

Po zmianie tras lub DTO odśwież [kontrakt JSON](api/openapi/v2.json) i listę tras w [opisie API](api/overview.md). W CI skrypt `tools/export-openapi-from-tests.ps1` generuje specyfikację z testowego hosta i porównuje ją z plikiem w repozytorium. Bez PowerShell można wyeksportować ją tak:

```bash
HEXORAIT_OPENAPI_OUTPUT="$(pwd)/docs/api/openapi/v2.json" \
  dotnet test HexoraITApi/HexoraIT.Tests/HexoraIT.Tests.csproj \
  --filter FullyQualifiedName~OpenApiContractTests
```
