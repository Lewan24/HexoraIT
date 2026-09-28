# Backend

`Program.cs` jest composition rootem. Endpointy są pogrupowane według funkcji w `HexoraITApi.Api.Api.*`, a logika operacji znajduje się w serwisach `Application/*Service.cs`.

Główne mechanizmy:

- JWT Bearer z kontrolą `SecurityStamp` przy walidacji tokenu;
- autoryzacja politykami i uprawnieniami modułowymi;
- izolacja organizacji oraz zasobowa kontrola odczytu i zapisu;
- EF Core z PostgreSQL w produkcji i SQLite w testowym hoście;
- Problem Details, correlation ID, rate limiting logowania/rejestracji i security headers;
- osobny storage prywatny i walidacja sygnatur uploadowanych plików.

Migracje EF Core są addytywne. Aktualny `AppInitializer` wykonuje `MigrateAsync()` przy starcie, dlatego konto runtime nadal potrzebuje praw do zmiany schematu. Docelowy model produkcyjny powinien przenieść migracje do kontrolowanego kroku wdrożenia i ograniczyć uprawnienia konta aplikacyjnego; ryzyko opisuje [raport końcowy](../audit/08-final-security-report.md).
