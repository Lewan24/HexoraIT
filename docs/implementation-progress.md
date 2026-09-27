# Postęp wdrożenia refaktoryzacji i zabezpieczeń

Ostatnia aktualizacja: 2026-09-27.

## Aktualny etap

Etapy 0–2 zakończone w wersji wstępnej. Etap 3 i P2.1 trwają: partie P0 oraz duża część P1 są wdrożone, walidacja obejmuje główne wejścia, a kompatybilna paginacja działa dla samodzielnych endpointów listujących. Rozpoczęto hardening frontendu z Etapu 5 oraz Etap 4: moduły wersji, Auth, assets, contacts i groups działają już jako Minimal API. Następny krok: kolejne proste moduły CRUD wraz z testami kontraktowymi.

## Wykonane

- Przeczytano `docs/refactor-instructions.md` i zinwentaryzowano backend, frontend, testy, konfigurację, deployment oraz dokumentację.
- Zinwentaryzowano 136 akcji HTTP w 23 konkretnych kontrolerach.
- Utworzono `docs/audit/01-system-inventory.md` do `07-implementation-plan.md`.
- Zbudowano mapę przepływu danych i model STRIDE.
- Uruchomiono baseline backendu: 131/131 testów przeszło.
- Zainstalowano zależności frontendowe zgodnie z istniejącym lockfile (bez jego zmiany), uruchomiono 11/11 testów i poprawny build.
- Uruchomiono `npm audit`: wykryto 1 high w `xlsx` (dwa advisory).
- Próba pełnego audytu NuGet była zablokowana przez sieć; build wykrył NU1903/high w `SQLitePCLRaw.lib.e_sqlite3` 2.1.11.
- Usunięto wartości poświadczeń DB i klucza JWT ze śledzonej konfiguracji; Compose wymaga `HEXORAIT_DB_PASSWORD` i `HEXORAIT_JWT_SIGNING_KEY`.
- Bootstrap administratora wymaga jednorazowego hasła minimum 15 znaków i nie rejestruje go w logu.
- Dodano `User.SecurityStamp`, claim JWT, walidację aktualnego konta przy każdym tokenie i obracanie znacznika po blokadzie, zmianie roli, resecie lub zmianie własnego hasła.
- Wygenerowano addytywną migrację `20260926205537_AddUserSecurityStamp`.
- Zaktualizowano dotychczasową instrukcję instalacji, usuwając domyślne hasło.
- Dodano testowy host HTTP oparty na `WebApplicationFactory` i SQLite; produkcyjny inicjalizator jest podmieniany przez `IAppInitializer` wyłącznie w teście.
- Test HTTP potwierdza natychmiastowe odrzucenie JWT po zmianie `SecurityStamp`.
- Dodano rate limiting loginu/rejestracji: 10 prób/minutę na źródłowy IP, bez kolejki, status 429.
- Dodano Problem Details dla wyjątków/pustych statusów, `traceId`, `X-Correlation-ID`, HSTS i nagłówki bezpieczeństwa API.
- Dodano konfigurację security headers i cache dla produkcyjnego nginx/SPA.
- Logowanie lub przełączenie na obcą organizację zwraca kontrolowane 401/403 zamiast nieobsłużonego wyjątku.
- Usunięto podatną bibliotekę `xlsx`; podgląd wykorzystuje ExcelJS ładowany dynamicznie i tekstowe komórki React bez raw HTML.
- Podgląd XLSX ma limity 10 MB, 1000 wierszy i 100 kolumn oraz test regresyjny.
- Dodano centralną walidację uploadów: limity, normalizacja nazw, detekcja sygnatur PDF/PNG/JPEG/GIF/WEBP oraz struktury DOCX/XLSX, bez zaufania do MIME klienta.
- Storage generuje nieprzewidywalne nazwy blobów, kanonikalizuje ścieżki i odrzuca traversal; test sprawdza zapis, odczyt i próbę `../`.
- Pobrania plików używają bezpiecznych nazw i disposition; potencjalnie aktywna/nieznana zawartość nie jest renderowana inline.
- Operacje plik+baza w eksploratorze, umowach i gwarancjach mają poprawioną kolejność oraz kompensację z logowaniem błędów.
- Dodano oddzielną kategorię strukturalnego audytu bezpieczeństwa dla udanych logowań, zmian kont i odpowiedzi 401/403/429, bez sekretów, body i query.
- `X-Forwarded-For` i `X-Forwarded-Proto` są honorowane tylko od dokładnych adresów z `ReverseProxy:KnownProxies`, z limitem jednego hopu; lista jest domyślnie pusta.
- Kontrakty rejestracji, logowania, profilu i operacji administracyjnych mają limity zgodne z kolumnami; nowe i zmieniane hasła wymagają minimum 15, maksymalnie 200 znaków.
- Frontend egzekwuje tę samą politykę dla tworzenia klienta/użytkownika, resetu i zmiany hasła; logowanie zachowuje zgodność z istniejącymi kontami.
- Zapis diagramu ma limit 4 MB, 2000 węzłów, 4000 krawędzi oraz limity pól tekstowych; test HTTP odrzuca kolekcję 2001 węzłów przed operacją bazodanową.
- Dodano limity liczby i długości elementów dla tagów, członków grup, systemów incydentu, powiązanych zasobów, dashboardu, ról i uprawnień; standardowe pola tekstowe mają limity zgodne z bazą lub przeznaczeniem.
- Test HTTP modułu assets potwierdza 400 Problem Details dla 101 tagów i brak częściowego zapisu do bazy.
- Przegląd `catch` nie wykazał już pustych bloków; nieudane sprzątanie blobu jest logowane i nie maskuje pierwotnego błędu zapisu pliku lub bazy.
- `GET /api/assets` obsługuje strony 1–10000 po maksymalnie 200 rekordów, stabilne sortowanie i nagłówki metadanych; tryb legacy jest ograniczony do 1000 rekordów i sygnalizuje ucięcie.
- Frontendowy `http.getAllPages` automatycznie składa strony po 200 rekordów z bezpiecznikiem 100 stron, więc istniejące komponenty nadal otrzymują tablicę bez zmiany UX.
- Kontrakt i kolejność dalszego wdrażania paginacji zapisano w `docs/audit/08-pagination-contract.md`.
- Wspólny model paginacji i obsługa w `OrgScopedController` usuwają duplikację; kontrakt rozszerzono na contacts, groups, licenses, plans, incidents i knowledge wraz z klientami frontendu.
- Walidacja paginacji odrzuca brak jednego z parametrów oraz `pageSize` powyżej 200 jako kontrolowane 400.
- Paginację rozszerzono na projects, tasks, subnets, contracts, warranties i passwords; filtry są stosowane przed zliczaniem i stronicowaniem.
- Odsłonięcie wpisu z sejfu generuje strukturalne zdarzenie `password_revealed` z identyfikatorami użytkownika, zasobu i organizacji, bez wartości sekretu, nazwy i loginu; test potwierdza wywołanie audytu.
- Paginację rozszerzono na foldery i pliki eksploratora, aktywne i usunięte organizacje, członków organizacji oraz użytkowników panelu administracyjnego; sortowanie ma jawny klucz rozstrzygający, a frontend pobiera wszystkie strony wspólnym klientem.
- Paginację rozszerzono na role organizacyjne, opcje zasobów, klientów, uprawnienia klientów i prywatne notatki. Walidacja indywidualnych reguł nie pobiera już całej tabeli zasobów, tylko liczy wskazane identyfikatory bezpośrednio w bazie.
- Pierwszy pionowy wycinek Minimal API jest gotowy: kontroler `AppVersionController` zastąpiono grupą `/api/version`, zachowano odpowiedzi `/api/version` i `/api/version/latest`, przekazywany jest token anulowania, a test pełnego hosta sprawdza kontrakt i rejestrację obu tras.
- Moduł Auth przeniesiono do Minimal API: sześć endpointów zachowuje ścieżki, statusy, rate limiting, autoryzację, rotację `SecurityStamp` i audyt. Logikę wydzielono do `IAuthService`, a dotychczasowe testy kontrolera przeniesiono na serwis.
- Dodano wspólny filtr DataAnnotations dla Minimal API, który waliduje zarówno zwykłe właściwości, jak i atrybuty parametrów rekordów pozycyjnych; test hosta potwierdza 400 Problem Details przed wykonaniem logiki.
- Audyt ma stabilne `EventId` 1001/1101/1201/1901, `EventType`, `TraceId` i adres źródłowy bez body, query, tokenów i sekretów. Kontrakt zewnętrznego sinka, retencji, alertów i odbioru zapisano w `docs/security/security-audit-operations.md`.
- Produkcyjny `appsettings.json` nie zawiera domyślnego adresu ani hasła bootstrap administratora; lokalny `appsettings.Development.json` pozostaje bez zmian zgodnie z decyzją właściciela.
- Moduł assets przeniesiono w całości do Minimal API: sześć tras wymaga autoryzacji, jawnie używa uprawnienia `assets`, zachowuje filtrowanie zasobowe, walidację DTO, paginację, nagłówki i odpowiedzi 201/204/403/404.
- Logikę assets wydzielono do `IAssetService`; testy kontrolera zastąpiono testami serwisu, a istniejące testy pełnego hosta nadal potwierdzają dwie strony bez duplikatów, tryb legacy i odrzucenie nadmiarowych tagów.
- Dodano wspólny `ApiOperationResult` i mapowanie odpowiedzi HTTP/paginacji wykorzystywane przez Auth i assets, co ogranicza duplikację przed migracją następnych modułów.
- Moduł contacts przeniesiono do Minimal API i `IContactService`; sześć tras zachowuje paginację, walidację, operację gwiazdki oraz jawne uprawnienie `contacts`. Dodano test odmowy zapisu dla członka tylko do odczytu.
- Moduł groups przeniesiono do Minimal API i `IGroupService`; pięć tras używa jawnego uprawnienia `groups`. Tworzenie i aktualizacja odrzucają teraz identyfikatory assets niewidoczne lub należące do innej organizacji, bez ujawniania ich istnienia.
- Test regresyjny groups potwierdza 400 i brak zapisu dla odwołania cross-tenant; testy metadanych potwierdzają obowiązkową autoryzację wszystkich tras contacts/groups.

## Najważniejsze decyzje

- Minimum weryfikacyjne: ASVS 5.0.0 Level 2; wybrane kontrole L3 dla sejfu, administratorów, kryptografii i audytu.
- Najpierw naprawy P0/P1 i testy pełnego potoku HTTP, potem migracja kontrolerów do Minimal API partiami.
- Zachować publiczne ścieżki i DTO, a logikę biznesową wydzielać przed migracją tylko tam, gdzie jest to potrzebne.
- Frontendowe sprawdzanie uprawnień pozostaje wyłącznie kontrolą UX.

## Wykryte problemy

- P0 (tymczasowe ryzyko zaakceptowane przez właściciela): `appsettings.Development.json` pozostaje lokalną konfiguracją uruchomieniową z poświadczeniami; właściciel usunie plik ręcznie przed publikacją. Plik nie może trafić do commita/artefaktu ani środowiska współdzielonego.
- P0 (działanie operatora): obrót historycznie ujawnionych poświadczeń DB/JWT.
- P1: aplikacyjny schemat audytu i kontrakt operacyjny są gotowe, ale zewnętrzny, odporny na manipulację sink, retencja i alerty nadal wymagają infrastruktury oraz odbioru przez właściciela; Problem Details nie obejmuje szczegółowych wyjątków domenowych.
- P1: uploady nie mają jeszcze produkcyjnego skanera antymalware; DOCX wymaga dalszej oceny izolacji renderera.
- P1 (wdrożeniowe): operator musi podać dokładny adres każdego zaufanego reverse proxy, aby limiter rozróżniał klientów; nagłówki z innych źródeł są ignorowane.
- P2: główne wejściowe DTO i kolekcje JSON mają limity; wszystkie samodzielne endpointy listujące mają ograniczony kontrakt. Zagnieżdżone kolekcje (np. adresy IP w stronie podsieci) wymagają jeszcze pomiaru i ewentualnego osobnego kontraktu.
- P2: moduły wersji, Auth, assets, contacts i groups są już Minimal API; pozostałych 18 konkretnych kontrolerów jest migrowanych partiami.
- P2: klucze licencyjne plaintext, key-ring bez ochrony at-rest, migracje DB przy starcie.
- Testy backendu uruchamiają pełny host HTTP na SQLite, ale nie obejmują jeszcze rzeczywistego PostgreSQL.

## Wyniki ostatnich testów

- Backend: PASS 159/159, w tym kontrakty Minimal API wersji/Auth/assets/contacts/groups, test cross-tenant powiązanego zasobu, metadane autoryzacji, paginacja i walidacja przed akcją.
- Frontend: PASS 13/13.
- Frontend lint: PASS.
- Frontend build: PASS; główny JS 1,18 MB, ExcelJS jako osobny dynamiczny chunk 0,93 MB.
- npm audit: PASS, 0 podatności.
- NuGet online audit: nieweryfikowalny (blokada sieci); NU1903 ujawniony podczas builda.

## Istotne zmodyfikowane pliki

- Backend: konfiguracja/startup, inicjalizacja admina, JWT, encja User, kontrolery auth/admin, migracja i testy JWT/auth/admin.
- Backend: rate limiting, Problem Details, korelacja/nagłówki, interfejs inicjalizatora i testowy host HTTP.
- Frontend: `FilePreviewModal`, zależności/lockfile, nginx i test bezpieczeństwa preview.
- Deployment: `docker-compose.yml` i `installation.md`.
- Dokumentacja: `docs/audit/` i ten rejestr postępu.
- `npm install` utworzył lokalny `node_modules`; lockfile pozostał bez zmian.

## Następne działania

1. Migrować kolejne proste moduły CRUD (`incidents`, `knowledge`, `licenses`, `plans`) z użyciem wspólnego wyniku, walidacji i jawnej autoryzacji zasobowej.
2. Rozszerzać testy kontraktowe każdej partii i usuwać kontroler dopiero po potwierdzeniu zgodności.
3. Ocenić rozmiar zagnieżdżonych kolekcji w odpowiedziach i dodać osobne limity tylko tam, gdzie nie złamią rzeczywistego UX.

## Blokery / czynności właściciela

- Po usunięciu sekretów z repozytorium trzeba obrócić każdy klucz JWT i hasło DB, które mogły być używane poza lokalnym środowiskiem.
- Właściciel zdecydował pozostawić `appsettings.Development.json` do lokalnego uruchamiania i usunąć go ręcznie przed publikacją; automaty nie mogą go commitować ani pakować.
- Docelowa ochrona kluczy Data Protection (certyfikat/KMS/secret store), malware scanner, MFA i model uprawnień produkcyjnej bazy wymagają decyzji/infrastruktury właściciela.
- Operator musi podłączyć kategorię `HexoraIT.SecurityAudit` do zewnętrznego append-only/SIEM zgodnie z `docs/security/security-audit-operations.md` i przeprowadzić opisany odbiór; stdout kontenera nie jest trwałym sinkiem.
- Należy potwierdzić zgodność licencji Fluent Assertions 8 dla sposobu użycia projektu.
