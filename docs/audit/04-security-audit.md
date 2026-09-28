# Wstępny audyt bezpieczeństwa

Zakres odniesienia: OWASP Top 10:2025 i OWASP ASVS 5.0.0 Level 2, dostosowane do aplikacji przechowującej topologię, adresację, hasła i dokumentację IT. Oficjalne źródła: [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/) i [OWASP ASVS 5.0.0](https://owasp.org/projects/asvs/).

Statusy: **potwierdzone** — dowód w kodzie/skanie; **ryzyko** — wiarygodna ścieżka wymagająca testu; **nieweryfikowalne** — brak infrastruktury lub dostępu.

## Rejestr ustaleń

| ID | Ryzyko | Status | Komponent i dowód | OWASP / ASVS | Naprawa i test |
|---|---|---|---|---|---|
| SEC-001 | krytyczne | potwierdzone | `appsettings.json` zawiera działające hasło DB i klucz JWT; compose zawiera słabe wartości domyślne | A02, A04; v5.0.0-14.2.2 | usunąć sekrety, fail-fast dla braków, env/secret store; test konfiguracji |
| SEC-002 | krytyczne | potwierdzone | `AppInitializer` loguje jawne hasło pierwszego administratora | A02, A07, A09; v5.0.0-6.3.2 | jawne bezpieczne provisionowanie bez logowania hasła; test przechwyconych logów |
| SEC-003 | wysokie | potwierdzone | JWT 8 h bez wersji sesji; blokada, reset/zmiana hasła i roli nie cofają tokenu; admin oparty na starym claimie | A01, A07; v5.0.0-7.4.1/7.4.2 | security stamp/token version + walidacja; negatywne testy po zmianie stanu |
| SEC-004 | wysokie | potwierdzone | brak rate limiting/anti-automation na loginie, rejestracji i resetach | A07; v5.0.0-6.1.1, 6.3.1 | natywny limiter ASP.NET, 429, test limitu i izolacji |
| SEC-005 | wysokie | potwierdzone | `xlsx` 0.18.5 ma dwie znane podatności high i przetwarza uploady użytkowników | A03, A08 | usunąć/zastąpić parser lub izolować; test z plikiem regresyjnym |
| SEC-006 | wysokie | potwierdzone | upload ufa MIME/nazwie; brak allowlisty, sygnatur i skanowania; treść może być inline | A06; v5.0.0-3.2.1, 5.3.2, 5.4.3 | polityka typów, bezpieczne disposition, punkt skanowania; testy polyglot/oversize |
| SEC-007 | wysokie | potwierdzone | brak centralnej obsługi wyjątków; `switch-org` rzuca wyjątek; puste `catch`; możliwe niespójności DB/storage | A10; v5.0.0-15.* | Problem Details, kontrolowane błędy i logowanie, kompensacja; test 4xx/5xx |
| SEC-008 | wysokie | potwierdzone | brak logu audytowego logowań, odmów, zmian ról, pobrań sekretów i operacji admina | A09; v5.0.0-16.* | oddzielny audyt bez sekretów + hook alertowy; test treści/redakcji |
| SEC-009 | średnie/wysokie | potwierdzone | JWT w `localStorage`; brak CSP i części nagłówków; skuteczny XSS przejmuje sesję | A02, A07; v5.0.0-3.4.1–3.4.6 | CSP/nosniff/frame/referrer/HSTS; docelowo ocenić cookie BFF/HttpOnly |
| SEC-010 | wysokie | ryzyko | `sheet_to_html` trafia do `dangerouslySetInnerHTML`; potrzebny test escaping/bypass | A05; v5.0.0-3.2.2 | usunąć HTML injection lub sanitizować sprawdzoną biblioteką; test XSS |
| SEC-011 | wysokie | potwierdzone | większość DTO bez limitów; nieograniczone kolekcje/diagram i brak globalnego limitu JSON | A05, A06, A10; v5.0.0-2.2.* | walidatory i limity zgodne z kolumnami/biznesem; testy graniczne |
| SEC-012 | średnie | potwierdzone | klucze licencyjne w plaintext; klucze Data Protection na wolumenie bez ochrony at-rest | A04; v5.0.0-8.* | klasyfikacja danych, szyfrowanie licencji, ochrona KEK/KMS/certyfikatem |
| SEC-013 | średnie | potwierdzone | automatyczne migracje na starcie wymagają szerokich praw DB i zwiększają blast radius | A02, A06 | osobny krok migracji i konto runtime least privilege |
| SEC-014 | średnie | potwierdzone | brak paginacji na listach i kosztownych limitów diagramów/plików | A06, A10 | bezpieczne limity/paginacja po pomiarze UX; testy DoS logicznego |
| SEC-015 | średnie | potwierdzone | hasła min. 8, bez kontroli haseł przejętych; brak MFA dla admina | A07; v5.0.0-6.2.1, 6.2.8, 6.3.3 | polityka 15 znaków dla nowych haseł, breach check z prywatnością, plan MFA |
| SEC-016 | średnie | potwierdzone | obrazy Docker i akcje build nie są pinowane digestem; brak CI/SBOM/skanów | A03, A08 | pinning, CI, dependency review, SBOM i podpisy obrazów |

## Ocena OWASP Top 10:2025

- **A01 Broken Access Control:** dotyczy bezpośrednio. Istnieje rozbudowana kontrola organizacja/zasób oraz dobre testy IDOR/BOLA. Najważniejsza luka to nieodwoływalne, nieaktualne claimy JWT. Nie znaleziono potwierdzonego cross-tenant odczytu w objętych testami encjach.
- **A02 Security Misconfiguration:** potwierdzone sekrety, brak nagłówków, `AllowedHosts: *`, automatyczne migracje i niedookreślona konfiguracja proxy/HTTPS.
- **A03 Software Supply Chain Failures:** potwierdzone podatne `xlsx` i SQLite testowe; brak automatycznej kontroli zależności i artefaktów.
- **A04 Cryptographic Failures:** PBKDF2 i Data Protection są sensownymi mechanizmami. Ryzyko stanowią ujawniony klucz JWT, ochrona key-ring oraz plaintext license keys.
- **A05 Injection:** EF LINQ ogranicza SQL injection, brak wywołań shell/raw SQL. React domyślnie koduje tekst. Potencjalny DOM XSS istnieje w podglądzie XLSX.
- **A06 Insecure Design:** brak modelu zagrożeń, walidacji globalnej, paginacji, bezpiecznego lifecycle uploadu i pełnej strategii sesji.
- **A07 Authentication Failures:** brak anti-bruteforce, revocation i MFA; pozytywy to stałoczasowe PBKDF2, generyczny błąd złych danych i sprawdzanie blokady przy loginie.
- **A08 Software/Data Integrity Failures:** parser dokumentów i niepinowany supply chain; migracje są w repozytorium, ale brak kontroli artefaktu wdrożeniowego.
- **A09 Security Logging & Alerting Failures:** brak audytu i alertów; jedyny security log ujawnia hasło.
- **A10 Mishandling of Exceptional Conditions:** brak globalnego handlera, niejawne 500, puste catch i operacje plik+baza bez pełnej kompensacji.

## Obszary nieweryfikowalne

TLS/reverse proxy, uprawnienia wolumenów i konta DB, backup/restore, rotacja sekretów, centralne logi/alerty i izolacja sieciowa zależą od rzeczywistego wdrożenia. Audyt NuGet online był zablokowany. Nie wykonano testów DAST ani malware scanning.

## Status napraw

- SEC-001: **zaimplementowane produkcyjnie; tymczasowy wyjątek deweloperski zaakceptowany przez właściciela** — Compose i konfiguracja produkcyjna wymagają sekretów z zewnątrz. Właściciel polecił zachować lokalny `appsettings.Development.json` i usunąć go ręcznie przed publikacją; nie może zostać zacommitowany ani dołączony do artefaktu.
- SEC-002: **zaimplementowane i zweryfikowane przeglądem/testami regresji** — bootstrap wymaga jawnie dostarczonego hasła jednorazowego (min. 15 znaków), a log zawiera tylko e-mail i instrukcję usunięcia sekretu.
- SEC-003: **zaimplementowane i zweryfikowane** — addytywna migracja `AddUserSecurityStamp`, claim i walidacja DB oraz obracanie po zmianach wrażliwych; test pełnego hosta potwierdza zmianę odpowiedzi z 200 na 401 po rotacji znacznika.
- SEC-004: **zaimplementowane i zweryfikowane dla login/register** — stałe okno 10 żądań/minutę na adres źródłowy, bez kolejki, odpowiedź 429 Problem Details. `ForwardedHeaders` akceptuje jeden hop wyłącznie od dokładnych adresów `ReverseProxy:KnownProxies`; operator musi uzupełnić listę przy wdrożeniu za proxy.
- SEC-005: **naprawione i zweryfikowane** — usunięto `xlsx`, zastosowano dynamicznie ładowany ExcelJS z poprawioną wersją tranzytywnego `uuid`; `npm audit` zgłasza 0 podatności.
- SEC-006: **częściowo naprawione i zweryfikowane** — scentralizowana polityka uploadów egzekwuje limity, bezpieczne nazwy, sygnatury PDF/obrazów/Office ZIP oraz nie ufa MIME klienta; aktywna lub nieznana zawartość jest pobierana jako binarna, a odpowiedzi używają bezpiecznego `Content-Disposition`. Frontend ogranicza podgląd DOCX do 10 MB i renderuje go w ramce `sandbox` bez wykonywania skryptów oraz bez referrera. Nadal brakuje produkcyjnego skanera antymalware, a renderer DOCX wymaga pogłębionej oceny przed uznaniem izolacji za kompletną.
- SEC-007: **naprawione w zidentyfikowanym zakresie i zweryfikowane przeglądem/testami** — dodano centralne Exception Handler/Status Code Pages z `traceId`; operacje upload/delete zapisują metadane przed usuwaniem starego blobu, sprzątają po błędzie DB i logują błędy kompensacji. Brak pustych `catch`; wtórny błąd cleanup nie maskuje pierwotnego wyjątku.
- SEC-008: **częściowo naprawione; kod i kontrakt integracyjny gotowe** — oddzielna kategoria `HexoraIT.SecurityAudit` rejestruje udane logowania, zmiany kont, odrzucenia 401/403/429 oraz odsłonięcia haseł ze stabilnymi `EventId`, `EventType`, `TraceId` i adresem źródłowym, bez tokenów, wartości haseł, body, query, nazw i e-maili. `docs/security/security-audit-operations.md` definiuje retencję, alerty i odbiór. Brakuje podłączonego przez operatora zewnętrznego sinka odpornego na manipulację.
- SEC-009: **częściowo naprawione** — API oraz produkcyjny nginx emitują nagłówki bezpieczeństwa; bearer token nadal jest przechowywany w `localStorage`.
- SEC-010: **naprawione i zweryfikowane** — arkusz jest renderowany jako tekst przez React bez `dangerouslySetInnerHTML`, z limitami 10 MB, 1000 wierszy i 100 kolumn.
- SEC-011: **w większości naprawione i zweryfikowane** — kontrakty kont i CRUD ograniczają pola tekstowe; diagram ma limit 4 MB, 2000 węzłów i 4000 krawędzi; kolekcje JSON ograniczają liczbę oraz długość elementów. Groups weryfikuje teraz, że `LinkedAssets` są widoczne i należą do tej samej organizacji; test potwierdza 400 i brak zapisu dla ID cross-tenant. Testy hosta potwierdzają 400 `ValidationProblemDetails` i brak zapisu. Pozostaje przegląd rzadszych kontraktów przy migracji modułów.
- SEC-015: **częściowo naprawione** — wszystkie ścieżki tworzenia/resetu/zmiany hasła wymagają co najmniej 15 znaków, a UI odzwierciedla politykę; logowanie zachowuje zgodność ze starszymi kontami. Kontrola haseł przejętych i MFA administratorów pozostają do zaprojektowania.
- SEC-014: **w większości naprawione i zweryfikowane** — wszystkie samodzielne endpointy listujące mają stabilną paginację do 200 rekordów/stronę, metadane i ograniczony tryb zgodności; klient automatycznie składa strony z limitem 20000 rekordów. Diagram, uploady i wejściowe kolekcje mają osobne limity. Pozostaje ocena rosnących kolekcji zagnieżdżonych, szczególnie adresów IP podsieci.
