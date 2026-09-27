# Wyniki regresji

Stan: 2026-09-27.

## Zakres wykonany

- Backend obejmuje testy serwisów, pełnego hosta HTTP, kontraktu OpenAPI, autoryzacji Minimal API, izolacji organizacji, walidacji, paginacji, uploadów i cyklu życia JWT.
- Frontend obejmuje kontrakty DTO, centralną warstwę HTTP, reakcję na statusy 400/401/403/404/409/422/429, utratę sesji, multipart, preview dokumentów, routing uprawnień i paginację.
- `npm audit` nie wykazał znanych podatności.

## Ostatnie uruchomienie

| Polecenie | Wynik | Uwagi |
|---|---|---|
| `dotnet test HexoraITApi/HexoraIT.slnx --no-restore` | nie zakończono w sesji roboczej | proces testowy nie zwrócił raportu i wymaga ponownego uruchomienia w czystej sesji |
| `npm test --prefix HexoraITWeb` | BLOCKED | runner Node zakończył wszystkie pliki błędem środowiskowym `spawn EPERM`; nie wystąpiły błędy asercji |
| `npm audit --prefix HexoraITWeb` | PASS | 0 znanych podatności według ostatniego pomiaru |
| frontend build/lint | PASS według poprzedniego pomiaru | wymagane ponowne potwierdzenie po kolejnej zmianie |

## Pozostałe wymagane potwierdzenia

1. Ponowić pełny backend i zapisać dokładną liczbę testów.
2. Uruchomić frontendowy runner w środowisku, w którym procesy potomne Node mogą być tworzone.
3. Wykonać test API przeciwko PostgreSQL oraz odbiór konfiguracji produkcyjnej.

## Zweryfikowany pomiar 2026-09-27

- Backend: `dotnet test ... --no-build` — **147/147 PASS**; Application 81/81, Controllers 34/34, Integration 32/32.
- Frontend: `npm test` — **35/35 PASS**.
- Frontend lint i build — **PASS**.
- `git diff --check` — **PASS**.
- Ocena kolekcji zagnieżdżonych: brak nowego limitu regresyjnego; `SubnetDto.Ips` oznaczono do przyszłej paginacji zamiast obcinać dane w odpowiedzi.
