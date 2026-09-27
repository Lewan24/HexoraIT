# Backend

`Program.cs` jest composition rootem. Endpointy są pogrupowane według funkcji w `HexoraITApi.Api.Api.*`, a logika operacji znajduje się w serwisach `Application/*Service.cs`.

Główne mechanizmy:

- JWT Bearer z kontrolą `SecurityStamp` przy walidacji tokenu;
- autoryzacja politykami i uprawnieniami modułowymi;
- izolacja organizacji oraz zasobowa kontrola odczytu i zapisu;
- EF Core z PostgreSQL w produkcji i SQLite w testowym hoście;
- Problem Details, correlation ID, rate limiting logowania/rejestracji i security headers;
- osobny storage prywatny i walidacja sygnatur uploadowanych plików.

Migracje EF Core są addytywne. Automatyczne wykonywanie migracji przy starcie pozostaje ryzykiem wdrożeniowym opisanym w raporcie postępu.
