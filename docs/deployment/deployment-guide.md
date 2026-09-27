# Wdrożenie

Publiczna instrukcja Docker Compose znajduje się również w [`installation.md`](../../installation.md). Ten dokument opisuje wymagania produkcyjne.

## Przygotowanie

1. Przygotuj PostgreSQL, prywatny storage plików, trwały key-ring Data Protection i secret store.
2. Ustaw co najmniej `HEXORAIT_DB_PASSWORD`, `HEXORAIT_JWT_SIGNING_KEY`, produkcyjne originy CORS i `HEXORAIT_API_BASE_URL`.
3. Jeśli używasz reverse proxy, wpisz jego dokładne adresy IP w `ReverseProxy:KnownProxies`; nie ufaj całym sieciom klientów.
4. Zapewnij HTTPS na publicznej granicy i nie publikuj portów PostgreSQL/Adminer do Internetu.
5. Podłącz kategorię `HexoraIT.SecurityAudit` do trwałego append-only/SIEM sinka.

## Migracje

Obecna wersja wywołuje `Database.MigrateAsync()` podczas startu API. Przed aktualizacją przetestuj migracje na kopii bazy i wykonaj pełny backup. Konto runtime musi obecnie mieć prawa do zmiany schematu. Docelowo zalecane jest wydzielenie migracji do jednorazowego zadania wdrożeniowego i odebranie tych praw aplikacji.

## Kolejność wdrożenia

1. Zatrzymaj zapisy lub zapewnij okno serwisowe.
2. Wykonaj backup PostgreSQL, storage oraz kluczy Data Protection.
3. Uruchom migrację/start nowego API i sprawdź logi inicjalizacji.
4. Wdróż zgodny frontend; obraz buduje zależności przez `npm ci`.
5. Wykonaj smoke test: login, wybór organizacji, dwa poziomy uprawnień, CRUD, upload/download, sejf i 401 po unieważnieniu sesji.
6. Sprawdź nagłówki bezpieczeństwa, CORS, adres klienta za proxy oraz odbiór zdarzeń audytowych.

Przed publikacją wykonaj zestawy z [test-strategy.md](../testing/test-strategy.md), rotację historycznie użytych sekretów i ręczną kontrolę artefaktów. Warunki blokujące produkcję opisuje [raport końcowy](../audit/08-final-security-report.md).

## Publiczna wersja demonstracyjna bez API

Uruchom `npm run build:demo --prefix HexoraITWeb` i opublikuj katalog `HexoraITWeb/dist` jako statyczne SPA z fallbackiem do `index.html`. Alternatywnie uruchom sam obraz frontendu z `HEXORAIT_APP_MODE=mock`; URL API nie jest wtedy wymagany. Demo zapisuje dane tylko w pamięci przeglądarki i udostępnia w ustawieniach reset do danych startowych. Nie uruchamiaj w tym wariancie API ani bazy, jeśli nie są potrzebne innym usługom.

Konta demonstracyjne są publiczne i pokazane na ekranie logowania. Nie umieszczaj w seedzie danych rzeczywistych, sekretów ani materiałów klientów. Limit `localStorage` zależy od przeglądarki, dlatego demo nie służy do przechowywania dużych plików.
