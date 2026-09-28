# Strategia testów

## Cel

Strategia obejmuje backend ASP.NET Core Minimal API, frontend React oraz kontrakt HTTP pomiędzy nimi. Testy używają wyłącznie danych syntetycznych i izolowanej bazy SQLite w testowym hoście HTTP.

## Warstwy

| Warstwa | Zakres | Narzędzie |
|---|---|---|
| Jednostkowa | Serwisy aplikacyjne, walidacja, storage, audyt i szyfrowanie | xUnit, FluentAssertions |
| Integracyjna API | Routing, JWT, SecurityStamp, Problem Details, rate limiting, autoryzacja zasobowa, paginacja i uploady | `WebApplicationFactory`, SQLite |
| Kontrakt frontend–API | Ścieżki, DTO, daty, multipart, błędy i zakres organizacji | Node test runner, testy statycznego kontraktu |
| Jakościowa | Kompilacja, lint, podatności zależności | `dotnet build`, `npm run build`, ESLint, `npm audit` |

## Kryteria dla zmiany

Każda zmiana backendu powinna mieć test serwisu albo test HTTP, a zmiana kontraktu — odpowiadający test frontendowy. Dla operacji chronionych wymagane są testy pozytywne i negatywne obejmujące brak tokenu, niewystarczające uprawnienie, obcy zasób oraz nieaktywną organizację.

Przed zakończeniem partii uruchamiamy:

```text
dotnet test HexoraITApi/HexoraIT.slnx --no-restore
npm test --prefix HexoraITWeb
npm run lint --prefix HexoraITWeb
npm run build --prefix HexoraITWeb
git diff --check
```

## Ograniczenia

SQLite nie jest zamiennikiem testu PostgreSQL. Testy nie potwierdzają konfiguracji reverse proxy, zewnętrznego sinka audytu, skanera antymalware ani ochrony kluczy Data Protection w środowisku produkcyjnym. Te elementy wymagają osobnego odbioru wdrożeniowego.

## Zagnieżdżone kolekcje

`SubnetDto.Ips` jest jedyną istotną kolekcją odpowiedzi bez osobnego limitu. Nie jest obecnie obcinana, ponieważ ekran sieci korzysta z pełnej listy, a API udostępnia osobne operacje IP. Następną zmianą powinno być zaprojektowanie paginacji IP per subnet albo osobnego endpointu listującego; ciche ograniczenie liczby wpisów byłoby zmianą danych widocznych dla użytkownika.

Pozostałe analizowane kolekcje wejściowe mają jawne limity przez `CollectionCount` lub `StringCollection`, w tym węzły i krawędzie diagramu, tagi, członków grup, zasoby planów oraz reguły ról.
