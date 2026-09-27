# Przewodnik deweloperski

## Wymagania

- .NET SDK 10;
- Node.js 24 i npm zgodny z lockfile;
- PostgreSQL dla ręcznych testów integracyjnych; automatyczne testy wykonawcze używają SQLite in-memory.

## Komendy

```text
dotnet build HexoraITApi/HexoraIT.slnx --no-restore
dotnet test HexoraITApi/HexoraIT.Tests/HexoraIT.Tests.csproj

npm ci --prefix HexoraITWeb
npm test --prefix HexoraITWeb
npm run lint --prefix HexoraITWeb
npm run build --prefix HexoraITWeb
```

Test `PostgreSqlQueryTranslationTests` używa Npgsql do generowania SQL bez połączenia z serwerem i wykrywa typowe błędy „could not be translated”. Nie zastępuje smoke testu na rzeczywistym PostgreSQL.

## Zasady zmian

- Nowy endpoint umieść w funkcjonalnej grupie Minimal API i deleguj logikę do serwisu aplikacyjnego.
- Autoryzację określ na endpointach i ponownie sprawdź organizację/moduł/zasób w serwisie. Kontrola UI jest tylko UX.
- Nie wykonuj metod .NET zależnych od providera, np. `enum.ToString()`, wewnątrz `IQueryable`; materializuj ograniczone dane albo użyj jawnie tłumaczalnej projekcji.
- Zmiana DTO lub statusu HTTP wymaga aktualizacji frontendu, testów kontraktowych i artefaktu OpenAPI.
- Ciężkie ekrany pozostawiaj za `React.lazy`, a duże parsery za importem dynamicznym.

## OpenAPI

Po zmianie kontraktu uruchom z katalogu repozytorium:

```powershell
./tools/export-openapi-from-tests.ps1
```

Dołącz zmianę `docs/api/openapi/v1.json` do review. CI ponownie generuje dokument i sprawdza dryf.
