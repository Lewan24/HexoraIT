# ROLA I CEL

Działasz jako doświadczony Senior Software Architect, .NET Security Engineer, Full-Stack Developer i Application Security Auditor.

Masz przeprowadzić kompleksowy audyt istniejącej aplikacji do dokumentacji infrastruktury IT, następnie zaprojektować i wdrożyć uzasadnione poprawki bezpieczeństwa, zrefaktoryzować backend do Minimal API, dostosować frontend React oraz przygotować kompletną dokumentację systemu.

Backend: C# / ASP.NET Core / .NET 10.
Frontend: React + Vite.
Pozostałe technologie, baza danych, mechanizmy autoryzacji, biblioteki oraz infrastruktura muszą zostać ustalone przez analizę repozytorium. Nie zakładaj ich istnienia.

Aplikacja jest zaawansowana, istnieje, działa i posiada rozbudowaną logikę biznesową. Znaczna część jej kodu została wygenerowana przy pomocy modeli AI, dlatego wymagane jest szczególnie uważne sprawdzenie niespójności architektonicznych, niewłaściwych założeń, przypadkowo pominiętych zabezpieczeń i pozornie poprawnych implementacji.

Twoim celem jest uzyskanie bezpiecznego, utrzymywalnego, dobrze przetestowanego i udokumentowanego systemu przy maksymalnym zachowaniu istniejącej funkcjonalności.

Nie traktuj wdrożenia OWASP Top 10 jako dodania dziesięciu mechanizmów zabezpieczeń. Przeprowadź analizę ryzyka, zaimplementuj adekwatne zabezpieczenia i zweryfikuj je testami.

# ZASADY BEZWZGLĘDNE

1. Przed modyfikowaniem kodu przeanalizuj istniejącą aplikację i przygotuj raport z audytu.
2. Nie przepisuj całego projektu od początku.
3. Nie usuwaj funkcjonalności w celu uproszczenia implementacji.
4. Nie zastępuj istniejącej logiki biznesowej uproszczonymi przykładami.
5. Nie dodawaj fikcyjnych implementacji, pustych metod ani testów pozornie potwierdzających bezpieczeństwo.
6. Nie zakładaj, że istniejące mechanizmy bezpieczeństwa działają poprawnie. Zweryfikuj je.
7. Nie wprowadzaj nowych bibliotek bez uzasadnienia i sprawdzenia kompatybilności.
8. Zachowaj aktualne API i zgodność z frontendem, o ile nie istnieje uzasadniona przyczyna ich zmiany.
9. Każdą niekompatybilną zmianę odpowiednio zintegruj z frontendem i udokumentuj.
10. Nie używaj niebezpiecznych obejść w celu uzyskania pozytywnych wyników testów.
11. Nie wyłączaj mechanizmów bezpieczeństwa, aby naprawić błędy integracji.
12. Nie modyfikuj istniejących danych produkcyjnych i nie wykonuj destrukcyjnych migracji.
13. Nie umieszczaj haseł, tokenów, kluczy ani danych wrażliwych w kodzie, dokumentacji, testach i logach.
14. Nie wykonuj aktywnych testów penetracyjnych przeciwko systemom produkcyjnym ani zewnętrznym bez wyraźnego upoważnienia. Wykorzystuj odizolowane środowisko testowe.
15. Nie deklaruj zgodności z OWASP lub bezpieczeństwa produkcyjnego bez rzeczywistej weryfikacji.
16. Wykonuj zadania etapami, kontroluj zmiany i zapisuj postępy, aby możliwe było kontynuowanie pracy bez utraty kontekstu.
17. Nie zatrzymuj realizacji po samym audycie. Po zakończeniu analizy realizuj kolejne etapy, jeśli środowisko oraz dostępne uprawnienia na to pozwalają. W przypadku operacji destrukcyjnych, nieodwracalnych lub wymagających decyzji właściciela projektu przygotuj bezpieczną propozycję i pozostaw ją do zatwierdzenia.

# ETAP 0: ANALIZA REPOZYTORIUM

Zacznij od dokładnego zbadania zawartości repozytorium.

Zidentyfikuj:
- Strukturę projektów backendowych i frontendowych.
- Projekty testowe, dostępne narzędzia oraz istniejące testy.
- Architektoniczny podział aplikacji.
- Wszystkie kontrolery i endpointy.
- Serwisy, repozytoria, modele, encje i DTO.
- Zależności i sposób ich rejestrowania.
- Konfigurację bazy danych i migracji.
- Mechanizmy uwierzytelniania i autoryzacji.
- System ról, uprawnień i dostępów do zasobów.
- Sposób zarządzania sesją i tokenami.
- System logowania, audytu i monitoringu.
- Obsługę wyjątków oraz walidację.
- Operacje na plikach, eksport i import danych.
- Zadania działające w tle i integracje zewnętrzne.
- Konfigurację Dockera, CI/CD i środowisk, o ile występują.
- Architekturę frontendu, routing, zarządzanie stanem i komunikację HTTP.
- Dokumentację istniejącą w repozytorium.

Zidentyfikuj wszystkie istotne procesy biznesowe aplikacji i powiązania pomiędzy komponentami.

Zbuduj mapę przepływu danych, obejmującą użytkownika, frontend, API, mechanizmy autoryzacji, warstwę usług, bazę danych oraz ewentualne systemy zewnętrzne.

Nie zakładaj, że nazewnictwo plików odpowiada rzeczywistemu przeznaczeniu komponentów.

Wykonaj dostępne kompilacje i testy bazowe. Zapisz ich wyniki przed rozpoczęciem refaktoryzacji.

Wygeneruj:
docs/audit/01-system-inventory.md
docs/audit/02-current-architecture.md
docs/audit/03-baseline-results.md

# ETAP 1: KOMPLEKSOWY AUDYT BEZPIECZEŃSTWA

Przeprowadź audyt zgodny z OWASP Top 10:2025.

Wykorzystaj także stabilną wersję OWASP ASVS 5.0.0 jako szczegółową listę wymagań weryfikacyjnych.

Jako punkt wyjścia przyjmij ASVS Level 2 dla wymagań mających zastosowanie do aplikacji. Ostateczną ocenę wymaganego poziomu uzależnij od rzeczywistej wrażliwości przechowywanych danych, modelu zagrożeń i charakteru wdrożenia.

Przeanalizuj wszystkie kategorie:

A01: Broken Access Control
A02: Security Misconfiguration
A03: Software Supply Chain Failures
A04: Cryptographic Failures
A05: Injection
A06: Insecure Design
A07: Authentication Failures
A08: Software or Data Integrity Failures
A09: Security Logging and Alerting Failures
A10: Mishandling of Exceptional Conditions

Dla każdej kategorii ustal:
- Czy dane zagrożenie dotyczy aplikacji.
- Które komponenty są potencjalnie podatne.
- Jakie zabezpieczenia już istnieją.
- Czy ich implementacja jest poprawna.
- Jakie zabezpieczenia są nieobecne.
- Jakie istnieją dowody potwierdzające wnioski.
- Jakie poprawki należy zaimplementować.
- Jak zweryfikować ich skuteczność.

Uwzględnij zagrożenia specyficzne dla aplikacji dokumentującej infrastrukturę IT, np. ujawnienie topologii sieci, danych urządzeń, adresacji, poświadczeń, konfiguracji i dokumentacji dostępnej wyłącznie określonym użytkownikom.

Przeanalizuj oddzielnie:
- IDOR i BOLA.
- Eskalację uprawnień.
- Separację użytkowników, organizacji i zasobów, jeśli występuje.
- Nieautoryzowane pobieranie i eksportowanie dokumentacji.
- Nieautoryzowane modyfikowanie danych.
- Mass assignment i overposting.
- SQL injection, XSS, SSRF i inne rzeczywiście istotne wektory.
- Mechanizmy resetowania haseł i zarządzania sesją, jeśli występują.
- Możliwość nadużywania endpointów.
- Wyciek informacji przez błędy, logi i konfigurację.
- Ryzyko związane z importem i eksportem danych oraz załącznikami.

Przeprowadź modelowanie zagrożeń metodą STRIDE lub inną uzasadnioną metodą.

Zidentyfikuj zasoby wymagające ochrony, granice zaufania, potencjalne wektory ataku i możliwe konsekwencje naruszenia bezpieczeństwa.

Wykonaj dostępne analizy statyczne, sprawdzenie podatności zależności i kontrolę konfiguracji.

Nie uruchamiaj destrukcyjnych testów ani nie wysyłaj danych aplikacji do niezatwierdzonych usług zewnętrznych.

Przygotuj raport:
docs/audit/04-security-audit.md
docs/audit/05-threat-model.md
docs/audit/06-remediation-plan.md

Dla każdej podatności podaj:
- Identyfikator.
- Priorytet i poziom ryzyka.
- Dotknięty komponent.
- Opis problemu.
- Potencjalne konsekwencje.
- Dowody z kodu lub testów.
- Odpowiednią kategorię OWASP.
- Odpowiednie wymagania ASVS, jeżeli mają zastosowanie.
- Proponowane rozwiązanie.
- Sposób testowania poprawki.
- Status realizacji.

Wyraźnie odróżniaj podatność potwierdzoną, potencjalne ryzyko i obszar, którego nie udało się zweryfikować.

# ETAP 2: PLAN REFAKTORYZACJI

Na podstawie audytu opracuj plan modyfikacji aplikacji.

Podziel zadania na:
P0: Krytyczne podatności i ryzyko utraty danych.
P1: Wysokie ryzyko bezpieczeństwa.
P2: Refaktoryzacja architektury i istotne usprawnienia.
P3: Usprawnienia jakościowe, dokumentacja i pozostałe zadania.

Przygotuj mapę zależności pomiędzy zadaniami.

Zadbaj o realizację poprawek bezpieczeństwa we właściwej kolejności.

Nie wykonuj jednocześnie niepowiązanych, rozległych modyfikacji, które utrudniałyby identyfikację regresji.

Zaplanuj migrację kontrolerów w sposób umożliwiający stopniowe zastępowanie ich endpointami Minimal API.

Zapisz plan w:
docs/audit/07-implementation-plan.md

# ETAP 3: ZABEZPIECZENIE BACKENDU

Na podstawie wyników audytu zaimplementuj wymagane zabezpieczenia.

3.1. Uwierzytelnianie i autoryzacja

Zidentyfikuj istniejący mechanizm uwierzytelniania i oceń jego bezpieczeństwo.

Sprawdź:
- Logowanie i wylogowywanie.
- Przechowywanie haseł, jeżeli aplikacja je obsługuje.
- Zarządzanie sesjami.
- Politykę ważności tokenów.
- Odświeżanie i unieważnianie tokenów, jeśli występują.
- Obsługę ciasteczek.
- Zabezpieczenia CSRF adekwatne do modelu uwierzytelniania.
- Ochronę przed próbami przejęcia kont.
- Mechanizmy odzyskiwania dostępu.
- Ewentualne MFA.
- Autoryzację wszystkich chronionych operacji.

Stosuj zasady najmniejszych uprawnień i domyślnej odmowy dostępu.

Zaimplementuj autoryzację na poziomie poszczególnych zasobów, a nie wyłącznie ról.

Zweryfikuj, czy użytkownik mający prawo wywołać endpoint ma również uprawnienia do konkretnego zasobu.

Wykorzystaj natywne mechanizmy ASP.NET Core wszędzie, gdzie to uzasadnione.

Nie zmieniaj mechanizmu uwierzytelniania na inny bez udokumentowanej przyczyny.

3.2. Bezpieczeństwo API

Zaimplementuj lub popraw:
- Walidację danych wejściowych.
- Odpowiednie limity rozmiaru żądań.
- Ograniczanie liczby żądań w uzasadnionych miejscach.
- Ochronę przed nadużywaniem kosztownych operacji.
- Bezpieczną obsługę paginacji, sortowania i filtrowania.
- Zabezpieczenie przed mass assignment.
- Bezpieczną serializację i deserializację.
- Kontrolę dostępu do plików i eksportu.
- Ograniczenia i weryfikację uploadowanych plików, jeśli funkcja istnieje.
- Kontrolę dostępu do endpointów administracyjnych.
- Ochronę przed wstrzykiwaniem poleceń lub zapytań.
- Ochronę przed SSRF, jeśli backend pobiera zasoby wskazane przez użytkownika.

Nie stosuj limitów i zabezpieczeń uniemożliwiających prawidłowe działanie rzeczywistych funkcji biznesowych.

3.3. Konfiguracja i infrastruktura

Przeanalizuj:
- CORS.
- HTTPS i konfigurację reverse proxy.
- Security headers.
- Konfigurację środowiska produkcyjnego.
- Przechowywanie sekretów.
- Uprawnienia bazodanowe.
- Konfigurację Dockera.
- Ustawienia diagnostyczne.
- Dostępność dokumentacji OpenAPI i narzędzi administracyjnych.
- Zarządzanie zależnościami.
- Procedurę aktualizacji komponentów.

Zaproponuj bezpieczne ustawienia produkcyjne i odpowiednie, odrębne ustawienia developerskie.

Nie wprowadzaj konfiguracji mogącej zablokować rzeczywiste wdrożenie bez określenia wymaganych zmian środowiskowych.

3.4. Obsługa błędów i logowanie

Wykorzystaj odpowiednie natywne mechanizmy ASP.NET Core.

Wprowadź spójny format odpowiedzi o błędach, preferując ProblemDetails tam, gdzie to uzasadnione.

Zadbaj o poprawne kody HTTP, bezpieczne komunikaty i identyfikatory korelacyjne.

Przeanalizuj istniejący system logowania i audytu.

Oddziel logi techniczne od zdarzeń audytowych.

Zapewnij rejestrowanie ważnych zdarzeń bezpieczeństwa, takich jak nieudane logowania, próby nieautoryzowanego dostępu, zmiany uprawnień i istotne operacje administracyjne.

Nie rejestruj poświadczeń, tokenów, wrażliwej zawartości dokumentacji ani niepotrzebnych danych osobowych.

Dodaj mechanizmy alertowania lub odpowiednie punkty integracji, jeśli wymaga tego model ryzyka.

Zadbaj o właściwą obsługę sytuacji wyjątkowych i bezpieczne zachowanie systemu w razie częściowych awarii.

# ETAP 4: MIGRACJA DO MINIMAL API

Zrefaktoryzuj istniejące kontrolery ASP.NET Core do Minimal API.

Najpierw przygotuj inwentaryzację wszystkich endpointów i ich kontraktów.

Następnie zaprojektuj strukturę endpointów opartą na modułach funkcjonalnych.

Preferuj organizację według funkcjonalności aplikacji, a nie jeden ogromny plik zawierający wszystkie endpointy.

Rozważ wykorzystanie:
- Grup endpointów.
- Endpoint filters tam, gdzie mają uzasadnienie.
- Mechanizmów dependency injection.
- Istniejących serwisów aplikacyjnych.
- Polityk autoryzacji.
- Jawnych kontraktów wejścia i wyjścia.
- Typowanych odpowiedzi.
- Spójnego mapowania wyjątków na odpowiedzi HTTP.

W miarę możliwości zachowaj istniejące kontrakty i ścieżki API.

Nie umieszczaj skomplikowanej logiki biznesowej bezpośrednio w definicjach endpointów.

Nie duplikuj istniejących serwisów.

Przeanalizuj zasadność wydzielenia logiki biznesowej z kontrolerów przed ich migracją.

Dbaj o zgodność rejestracji usług, middleware, autoryzacji i dokumentacji OpenAPI.

Przenieś kontrolery partiami, uruchamiając odpowiednie testy po każdej migracji.

Usuń stare kontrolery i zbędne zależności dopiero po potwierdzeniu poprawności nowych implementacji.

Nie narzucaj dodatkowych wzorców architektonicznych wyłącznie dla zachowania pozornej czystości kodu.

# ETAP 5: REFAKTORYZACJA FRONTENDU

Przeanalizuj frontend React i jego współpracę z backendem.

Zweryfikuj:
- Organizację komponentów.
- Routing.
- Warstwę komunikacji z API.
- Zarządzanie stanem.
- Obsługę sesji.
- Przechowywanie tokenów, jeśli występują.
- Formularze i walidację.
- Obsługę błędów.
- Kontrolę dostępu do widoków.
- Obsługę wylogowania i utraty sesji.
- Obsługę przesyłania i pobierania plików.
- Bezpieczeństwo renderowania danych.
- Konfigurację Vite i zmienne środowiskowe.
- Zależności i podatności bibliotek.

Zidentyfikuj niepotrzebne duplikacje logiki i rozbieżności w obsłudze API.

Jeżeli istnieje taka potrzeba, wprowadź lub uporządkuj centralną warstwę komunikacji HTTP.

Zadbaj o:
- Jednolitą obsługę błędów.
- Poprawną reakcję na HTTP 400, 401, 403, 404, 409, 422, 429 i błędy serwera, zgodnie z rzeczywistymi kontraktami.
- Bezpieczne zarządzanie sesją.
- Ochronę przed XSS.
- Prawidłową obsługę mechanizmu CSRF, jeśli jest wymagany.
- Brak sekretów w kodzie i konfiguracji dostarczanej do przeglądarki.
- Spójność DTO i kontraktów API.
- Poprawne działanie poszczególnych ekranów po migracji backendu.

Uprawnienia sprawdzane we frontendzie traktuj wyłącznie jako mechanizm interfejsu. Autoryzacja każdej chronionej operacji musi być egzekwowana przez backend.

Jeżeli jest to uzasadnione, wprowadź generowanie typowanego klienta na podstawie OpenAPI albo inne rozwiązanie ograniczające rozbieżności kontraktów.

Nie przebudowuj całego frontendu i nie zmieniaj jego wyglądu bez potrzeby.

Zachowaj istniejące funkcjonalności i doświadczenie użytkownika.

# ETAP 6: TESTY I WERYFIKACJA

Zaprojektuj i zaimplementuj testy odpowiednie do rzeczywistej architektury systemu.

Uwzględnij:

1. Testy jednostkowe istotnej logiki biznesowej.
2. Testy integracyjne API.
3. Testy autoryzacji i kontroli dostępu do zasobów.
4. Testy walidacji.
5. Testy mechanizmów uwierzytelniania.
6. Testy bezpieczeństwa operacji na plikach, jeśli występują.
7. Testy regresyjne endpointów migrowanych do Minimal API.
8. Testy integracji frontendu z API.
9. Testy krytycznych scenariuszy użytkownika.
10. Testy negatywne dla potwierdzonych podatności.
11. Kontrolę podatności zależności i konfiguracji.
12. Kontrolę poprawności obsługi wyjątków.

Stosuj testowe konta, syntetyczne dane i izolowaną bazę danych.

Sprawdź rzeczywistą autoryzację poprzez testy użytkowników o różnych rolach i zakresach dostępu.

Testuj dostęp do własnych oraz cudzych zasobów, jeśli model aplikacji to umożliwia.

Zaimplementuj testy regresyjne dla każdej naprawionej podatności, której zachowanie można automatycznie sprawdzić.

Uruchom pełne dostępne zestawy testów oraz kompilację backendu i frontendu.

Nie deklaruj sukcesu, jeśli testów nie uruchomiono.

Zapisz szczegółowe wyniki, w tym błędy, ograniczenia testów i ryzyko pozostałych regresji.

Przygotuj:
docs/testing/test-strategy.md
docs/testing/security-test-results.md
docs/testing/regression-results.md

# ETAP 7: DOKUMENTACJA TECHNICZNA

Stwórz aktualną, zorganizowaną dokumentację w katalogu docs.

Dokumentacja ma opisywać rzeczywisty stan aplikacji po zmianach, a nie pierwotne założenia projektu.

Przygotuj co najmniej:

docs/README.md
docs/architecture/overview.md
docs/architecture/backend.md
docs/architecture/frontend.md
docs/architecture/data-flow.md
docs/architecture/database.md
docs/api/overview.md
docs/security/security-architecture.md
docs/security/authentication.md
docs/security/authorization.md
docs/security/owasp-compliance-matrix.md
docs/deployment/deployment-guide.md
docs/deployment/configuration.md
docs/development/developer-guide.md

Dostosuj wykaz dokumentów do faktycznych funkcjonalności aplikacji.

Udokumentuj:
- Przeznaczenie systemu.
- Główne moduły i możliwości.
- Architekturę i zależności.
- Mechanizmy uwierzytelniania.
- Model uprawnień.
- Przepływy danych.
- Sposób uruchamiania aplikacji.
- Konfigurację środowisk.
- Migracje bazodanowe.
- API i jego kontrakty.
- Istotne decyzje architektoniczne.
- Mechanizmy bezpieczeństwa.
- Sposób uruchamiania testów.
- Procedury aktualizacji i utrzymania.

W dokumentacji API wykorzystaj OpenAPI i upewnij się, że definicje odpowiadają rzeczywistym endpointom.

Przygotuj czytelne diagramy w Mermaid tam, gdzie pomagają zrozumieć architekturę.

Dokumentacja bezpieczeństwa powinna zawierać macierz wymagań OWASP ASVS oraz powiązanie zastosowanych zabezpieczeń z OWASP Top 10:2025.

Dla każdego odpowiedniego wymagania ASVS podaj status:
- Spełnione i zweryfikowane.
- Zaimplementowane, ale nie w pełni zweryfikowane.
- Niespełnione.
- Nie dotyczy.
- Wymaga dodatkowej weryfikacji.

Podaj dowody w postaci odniesień do kodu, konfiguracji lub testów.

Nie nazywaj dokumentu certyfikatem zgodności.

# ETAP 8: DOKUMENTACJA UŻYTKOWNIKA I ADMINISTRATORA

Przygotuj dwie odrębne instrukcje.

A. Instrukcja użytkownika:
docs/user-guide/README.md

B. Instrukcja administratora:
docs/admin-guide/README.md

Instrukcja użytkownika powinna opisywać rzeczywiste możliwości aplikacji, jej podstawowe moduły, sposób korzystania z poszczególnych funkcjonalności, ograniczenia dostępowe i najczęściej występujące problemy.

Instrukcja administratora powinna obejmować konfigurację systemu, zarządzanie kontami, rolami, uprawnieniami, audytem, bezpieczeństwem, aktualizacjami i eksploatacją w takim zakresie, w jakim rzeczywiście obsługuje je aplikacja.

Uwzględnij procedury odtwarzania z kopii zapasowej, aktualizacji i reagowania na incydenty, jeśli istnieją odpowiednie mechanizmy. Jeśli nie istnieją, przedstaw wymagane działania jako zalecenia do wdrożenia.

Nie wymyślaj funkcjonalności, których aplikacja nie posiada.

Dokumentację napisz po polsku. Zachowaj nazwy techniczne tam, gdzie ich tłumaczenie pogarsza czytelność.

# ETAP 9: KONTROLA KOŃCOWA

Po zakończeniu implementacji wykonaj ponowny audyt.

Porównaj wyniki z audytem początkowym.

Sprawdź:
- Czy wszystkie zaplanowane poprawki zostały wykonane.
- Czy każda potwierdzona podatność została wyeliminowana lub świadomie zaakceptowana przez właściciela projektu.
- Czy migracja do Minimal API jest kompletna.
- Czy nie pozostały przypadkowo dostępne stare endpointy.
- Czy frontend jest zgodny z aktualnym API.
- Czy nie usunięto istniejących funkcjonalności.
- Czy aplikacja się kompiluje.
- Czy testy przechodzą.
- Czy dokumentacja odpowiada aktualnemu kodowi.
- Czy konfiguracja produkcyjna nie zawiera znanych, niebezpiecznych ustawień.

Nie traktuj pozytywnej kompilacji jako dowodu bezpieczeństwa.

Przygotuj raport:
docs/audit/08-final-security-report.md

Uwzględnij pozostałe zagrożenia, ograniczenia audytu, wymagane działania infrastrukturalne i kwestie wymagające ręcznej weryfikacji.

# ZARZĄDZANIE REALIZACJĄ

Utwórz w repozytorium plik:
docs/implementation-progress.md

Prowadź w nim:
- Aktualny etap.
- Wykonane zadania.
- Pozostałe zadania.
- Podjęte decyzje.
- Wykryte problemy.
- Wyniki ostatnich testów.
- Istotne zmodyfikowane pliki.
- Następne działania.
- Blokery wymagające decyzji właściciela.

Regularnie aktualizuj ten dokument.

Jeśli dostępny jest Git, sprawdzaj aktualny stan repozytorium przed rozpoczęciem i po każdej większej operacji. Nie nadpisuj istniejących zmian użytkownika. Nie wykonuj destrukcyjnych operacji na historii repozytorium.

Dziel pracę na niewielkie, możliwe do zweryfikowania partie.

Wykorzystuj istniejące narzędzia projektu. Nie wprowadzaj rozbudowanego systemu automatyzacji, jeśli nie jest rzeczywiście potrzebny.

Jeśli kontekst zadania zostanie przerwany, pliki raportowe i dokument postępu mają pozwolić na bezpieczne wznowienie pracy.

# KOŃCOWY REZULTAT

Oczekuję:
- Audytu istniejącej aplikacji.
- Raportu zagrożeń i planu naprawczego.
- Implementacji uzasadnionych zabezpieczeń.
- Migracji istniejących kontrolerów do Minimal API.
- Uporządkowania architektury backendu.
- Dostosowania frontendu do zmodyfikowanego API.
- Zachowania wszystkich dotychczasowych funkcjonalności, o ile nie wymagają świadomie zaakceptowanej zmiany.
- Automatycznych testów i rzeczywistych wyników weryfikacji.
- Dokumentacji technicznej.
- Dokumentacji użytkownika.
- Dokumentacji administratora.
- Końcowego raportu bezpieczeństwa i listy pozostałych zagrożeń.

Na zakończenie przedstaw konkretne podsumowanie wykonanych modyfikacji, wyniki testów, pozostające ryzyka i niezbędne czynności przed uruchomieniem aplikacji na produkcji.

Rozpocznij od ETAPU 0, przedstaw wyniki analizy i zapisuj postępy w repozytorium. Kontynuuj zgodnie z kolejnością etapów, wykonując wszystkie możliwe prace bez niepotrzebnego oczekiwania na dodatkowe instrukcje.