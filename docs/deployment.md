# Wdrożenie i utrzymanie HexoraIT

Instrukcja [uruchomienia bezpośrednio ze źródeł](../README.md#uruchomienie-lokalne) jest w README projektu. Poniższe polecenia wykonuj z katalogu głównego repozytorium.

## Docker Compose

1. Wykonaj `cp .env.example .env`. Ustaw wartości z tabeli. Używaj własnych sekretów i przechowuj `.env` poza kontrolą wersji.

   | Zmienna | Wartość |
   | --- | --- |
   | `HEXORAIT_DB_PASSWORD` | Silne hasło PostgreSQL, wspólne dla bazy i konfiguracji połączenia API. |
   | `HEXORAIT_JWT_SIGNING_KEY` | Losowy sekret o długości co najmniej 32 bajtów. Możesz go wygenerować poleceniem `openssl rand -hex 32`. |
   | `HEXORAIT_PUBLIC_ORIGIN` | Dokładny adres w przeglądarce bez końcowego ukośnika, np. `http://127.0.0.1:8080` w środowisku lokalnym. |
   | `HEXORAIT_FRONTEND_BIND_IP` | `127.0.0.1` dla środowiska lokalnego lub adres hosta osiągalny z serwera proxy. Zmień adres sieciowy z pliku przykładowego. |
   | `HEXORAIT_FRONTEND_PORT` | Port frontendu, domyślnie `8080`. |
   | `HEXORAIT_ADMIN_EMAIL` | Adres pierwszego administratora nowej bazy. |
   | `HEXORAIT_INITIAL_ADMIN_PASSWORD` | Jednorazowe hasło pierwszego administratora, co najmniej 15 znaków. |

2. Zapisz poniższy plik jako `docker-compose.local.yml`. Ustawia hasło usługi bazy z tego samego źródła co API i zamyka port PostgreSQL na hoście. Znacznik `!reset` wymaga aktualnego Docker Compose.

   ```yaml
   services:
     db:
       environment:
         POSTGRES_PASSWORD: ${HEXORAIT_DB_PASSWORD:?Set HEXORAIT_DB_PASSWORD}
       ports: !reset []
   ```

3. Zbuduj i uruchom trzy usługi. Po starcie API sprawdź logi migracji i otwórz adres ustawiony w `HEXORAIT_PUBLIC_ORIGIN`.

   ```bash
   docker compose -f docker-compose-app.yml -f docker-compose-dbs.yml \
     -f docker-compose.local.yml up -d --build db api frontend

   docker compose -f docker-compose-app.yml -f docker-compose-dbs.yml \
     -f docker-compose.local.yml logs -f api frontend
   ```

Po utworzeniu konta usuń jednorazowe hasło z `.env` i odtwórz kontener API z nową konfiguracją. Aby użyć opublikowanych obrazów wskazanych w Compose, wykonaj `pull api frontend`, a następnie `up -d --no-build db api frontend`, z tym samym zestawem plików. Aby zatrzymać instalację z zachowaniem wolumenów, wykonaj `down` z tymi samymi plikami.

PostgreSQL zachowuje dane w wolumenie `postgres-data`. Zmiana `POSTGRES_PASSWORD` w Compose ustawia hasło przy inicjalizacji pustej bazy. W istniejącej bazie hasło zmienia się po stronie PostgreSQL i w konfiguracji API.

Opcjonalny Adminer jest zdefiniowany w pliku bazy. Uruchamiaj go tylko z ograniczonym dostępem. Przy zewnętrznym PostgreSQL ustaw `ConnectionStrings__Default` w swoim pliku Compose dla usługi `api` i uruchom `api frontend`, używając pliku aplikacji i własnych nadpisań.

## Wdrożenie przez HTTPS

Skieruj domenę na reverse proxy obsługujący TLS i ustaw publiczny adres HTTPS w `HEXORAIT_PUBLIC_ORIGIN`. Proxy przekazuje całą domenę do portu frontendu. Nginx frontendu obsługuje `/api` i przekazuje je do prywatnego `api:8080`. Gdy proxy działa na innym hoście lub w kontenerze, ustaw adres nasłuchu frontendu osiągalny z tego proxy i ogranicz dostęp do portu zaporą.

Compose ufa adresowi frontendu. Dla dodatkowego proxy, np. Nginx Proxy Manager, ustaw w nadpisaniu usługi `api` zmienną `ReverseProxy__KnownProxies__1` na dokładny adres źródłowy proxy widziany przez Nginx frontendu. Przekazuj standardowe nagłówki `X-Forwarded-For` i `X-Forwarded-Proto`. Sprawdź w logach adres klienta, a w przeglądarce logowanie, pobieranie plików i działanie `/audyt`. Dla dużych plików dopasuj limity i czasy oczekiwania zewnętrznego proxy do konfiguracji Nginx frontendu i limitów odpowiednich endpointów.

## Aktualizacje i kopie zapasowe

- Twórz spójne kopie PostgreSQL, plików z wolumenu `hexorait-storage` oraz kluczy Data Protection z wolumenu `hexorait-dataprotectionkeys-storage`. Klucze są potrzebne do odszyfrowania danych sejfu. Okresowo sprawdzaj odtworzenie kopii.
- Przed aktualizacją wykonaj kopię, przetestuj migracje na osobnej bazie i wdrażaj zgodne obrazy API i frontendu. API uruchamia migracje EF Core przy starcie, więc używane konto bazy potrzebuje praw do zmian schematu. Sprawdź logowanie, uprawnienia i pobieranie plików po aktualizacji.
- Skonfiguruj trwały odbiór logów `HexoraIT.SecurityAudit` poza kontenerem. Aby korzystać z potwierdzania e-mail, resetu hasła i powiadomień, skonfiguruj SMTP w panelu administracyjnym oraz sprawdź publiczny adres aplikacji.
- Eksport ZIP przenosi wybrane dane organizacji. Do odtworzenia całej instalacji używaj kopii bazy, plików i kluczy. Projekty CyberAudit Studio zapisywane w przeglądarce zabezpieczaj osobnymi eksportami JSON.
