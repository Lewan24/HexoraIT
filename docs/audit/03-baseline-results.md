# Wyniki bazowe

Data wykonania: 2026-09-26. Środowisko: Windows, .NET SDK 10.0.302/runtime 10.0.10, Node 24.12.0.

| Polecenie | Wynik |
|---|---|
| `dotnet test HexoraITApi/HexoraIT.Tests/HexoraIT.Tests.csproj --no-restore --disable-build-servers --blame-hang-timeout 60s` | sukces, 131/131, 0 pominiętych; test run 7,90 s |
| `npm test --prefix HexoraITWeb` | sukces, 11/11, 0 pominiętych |
| `npm run build --prefix HexoraITWeb` | sukces; Vite 8.1.4, 1987 modułów |
| `npm audit --prefix HexoraITWeb --json` | niepowodzenie bezpieczeństwa: 1 high (`xlsx`) |
| `dotnet list ... package --vulnerable --include-transitive --no-restore` | nieweryfikowalne: źródło NuGet zablokowane przez środowisko |

Pierwsze uruchomienie frontendu bez `node_modules` nie mogło znaleźć TypeScript. Po `npm install` zgodnym z istniejącym lockfile testy i build przeszły; lockfile nie zmienił się.

## Ostrzeżenia

- `SQLitePCLRaw.lib.e_sqlite3` 2.1.11: NU1903/high, GHSA-2m69-gcr7-jv3q (zależność projektu testowego).
- `xlsx` 0.18.5: high, prototype pollution GHSA-4r6h-8v6p-xvw6 i ReDoS GHSA-5pgg-2g8v-p4x9; `npm audit` nie proponuje poprawki w tym kanale pakietu.
- Pięć ostrzeżeń CS9107 w kontrolerach i cztery CS8602 w testach.
- Bundle JS ma 1 510,23 kB (418,34 kB gzip), powyżej progu 500 kB.
- Vite ostrzega, że `/env.js` bez `type=module` nie jest bundlowany; jest to zamierzony plik runtime, ale wymaga udokumentowania.
- Fluent Assertions 8 wyświetla informację o licencji wymagającej weryfikacji dla użycia komercyjnego.

## Ograniczenia baseline

Testy backendu tworzą kontrolery bezpośrednio i korzystają z SQLite in-memory. Nie uruchamiają `WebApplicationFactory`, JWT middleware, rate limiting, CORS, nagłówków, Problem Details, rzeczywistego uploadu multipart ani PostgreSQL. Nie uruchomiono aplikacji przeciw produkcyjnej bazie ani aktywnych testów penetracyjnych.

