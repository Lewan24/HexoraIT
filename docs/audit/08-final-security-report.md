# Końcowy raport bezpieczeństwa i refaktoryzacji

Stan na 2026-09-27. Raport porównuje aktualny kod z audytem początkowym w `04-security-audit.md` i planem naprawczym w `06-remediation-plan.md`. Nie jest certyfikatem zgodności.

## Wynik kontroli końcowej

- Etapy 0–2: zakończone — inwentaryzacja, model zagrożeń i plan wdrożenia są zapisane w `docs/audit/`.
- Etap 3: zakończony w zakresie możliwym w kodzie; otwarte pozostają zabezpieczenia wymagające infrastruktury lub decyzji operatora.
- Etap 4: zakończony — API nie rejestruje MVC i nie zawiera klas dziedziczących po `ControllerBase`; kontrakt obejmuje 77 ścieżek `/api/*`.
- Etap 5: zakończony w zaplanowanym zakresie — wspólny klient HTTP, sesja, błędy, limity formularzy, pliki, routing i kontrakty API zostały ujednolicone bez przebudowy wyglądu aplikacji.
- Etap 6: zakończony dla automatyzacji dostępnej lokalnie; brak testu z rzeczywistym PostgreSQL i pełnego testu przeglądarkowego end-to-end.
- Etapy 7–8: zakończone — dokumentacja techniczna, użytkownika i administratora istnieje i odpowiada aktualnej architekturze.
- Etap 9: kontrola kodu zakończona. Aplikacja może przejść do manualnych testów praktycznych, ale wdrożenie produkcyjne wymaga zamknięcia czynności operatorskich opisanych poniżej.

## Porównanie ustaleń audytu

| ID | Stan końcowy | Dowód i pozostałe ryzyko |
|---|---|---|
| SEC-001 | częściowo zamknięte | Produkcyjna konfiguracja zawiera wyłącznie jawne placeholdery i startup działa fail-fast. Śledzony `appsettings.Development.json` pozostaje zaakceptowanym wyjątkiem lokalnym; historyczne sekrety trzeba obrócić. |
| SEC-002 | zamknięte | Bootstrap administratora wymaga hasła jednorazowego min. 15 znaków i nie zapisuje go w logu. |
| SEC-003 | zamknięte | `SecurityStamp` jest sprawdzany przy każdym JWT i obracany po zmianach bezpieczeństwa; test hosta potwierdza natychmiastowe 401. |
| SEC-004 | zamknięte w ustalonym zakresie | Login i rejestracja mają limiter 10/min/IP i 429; zaufanie do proxy wymaga dokładnej listy adresów operatora. |
| SEC-005 | zamknięte | Usunięto podatny pakiet `xlsx`; używany jest ExcelJS, a `npm audit` zwraca 0 podatności. |
| SEC-006 | częściowo zamknięte | Walidacja sygnatur, nazw, rozmiarów, typów Office i bezpieczne pobieranie są wdrożone. Brakuje produkcyjnego skanera antymalware. |
| SEC-007 | zamknięte w zidentyfikowanym zakresie | Problem Details, korelacja, bezpieczna kompensacja storage/DB i brak pustych bloków `catch`. |
| SEC-008 | częściowo zamknięte | Kod generuje strukturalny audyt bez sekretów. Zewnętrzny append-only sink/SIEM, retencja i alerty wymagają konfiguracji operatora. |
| SEC-009 | częściowo zamknięte | CSP i pozostałe nagłówki są wdrożone; bearer token nadal jest przechowywany w `localStorage`, więc XSS pozostaje zagrożeniem dla sesji. |
| SEC-010 | zamknięte | Podgląd arkuszy renderuje ograniczony tekst React bez `dangerouslySetInnerHTML`. |
| SEC-011 | w większości zamknięte | Główne DTO, kolekcje i diagram mają limity oraz testy negatywne. Dalsze limity należy dodawać tylko na podstawie rzeczywistych pomiarów UX. |
| SEC-012 | otwarte | Klucze licencyjne pozostają plaintext, a key-ring Data Protection nie ma potwierdzonej ochrony at-rest certyfikatem/KMS. |
| SEC-013 | otwarte | Migracje bazy nadal są wykonywane podczas startu aplikacji; docelowo potrzebny jest osobny migrator i konto runtime o mniejszych uprawnieniach. |
| SEC-014 | w większości zamknięte | Samodzielne listy mają stabilną paginację i limity. `SubnetDto.Ips` wymaga w przyszłości osobnego kontraktu, jeżeli pomiary wykażą wzrost odpowiedzi. |
| SEC-015 | częściowo zamknięte | Nowe i zmieniane hasła wymagają min. 15 znaków. Brakuje prywatnej kontroli haseł przejętych i MFA administratorów. |
| SEC-016 | częściowo zamknięte | Dodano CI dla backendu, frontendu i dryfu OpenAPI. Brakuje SBOM, podpisywania artefaktów oraz pinowania obrazów i akcji do digestów/SHA. |

## Kontrola zapytań LINQ i PostgreSQL

Usunięto konwersję `enum.ToString()` z trzech zapytań wykonywanych przez bazę: listy użytkowników administratora oraz aktywnych i usuniętych organizacji. SQL pobiera teraz surowy enum, a konwersja do kontraktu tekstowego następuje po ograniczonej paginacją materializacji.

Test `PostgreSqlQueryTranslationTests` używa produkcyjnego providera Npgsql i wymusza wygenerowanie SQL bez połączenia z bazą dla 17 głównych projekcji serwisowych. Obejmuje filtry tenantowe, kolekcje JSON, AutoMapper `ProjectTo`, organizacje, użytkowników, prywatne notatki i `SubnetDto.Ips`. Wszystkie sprawdzone zapytania są tłumaczone poprawnie. Test nie zastępuje wykonania zapytań na rzeczywistym PostgreSQL.

## Wyniki ostatniej automatycznej weryfikacji

| Zakres | Wynik |
|---|---|
| Backend `.NET` | PASS 149/149 |
| Translacja zapytań Npgsql | PASS 17/17 kształtów zapytań w jednym teście parametrycznym |
| Frontend Node | PASS 36/36 |
| ESLint | PASS |
| Build frontend | PASS; główny JS ok. 400 kB, brak ostrzeżenia o dużych chunkach |
| `npm audit --audit-level=high` | PASS, 0 podatności |
| `git diff --check` | PASS |
| Kontrakt OpenAPI | OpenAPI 3.0.4, wersja 1.0, 77 ścieżek `/api/*` |

Ekrany funkcjonalne są ładowane przez `React.lazy`. ExcelJS pozostaje celowo osobnym chunkiem około 930 kB, pobieranym wyłącznie przy podglądzie XLSX; `docx-preview` jest analogicznie pobierany dopiero przy podglądzie DOCX. Limit ostrzeżenia 1000 kB nadal wykryje dalszy istotny wzrost największego chunka.

Build/test backendu nadal zgłasza `NU1903` dla `SQLitePCLRaw.lib.e_sqlite3` 2.1.11 używanego przez projekt testowy. Biblioteka nie jest zależnością produkcyjnego API, ale powinna zostać zaktualizowana, gdy zgodna wersja stosu testowego SQLite będzie dostępna i zweryfikowana.

## Ograniczenia kontroli

- Nie wykonano integracji z rzeczywistym PostgreSQL; użyto SQLite dla testów wykonawczych i Npgsql dla testów translacji SQL.
- Nie wykonano testów pod docelowym reverse proxy, certyfikatem TLS ani docelowym CORS origin.
- Nie wykonano aktywnego skanowania antymalware i testów integracji z SIEM.
- Nie wykonano zewnętrznego testu penetracyjnego, testów obciążeniowych ani pełnego E2E w przeglądarce.
- Manualne scenariusze biznesowe i jakość UX pozostają do odbioru przez właściciela.

## Warunki przed produkcją

1. Obrócić wszystkie historycznie użyte hasła DB i klucze JWT oraz usunąć lokalne sekrety z publikowanego artefaktu.
2. Skonfigurować dokładne `ReverseProxy:KnownProxies`, produkcyjne originy CORS i HTTPS.
3. Podłączyć `HexoraIT.SecurityAudit` do trwałego append-only sinka/SIEM oraz potwierdzić retencję i alerty.
4. Zapewnić ochronę key-ringu Data Protection i kopię zapasową kluczy; ustalić szyfrowanie kluczy licencyjnych.
5. Uruchomić migracje oddzielnym kontem/procesem i ograniczyć prawa konta runtime.
6. Podłączyć skaner antymalware dla uploadów albo formalnie zaakceptować ryzyko do czasu wdrożenia.
7. Wykonać smoke test i test autoryzacji na kopii docelowego PostgreSQL oraz test odtworzenia backupu.
8. Zaplanować MFA administratorów, kontrolę haseł przejętych, SBOM i podpisywanie artefaktów.

## Rekomendacja odbiorowa

Kod jest gotowy do manualnych testów funkcjonalnych w środowisku nieprodukcyjnym. Rekomendacja dla produkcji pozostaje warunkowa: pozycje 1–7 z powyższej listy wymagają wykonania lub jawnej, udokumentowanej akceptacji ryzyka przez właściciela systemu.
