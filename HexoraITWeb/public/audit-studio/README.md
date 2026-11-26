# CyberAudit Studio 2.0 PL

**Konfigurowalne stanowisko pracy audytora cyberbezpieczeństwa.** Wersja 2.0, 4 listopada 2026 r. HTML/CSS/JS offline, 93 karty zadań, 279 mikrokroków, 68 uproszczonych kryteriów kontrolnych, wzory PDF/Markdown, eksport projektu JSON i szczegółowy raport klienta PDF.

> **Zakres zastosowania:** narzędzie do *organizowania i dokumentowania* audytu. Nie jest certyfikatem ISO, automatycznym orzeczeniem zgodności ani substytutem audytu ustawowego wykonanego przez uprawnione osoby. Ocena prawna oraz końcowa opinia należą do kompetentnego audytora, z uwzględnieniem faktycznego zakresu i dowodów.

## Studio w HexoraIT

Wybierz organizację, następnie **Audyty → Przeprowadź audyt**. Studio działa jako samodzielny pakiet HTML. W osadzonej wersji przeglądarka pamięta jeden aktywny szkic dla danej pary konto–organizacja. Przed zmianą projektu zapisz kopię JSON. Otwierając samo `index.html` poza HexoraIT, nadal można użyć Studio i jego formularzy offline.

W **Audytach → Historia audytów** dodaj nazwę, datę, status i notatkę. Otwórz audyt z listy i użyj **Dodaj aktualizację**, aby dopisać etap, nowy status lub pliki. Każda aktualizacja zapisuje czas i autora. Po eksporcie w Studio dołącz kopię projektu JSON do dalszej pracy albo PDF do przeglądu wyników. Wpis przyjmuje do dwóch plików, po 10 MB każdy. Historia i załączniki są przechowywane w PostgreSQL, więc obejmuje je kopia bazy. Dostęp nadaje uprawnienie **Historia audytów** w organizacji.

Źródłem plików dla Vite i obrazu web jest katalog `HexoraITWeb/public/audit-studio`. Migracja API tworzy tabele historii podczas startu na PostgreSQL. Standardowe konteksty budowania obrazów można uruchamiać tak samo jak wcześniej.

## 1. Szybkie uruchomienie

1. Rozpakuj **całe** archiwum ZIP do jednego katalogu, zachowując podkatalogi. Nie przenoś samego `index.html`.
2. Otwórz `index.html` w aktualnej przeglądarce Chromium, Firefox albo Edge. Program działa offline. Jeżeli polityka firmowej przeglądarki blokuje lokalne pliki, otwórz katalog na wewnętrznym serwerze HTTP albo użyj lokalnego `python -m http.server 8000` i adresu `http://localhost:8000`; **nie** wystawiaj tego serwera do Internetu.
3. Wybierz gotowy **profil audytu** albo „Audyt własny”, a następnie przejdź do **Konfigurator audytu**.
4. Wprowadź klienta, projekt, audytora, sponsora, kwalifikację prawną, zakres, wyłączenia, poprzednie ustalenia i okres. Zaznacz standardy, głębokość, obszary i opcjonalne technologie.
5. W **Plan i checklisty** otwieraj karty. Odhaczaj trzy mikrokroki, wpisuj status **wykonania**, osobny **wynik** kontroli, populację/próbę, identyfikatory dowodów, właścicieli i obserwacje. Zadania spoza automatycznego planu można ręcznie włączyć.
6. W **Macierz wymagań** oceniaj wybrane wymagania i zapisuj dowód oraz argumentację. Możesz wyłączyć pojedyncze kryterium z podaniem powodu albo przywrócić je do planu; zaznacz „Pokaż także kryteria wyłączone”, żeby nimi zarządzać. Pamiętaj, że ocena zadania nie jest automatycznie oceną wszystkich norm.
7. W **Dowody** zakładaj spis metadanych dowodów; same poufne załączniki trzymaj we właściwym repozytorium firmy. W **Ustalenia** rejestruj ryzyka, CAPA, odpowiedzi właścicieli, retesty.
8. W **Raport i PDF** wpisz podsumowanie, zastrzeżenia, zatwierdzającego i wybierz pełny aneks. Kliknij „**Generuj / zapisz PDF**”, a w systemowym oknie drukowania wybierz **Zapisz jako PDF**. Dodatkowo możesz pobrać samodzielny raport HTML.
9. Regularnie zapisuj **eksport całego projektu JSON**. Służy do importu i dalszego prowadzenia tego samego audytu.

### Ważne: drukowanie a plik PDF

Generowanie PDF odbywa się przez **natywne drukowanie przeglądarki** (`window.print`, A4, CSS print), w całości lokalnie. Jest to celowe rozwiązanie bez zewnętrznych usług i zależności. Użytkownik wybiera „Zapisz jako PDF” w oknie drukowania; program nie zapisuje pliku PDF automatycznie bez tego kroku. Wyłącz „nagłówki i stopki” w ustawieniach drukowania, jeśli chcesz czysty dokument. Plik `przyklady_v2/raport_przykladowy_demo.pdf` pozwala zobaczyć wygląd gotowego raportu. Zawiera wyłącznie **fikcyjne dane**.

## 2. Profile, skala i selekcja

| Profil | Zastosowanie | Ważna uwaga |
|---|---|---|
| Gotowość KSC / NIS2 | Weryfikacja wybranych obowiązków i luk | Prawidłowo ustal status podmiotu oraz właściwe przepisy krajowe i sektorowe. |
| Pierwszy audyt sieci | Pierwsze poznanie infrastruktury i szybkich ryzyk | Nie formułuj opinii o całościowej zgodności prawnej. |
| Retest / po zmianach | Sprawdzanie istniejących ustaleń po poprawkach | Wpisz ID poprzednich zadań/ustaleń w konfiguratorze; przegląd kontrolnych obszarów pozostaje pomocniczy. |
| Przegląd ISO 27001 | Planowanie sprawdzeń SZBI i SoA | Wymaga dostępu do legalnej, pełnej treści normy i właściwego zakresu SZBI. |
| Audyt techniczny | IAM, sieć, konfiguracje, logi, backupy | Techniczne testy inwazyjne wykonuj dopiero po odrębnej zgodzie. |
| Audyt własny | Dopasowanie do umowy i potrzeb klienta | Zaznacz standardy, dziedziny i głębokość indywidualnie. |

**Parametry sterujące planem:** typ badania (rozpoznanie, zgodność, przekrojowy, techniczny, retest), głębokość (szybka, standardowa, pogłębiona), wielkość organizacji, standardy (KSC/NIS2, ISO/IEC 27001, NIST CSF, CIS Controls, RODO, DORA, UE 2024/2690, CRA, OWASP), obszary (11 dziedzin), zastosowane technologie (chmura, aplikacje, OT), lista celowanych ID i indywidualne włączenia/wyłączenia.

Rozmiar organizacji jest **wskazówką metodyczną** do próbkowania i zespołu; nie powoduje automatycznego zakwalifikowania do KSC. Zakres prawny ustala się oddzielnie. Niektóre zadania (np. mandat, bezpieczeństwo testów) powinny zostać wykonane także w krótkim audycie. Możliwość ręcznego wyłączenia zadania służy udokumentowaniu świadomej decyzji, nie obchodzeniu obowiązków.

**Przykład 1:** klient potrzebuje kontroli wybranych obowiązków KSC/NIS2 po poprzednim niedokończonym audycie. Wybierz „Gotowość KSC / NIS2”, zostaw tylko standard KSC, dobierz obszary i głębokość. W macierzy wyłącz niezlecone punkty z uzasadnieniem; zapisz numer i wyniki poprzedniego raportu. Alternatywnie wybierz „Retest”, wpisz ID zadań i program sam dobierze powiązane wymagania.

**Przykład 2:** mała firma po wymianie firewalla. Wybierz „Retest / po zmianach”, wpisz ID poprzedniego ustalenia i zadań związanych z siecią; ogranicz domeny do sieci, architektury i ciągłości, zachowując mandat oraz potwierdzenie braku wpływu na produkcję.

## 3. Co zawiera każdy ekran

- **Pulpit:** gotowe profile, wskaźniki liczby wybranych i wykonanych zadań, postęp etapów i skróty.
- **Konfigurator:** dane projektu i sponsora, ramy prawne, profile, zakres, kryteria, 11 tematów, technologie, wielkość i głębokość; na bieżąco przelicza plan.
- **Plan i checklisty:** 93 karty z opisem celu, przykładowym dowodem, źródłami, trzema konkretnymi mikrokrokami, statusami, ocenami, opisem populacji i próby oraz przyciskami „Dodaj dowód” i „Utwórz ustalenie”.
- **Macierz wymagań:** 68 **skrótowych** kart kryteriów z podziałem na wybrane rodziny, zaleceniami i miejscem na uzasadnienie oraz dowód. Każdy punkt można osobno dołączyć lub wyłączyć z planu z zapisanym powodem; wyłączone punkty są wyszczególnione w raporcie. W reteście system domyślnie pokazuje kryteria powiązane z zadaniami wskazanymi przez użytkownika.
- **Dowody:** indeks dokumentów, eksportów konfiguracji, wywiadów i logów. Zawiera tylko metadane i lokalizację bez samych załączników.
- **Ustalenia / CAPA:** kryterium, zakres próby, obserwacja, dowód, wpływ, przykładowa punktacja ryzyka 5×5, właściciel, termin, plan korekty, akceptacja ryzyka i retest.
- **Raport i PDF:** automatyczne statystyki, zakres, ograniczenia, wszystkie wybrane kryteria i ich statusy, dowody, ustalenia, plan działań, a w pełnym aneksie **każda objęta planem karta zadania wraz z wszystkimi trzema mikrokrokami i wynikami**. Odrębna lista dokumentuje wyłączone kryteria i ich uzasadnienia. Kontrola jakości sygnalizuje m.in. nieocenione pozycje, braki dowodów i zamknięcie bez retestu.
- **Formularze i wzory:** podgląd i bezpośredni dostęp do dziesięciu PDF AcroForm i edytowalnych Markdown.
- **Jak audytować?:** praktyczny podręczny playbook dla początkujących, bezpieczeństwo pracy, jakość dowodów, próbkowanie, komunikacja i raportowanie.
- **Źródła:** oficjalne i branżowe odnośniki, objaśnienia ograniczeń i aktualizacji.

### Status wykonania a wynik zgodności

**Wykonanie:** nie rozpoczęto / w trakcie / blokada-brak dowodów / wykonane / poza zakresem. **Wynik:** nie oceniono / zgodne w próbie / częściowe / niezgodne / brak wystarczających dowodów / nie dotyczy.

Zaznaczenie trzech mikrokroków **nie powoduje automatycznej oceny „zgodne”**. Wymaganie może mieć odrębny stan i musi zostać powiązane z właściwą podstawą, oceną zakresu i adekwatnym dowodem.

## 4. Rozsądny workflow audytowy

**0. Upoważnienie i bezpieczeństwo.** Ustal zleceniodawcę, zakres IP i systemów, wyłączenia, dane wrażliwe, prawa do testów, okna, SPOC, procedurę stop, brak konfliktów interesów, retencję dowodów. Bez zgody na skanowanie lub testy aktywne stosuj przegląd read-only i wywiady. Dla OT/ICS i usług krytycznych osobny plan bezpieczeństwa.

**1. Wywiady i zrozumienie organizacji.** Krytyczne procesy, cele, poprzednie ustalenia, schemat architektury, role, usługi, dostawcy, SLA, BIA, historia incydentów. Nie przyjmuj dostarczonego diagramu bez sprawdzenia aktualności.

**2. Plan i próbkowanie.** Zidentyfikuj populację i źródło jej listy, wybierz kryterium doboru (ryzyko, lokalizacja, typ aktywa, rola, zmiana w czasie), wpisz wielkość próby i okres. Wyjaśnij ograniczenia ekstrapolacji.

**3. Testy i dowody.** Dla każdego wymagania przygotuj parę „kryterium → test → obserwacja → zweryfikowany dowód”. Próbki oceniaj z właścicielem systemu i sprawdzaj powtarzalność.

**4. Ustalenia.** Rozróżniaj brak wdrożonej kontroli od braku dostępnego dowodu. Oceń wpływ na biznes, prawdopodobieństwo i krytyczność zgodnie z przyjętą metodyką klienta. Pilne podatności eskaluj od razu.

**5. Raport.** Oddziel podsumowanie zarządcze od technicznego aneksu. Wskaż metodykę, zakres, próby, kryteria, ograniczenia, niezgodności, dowody i decyzje. Przed wysłaniem wykonaj kontrolę jakości, uzyskaj przegląd i zatwierdzenie.

**6. CAPA i retest.** Zapisz właściciela, termin, kryterium zamknięcia, dowód wdrożenia i niezależny retest. Nie zamykaj ustalenia wyłącznie po deklaracji „naprawiono”.

### Podstawa metodyczna

- Zapisz cel, kryteria, granice, wyłączenia i okres w konfiguratorze. Dobieraj próbę według ryzyka i opisuj ograniczenia w raporcie. [ISO 19011:2026](https://www.iso.org/standard/19011)
- W karcie zadania odnotuj metodę pozyskania dowodu, np. przegląd dokumentów, wywiad lub test kontroli, oraz zapisz wynik i identyfikatory dowodów. [NIST SP 800-53A](https://csrc.nist.gov/pubs/sp/800/53/a/r5/final)
- Przypisz zaleceniom właściciela i termin. Dopisz wynik weryfikacji wdrożenia albo formalną decyzję o akceptacji ryzyka. [The IIA, standardy 14.4 i 15.2](https://www.theiia.org/en/standards/2024-standards/global-internal-audit-standards/)
- W przeglądach opartych na NIST CSF ustal z organizacją stan docelowy. Przy ocenie luk porównaj ustalenia z wynikiem, który organizacja chce osiągnąć. [NIST SP 1301](https://csrc.nist.gov/pubs/sp/1301/final)

## 5. Przygotowanie osobnej kopii klienta

Narzędzie przechowuje **jeden aktywny projekt w danej przestrzeni localStorage / origin (w HexoraIT osobno dla każdego konta i organizacji)**. Aby obsługiwać klientów bez mieszania danych: przed zmianą zlecenia wyeksportuj JSON, najlepiej do bezpiecznego folderu klienta, następnie wybierz „Nowy projekt” i skonfiguruj kolejny. Wczytanie JSON przywróci wybrany projekt i **zastąpi bieżące dane**. Plik wersji 1.0 i plik projektu 2.0 mają odmienne schematy, a aplikacja **nie wykonuje automatycznej migracji starego JSON**. Zachowaj archiwum v1 przy aktualizacji.

Proponowana struktura: `Klient/Rok/Upoważnienia/`, `Zakres-i-SoA/`, `Dowody-szyfrowane/`, `Projekt-JSON/`, `Raporty/`, `CAPA/`. **Nie kopiuj sekretów do JSON, notatek lub raportu.** Metadane dowodu powinny odsyłać do systemu z uprawnieniami, rejestrem dostępu i retencją.

## 6. Przepisy, standardy i uczciwe zastrzeżenia

Weryfikacja źródeł: **4 listopada 2026 r.** Potwierdzone materiały w `referencje/zrodla.md` i zakładce Źródła. Przed rozpoczęciem nowego zlecenia **zweryfikuj najnowsze brzmienie prawne i sektorowe**.

- **KSC / NIS2 (Polska):** ustawa z 23 stycznia 2026 r. o zmianie ustawy o krajowym systemie cyberbezpieczeństwa oraz niektórych innych ustaw, Dz.U. 2026 poz. 252: https://eli.gov.pl/eli/DU/2026/252/ogl ; dyrektywa (UE) 2022/2555: https://eur-lex.europa.eu/eli/dir/2022/2555/oj ; polski komunikat o datach: https://www.gov.pl/web/cyfryzacja/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc--najwazniejsze-terminy . **Termin 3.04.2028 na pierwszy audyt nie dotyczy automatycznie wszystkich organizacji**, a tym bardziej każdego małego przedsiębiorstwa.
- **ISO/IEC 27001:2022 (+Amd1:2024) i ISO 19011:2026:** normy licencjonowane; dostępne źródła informacyjne ISO: https://www.iso.org/standard/27001 i https://www.iso.org/standard/19011 . Nie odtwarzamy w pakiecie pełnej chronionej treści i nie deklarujemy zgodności z każdą kontrolą Załącznika A.
- **NIST CSF 2.0:** https://www.nist.gov/cyberframework ; **CIS Controls v8.1:** https://www.cisecurity.org/controls/v8-1 ; **OWASP:** https://owasp.org/www-project-application-security-verification-standard/ . Są to metodyki/standardy bezpieczeństwa, a ich wymagania nie zawsze są samodzielnym obowiązkiem prawnym.
- **RODO:** art. 32–35 https://eur-lex.europa.eu/eli/reg/2016/679/oj . **DORA:** https://eur-lex.europa.eu/eli/reg/2022/2554/oj . **UE 2024/2690:** https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj . **CRA:** https://eur-lex.europa.eu/eli/reg/2024/2847/oj . Przepisy sektorowe aktywuj dopiero po sprawdzeniu zakresu podmiotowego i obowiązujących terminów.

**Macierz 68 kryteriów jest roboczym przewodnikiem (crosswalk), nie literalnym reprodukowaniem pełnego tekstu prawa/norm i nie gwarantuje pełnego pokrycia.** Dla prawnego audytu zgodności doprecyzuj każdy paragraf i akt wykonawczy, a dla pełnego ISO zastosuj licencjonowany tekst, deklarację stosowania i zakres SZBI. Dodaj własne kryteria do `requirements-data.js` lub osobnego dokumentu programu. Kwalifikację statusu podmiotu KSC powinien potwierdzić kompetentny prawnik/właściciel obowiązków.

## 7. Bezpieczeństwo aplikacji i informacji

- Aplikacja działa **lokalnie**, bez analityki, połączeń wychodzących i zewnętrznych bibliotek; publiczne linki otwierają się tylko po kliknięciu.
- `localStorage` na stacji roboczej **nie jest zaszyfrowanym sejfem**. Unikaj stanowisk współdzielonych, szyfruj dysk, wyłącz synchronizację nieodpowiednich katalogów, stosuj zgodną z umową retencję danych.
- Eksport JSON/PDF/HTML zawiera wszystkie wprowadzone notatki i dane sprawy, dlatego należy go traktować jako potencjalnie **poufny**. Przed udostępnieniem klientowi sprawdź sekcje i odbiorców. Dowody o wyższej klasyfikacji przekazuj osobno, bez osadzania sekretów.
- Każde aktywne badanie (skaner, wywołanie błędu, test odporności, próby exploitacji, skan OT) wymaga pisemnego upoważnienia, granic i procedury przerwania.
- Ocena ryzyka 5×5 jest **przykładowa**; dobierz macierz i progi akceptacji ryzyka do organizacji.
- Rozbieżności między dowodami, brak odpowiedzi właściciela, ograniczony czas i niepełna próba są **ograniczeniami zapewnienia**; wpisz je do raportu. Ustaw „nie oceniono” zamiast sztucznej zgodności.

## 8. Pliki i kod źródłowy

```
index.html                 strony aplikacji, taby, dostępność, podgląd
assets/style.css           styl dark, responsywność, osobny wygląd A4
assets/audit-data.js       bazowe 93 zadania, 12 etapów, źródła
assets/playbook-data.js    279 praktycznych kroków / tagi dziedzin
assets/requirements-data.js  68 kart kryteriów i ich powiązania
assets/app-v2.js           konfiguracja, stan, dowody, ocena, raport, import/eksport
formularze_pdf/            10 edytowalnych formularzy PDF AcroForm
szablony_edytowalne/       10 odpowiedników Markdown
referencje/                CSV inwentarza, kryteriów, prób i dowodów
przyklady/                 fikcyjne przykłady z wersji 1.x
przyklady_v2/              demonstracyjny szczegółowy raport HTML/PDF
narzedzia/                 skrypty do odtworzenia formularzy i weryfikacji
SHA256SUMS.txt             sumy kontrolne plików pakietu
```

**Dalszy rozwój:** Zmiany merytoryczne wprowadzaj w `audit-data.js`, `playbook-data.js`, `requirements-data.js`; logika jest w `app-v2.js`, style w `style.css`. Unikaj identyfikatorów zadań już zajętych przez inne zadania. Jeżeli rozbudowujesz wymagania, zweryfikuj powiązane task ID i source ID. Po zmianach uruchom `node narzedzia/check_pack_v2.cjs` (gdy masz Node) i sprawdź raport wydrukowany jako PDF. Odtwarzanie formularzy: `python narzedzia/generate_forms.py` (wymaga ReportLab i zainstalowanej odpowiedniej czcionki). Macierze oryginalnego zestawu: `node narzedzia/export_references.cjs`.

## 9. Lista kontrolna audytora przed wydaniem raportu

- [ ] Podpisany mandat, zakres, RoE, powiadomienie właścicieli i kontakt awaryjny.
- [ ] Udokumentowano podstawy prawne i wymaganą kwalifikację podmiotu, poprawną wersję norm.
- [ ] Dla każdego istotnego wyniku jest adekwatny, niezależnie sprawdzony dowód oraz okres i próba.
- [ ] Powiązano istotne luki z wymaganiem, ryzykiem, właścicielem i terminem działania.
- [ ] Odróżniono „nie oceniono” i „nie dotyczy”, uzasadniono wyłączenia.
- [ ] Wykazano wszystkie ograniczenia testów, dostępu, prób i wnioskowania.
- [ ] Sprawdzono poważne problemy i potwierdzono ich pilną eskalację, jeśli wymagana.
- [ ] Klient zweryfikował fakty; audytor zachował niezależność oceny.
- [ ] Wykonano peer review, ustalono klasyfikację, zatwierdzającego i odbiorców.
- [ ] Raport zawiera zakres, metodykę, kryteria, ustalenia, dowody, plan CAPA i daty retestu.
- [ ] Zabezpieczono JSON, raport PDF/HTML i źródła dowodów zgodnie z retencją.

**Przykłady w pakiecie są fikcyjne.** Data i kompletność przepisów muszą być ponownie sprawdzone przed każdym formalnym audytem.
