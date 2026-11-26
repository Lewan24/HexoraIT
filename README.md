# HexoraIT

HexoraIT to aplikacja do dokumentowania infrastruktury IT i obsługi organizacji na własnym serwerze. Łączy ewidencję zasobów, dokumentację, codzienną pracę zespołu oraz historię audytów. Można jej używać w dziale IT, firmie obsługującej wielu klientów lub domowym laboratorium.

![Pulpit HexoraIT](Images/Dashboard.png)

## Funkcje

| Obszar | Co można zrobić |
| --- | --- |
| Organizacje i dostęp | Prowadzić osobną dokumentację firm i zleceń, zarządzać członkami, rolami i dostępem klientów, włączać moduły i archiwizować organizacje. |
| Zasoby i sieć | Ewidencjonować sprzęt i usługi, opisywać podsieci, VLAN-y i adresy IP oraz rysować diagram sieci powiązany z zasobami. |
| Dokumentacja | Prowadzić bazę wiedzy, kontakty, umowy, licencje, gwarancje i pliki. Przechowywać dane dostępowe w szyfrowanym sejfie. |
| Praca zespołu | Obsługiwać incydenty, zadania, projekty i plany. Dokumentować operacje oraz zmiany IT, korzystając z formularzy, zatwierdzeń i historii zmian. |
| Audyty | Przeprowadzać audyty wewnętrzne w CyberAudit Studio, a w organizacji zapisywać statusy, aktualizacje i załączniki PDF lub JSON. |
| Raporty i dane | Generować dokumentację PDF z wybranych sekcji oraz przenosić dane organizacji za pomocą szyfrowanego ZIP-a. |

Frontend używa React, TypeScript, Vite i Tailwind CSS. API działa w ASP.NET Core na .NET 10 z EF Core i PostgreSQL. W Dockerze Nginx serwuje frontend oraz przekazuje żądania `/api` do backendu.

## Uruchomienie lokalne

Potrzebujesz .NET SDK 10, Node.js 24 oraz PostgreSQL 17. Mając własną bazę, podstaw jej dane w parametrze połączenia. Poniżej przykład z osobnym PostgreSQL w Dockerze i portem `15432`.

```bash
docker run -d --name hexorait-dev-db -p 127.0.0.1:15432:5432 \
  -e POSTGRES_DB=HexoraITApp -e POSTGRES_USER=HexoraIT \
  -e POSTGRES_PASSWORD=local-dev-only postgres:17
docker exec hexorait-dev-db pg_isready -h localhost -U HexoraIT -d HexoraITApp
```

Po komunikacie `accepting connections` uruchom API z katalogu głównego repozytorium. Jeśli przeglądarka nie ufa certyfikatowi deweloperskiemu, zaufaj mu w systemie i przeglądarce.

```bash
dotnet dev-certs https --trust
export ConnectionStrings__Default='Host=localhost;Port=15432;Database=HexoraITApp;Username=HexoraIT;Password=local-dev-only'
export AppSettings__HexoraITAdmin='admin@example.test'
export AppSettings__InitialAdminPassword='Local-demo-pass-123!'
ASPNETCORE_ENVIRONMENT=Development dotnet run --project HexoraITApi/HexoraIT.Api \
  --no-launch-profile --urls https://localhost:7121
```

W drugim terminalu uruchom frontend. Otwórz <http://localhost:8443> i zaloguj się kontem z przykładu, jeśli baza jest nowa.

```bash
npm ci --prefix HexoraITWeb
npm run dev --prefix HexoraITWeb
```

Aby obejrzeć interfejs bez API i bazy, po zainstalowaniu zależności uruchom `npm run dev --prefix HexoraITWeb -- --mode demo`. Konta demonstracyjne są wyświetlane na ekranie logowania.

## Uruchomienie przez Docker Compose

Skopiuj `.env.example` do `.env` i przygotuj lokalny plik Compose według [instrukcji wdrożenia](docs/deployment.md). Ustaw osobne hasło PostgreSQL, klucz JWT, adres aplikacji i dane pierwszego administratora.

```bash
docker compose -f docker-compose-app.yml -f docker-compose-dbs.yml \
  -f docker-compose.local.yml up -d --build db api frontend
```

W wariancie lokalnym otwórz <http://127.0.0.1:8080>. CyberAudit Studio jest częścią obrazu frontendu i uruchamia się z menu **Przeprowadź audyt** pod `/audyt`.

## Dokumentacja

- [Uruchomienie, wdrożenie i kopie zapasowe](docs/deployment.md)
- [API i lista endpointów](docs/api/overview.md)
- [Praca w organizacji i historia audytów](docs/user-guide.md)
- [Architektura, rozwój i testy](docs/development.md)

Kod jest dostępny na [licencji MIT](LICENSE).
