# CyberAudit Studio 2.2 PL

Studio pomaga nauczyć się pierwszego wewnętrznego przeglądu IT i porządkować większe audyty. Działa w przeglądarce z lokalnych plików HTML, CSS i JavaScript. Tryb Nauka zawiera 149 pytań do pasywnego przeglądu, a Audytor udostępnia 93 dotychczasowe zadania i macierz 68 kryteriów.

## Szybki start

1. Rozpakuj całą paczkę do jednego katalogu i otwórz `index.html`. W HexoraIT wybierz organizację, następnie **Audyty → Przeprowadź audyt**.
2. W domyślnym trybie **Nauka** kliknij **Rozpocznij audyt**. Wpisz nazwę, firmę, audytora, zakres i datę. Zaczynasz od „Audytu podstaw IT małej firmy”. Inny szablon wybierzesz z Pulpitu lub widoku Audyt.
3. Na Pulpicie użyj przewodnika **Mój pierwszy audyt krok po kroku**. Potwierdź zgodę na zakres, zbierz informacje, przejdź przez pytania, zapisz dowody i ustalenia, przygotuj raport oraz uzgodnij plan naprawczy.
4. W **Audycie** wpisuj oceny na podstawie rozmów, dokumentów lub odczytu ustawień. Zapisuj identyfikatory, źródło, datę i istotne metadane. Poufne materiały przechowuj we właściwym repozytorium firmy. Pomijaj hasła, klucze i inne sekrety.
5. Z oceny **Częściowo** lub **Niezgodne** możesz utworzyć ustalenie. Sprawdź proponowany opis i zalecenie, dopisz dowód, właściciela działania i termin.
6. Na próbę wybierz **Otwórz projekt demonstracyjny**. Wszystkie materiały dotyczą fikcyjnej Firmy Demo Sp. z o.o. Oceń pytania samodzielnie, potem pokaż klucz odpowiedzi. Przycisk usunięcia dotyczy wybranego projektu ćwiczeniowego.

## Tryby i szablony

| Tryb i poziom | Zawartość |
| --- | --- |
| **Nauka 1** | Audyt podstaw IT małej firmy, 49 pytań w 13 obszarach. Dobry wybór na pierwszy przegląd. Inspiracją jest CIS Controls IG1. |
| **Nauka 2** | Pięć modułów po 20 pytań. Konta i dostępy, kopie zapasowe i ciągłość, sieć i Wi-Fi, stacje i serwery oraz poczta i świadomość pracowników. |
| **Audytor 3** | Gotowość KSC/NIS2, Przegląd ISO 27001 i ponowne sprawdzenie wcześniejszych ustaleń. |
| **Audytor 4** | Audyt techniczny i Pełny program audytu. Katalog zawiera 93 karty, a właściwy zakres ustala się w Konfiguratorze. |
| **Wkrótce** | Karty zapowiadające przeglądy RODO, dostawców i chmury. |

W nagłówku zmienisz tryb pracy. Nauka pokazuje listę pytań, dowody, ustalenia, raport, przewodnik i słowniczek. Audytor udostępnia Konfigurator, Plan i listy kontrolne, Macierz wymagań, Formularze i Źródła. Oba tryby korzystają z tych samych dowodów i ustaleń. Zakres pytań i zakres planu Audytora zapisują się oddzielnie.

Wskaźnik jest orientacyjny. „Zgodne” daje 1 punkt, „Częściowo” 0,5, „Niezgodne” 0. „Nie dotyczy” usuwa pytanie z mianownika. „Nie oceniono” pozostaje w mianowniku bez punktów, a liczba takich pytań jest widoczna osobno. Brak ocen wyświetla się jako opis.

## Oceny, dowody i zamknięcie ustalenia

- **Wybierz z rejestru** przypina już zapisany dowód. **Dodaj dowód** otwiera formularz dla bieżącego pytania i po zapisie pozwala wrócić do oceny.
- Pod polem uzasadnienia widać brak opisu, brak dowodu i identyfikatory, których nie ma już w rejestrze. Pulpit oceny pozwala wyświetlić pytania do uzupełnienia. „Nie dotyczy” bez przyczyny zapisuje się jako szkic i do chwili uzupełnienia liczy się jak „Nie oceniono”.
- Ustalenie pochodzące z pytania zachowuje moduł, jego wersję oraz ocenę, uzasadnienie i identyfikatory dowodów z chwili utworzenia. Z karty ustalenia można otworzyć pytanie. W krótkim raporcie odsyłacze prowadzą do śladu oceny i listy dowodów w tym samym dokumencie.
- W **Ustaleniach** wybierz właściciela i termin, np. „Po terminie” albo „Od dziś do 7 dni”. **Zapisz ponowne sprawdzenie** wymaga osoby, daty, wyniku, opisu i dowodu z rejestru. Skuteczna poprawka zamyka ustalenie, a niepełna zostawia je do ponownego sprawdzenia. **Zapisz akceptację ryzyka** rejestruje osobę uprawnioną, datę i uzasadnienie. Wcześniejsze decyzje są widoczne w historii karty. Dane osoby wpisuje audytor.

## Raport i druk

W **Raporcie** wpisz podsumowanie i ograniczenia. Domyślnie raport korzysta z aktywnego modułu. Aby wybrać kilka, odznacz **Tylko aktywny moduł** i zaznacz moduły do wydruku. Każdy ma osobny wynik i pokrycie. Raport obejmuje również ustalenia bez jednoznacznego przypisania do modułu oraz dowody powiązane z tym zakresem. W Nauce otrzymasz krótki raport A4 z wykresem obszarów, ustaleniami, pilnymi działaniami, właścicielami, terminami i dowodami. Podział jest przygotowany na 3–6 stron przy typowej objętości danych. Dłuższe wpisy i liczne ustalenia mogą zwiększyć liczbę stron. Audytor zachowuje pełny raport z opcjonalnym aneksem kart zadań.

Wybierz **Generuj / zapisz PDF**, a w oknie drukowania **Zapisz jako PDF**. W razie potrzeby wyłącz nagłówki i stopki przeglądarki. Samodzielny raport HTML można pobrać osobno. Przykład pełnego raportu zawierający fikcyjne dane znajduje się w `dodatki/przyklady_raportow/`.

## Projekty, kopie i przenoszenie

- W **Projektach** utworzysz, skopiujesz, otworzysz, wyeksportujesz i usuniesz projekt po potwierdzeniu. Eksport JSON dotyczy jednego projektu. Import tworzy nową pozycję na liście.
- Pierwsze uruchomienie przenosi lokalny zapis schematu 2 do schematu 3 i otwiera go w trybie Audytor. Wcześniejszy zapis pozostaje pod swoim kluczem jako kopia. Plik JSON schematu 2 także można wczytać. Do plików z wersji 1.x służy wcześniejsza wersja narzędzia.
- Jeśli przeglądarka nie może odczytać danych lub brakuje miejsca na migrację, skorzystaj z widocznej opcji pobrania oryginalnego zapisu. Przy usuwaniu projektu Studio proponuje ostatnią kopię jeszcze przed zatwierdzeniem.
- Pobieraj kopie JSON regularnie. Limit pamięci jest współdzielony przez projekty w tej samej przestrzeni. Wskaźnik to szacunek, a nie odczyt limitu przeglądarki. Przeglądarki mogą łączyć albo rozdzielać pamięć różnych plików otwieranych z dysku.
- Unikaj edycji tej samej przestrzeni w dwóch kartach. Studio rozpoznaje zmianę zapisu z zewnątrz. Tam, gdzie przeglądarka udostępnia blokadę zapisu między kartami, używa jej do skoordynowania zapisów.
- Dane w `localStorage` są jawne. Traktuj projekty oraz wyeksportowane pliki jako potencjalnie poufne. Korzystaj z chronionej lokalizacji na kopie i przejrzyj treść przed udostępnieniem.

W HexoraIT Studio otwiera się pod adresem `/audyt` i zajmuje całą przestrzeń strony. Do HexoraIT wrócisz przyciskiem **Wróć do HexoraIT** albo przyciskiem **Wstecz** przeglądarki po wejściu z menu. Projekty zapisują się osobno dla każdej pary konto–organizacja. Aby udostępnić kopię JSON lub raport PDF organizacji, dołącz go po eksporcie w **Audyty → Historia audytów**. Historia i jej załączniki korzystają z uprawnień organizacji oraz zapisu po stronie HexoraIT.

## Ograniczenia

Aplikacja służy do organizowania, dokumentowania i nauki wewnętrznego przeglądu IT. Raport nie kwalifikuje firmy do KSC, nie jest certyfikatem i nie zastępuje audytu ustawowego. Wniosek zależy od właściwych kryteriów, zakresu i dowodów. Tryb Nauka prowadzi wyłącznie przez przegląd pasywny. Źródła zewnętrzne otwierają się po kliknięciu. Do pracy z projektem i wydruku aplikacja używa wyłącznie lokalnych zasobów.

### Podstawa metodyczna

- Zapisz cel, kryteria, granice, wyłączenia i okres w konfiguratorze. Dobieraj próbę według ryzyka i opisuj ograniczenia w raporcie. [ISO 19011:2026](https://www.iso.org/standard/19011)
- W karcie zadania odnotuj metodę pozyskania dowodu, np. przegląd dokumentów, wywiad lub test kontroli, oraz zapisz wynik i identyfikatory dowodów. [NIST SP 800-53A](https://csrc.nist.gov/pubs/sp/800/53/a/r5/final)
- Przypisz zaleceniom właściciela i termin. Dopisz wynik weryfikacji wdrożenia albo formalną decyzję o akceptacji ryzyka. [The IIA, standardy 14.4 i 15.2](https://www.theiia.org/en/standards/2024-standards/global-internal-audit-standards/)
- W przeglądach opartych na NIST CSF ustal z organizacją stan docelowy. Przy ocenie luk porównaj ustalenia z wynikiem, który organizacja chce osiągnąć. [NIST SP 1301](https://csrc.nist.gov/pubs/sp/1301/final)

## Przepisy, standardy i uczciwe zastrzeżenia

Weryfikacja źródeł: **4 listopada 2026 r.** Potwierdzone materiały w `referencje/zrodla.md` i zakładce Źródła. Przed rozpoczęciem nowego zlecenia **zweryfikuj najnowsze brzmienie prawne i sektorowe**.

- **KSC / NIS2 (Polska):** ustawa z 23 stycznia 2026 r. o zmianie ustawy o krajowym systemie cyberbezpieczeństwa oraz niektórych innych ustaw, Dz.U. 2026 poz. 252: https://eli.gov.pl/eli/DU/2026/252/ogl ; dyrektywa (UE) 2022/2555: https://eur-lex.europa.eu/eli/dir/2022/2555/oj ; polski komunikat o datach: https://www.gov.pl/web/cyfryzacja/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc--najwazniejsze-terminy . **Termin 3.04.2028 na pierwszy audyt nie dotyczy automatycznie wszystkich organizacji**, a tym bardziej każdego małego przedsiębiorstwa.
- **ISO/IEC 27001:2022 (+Amd1:2024) i ISO 19011:2026:** normy licencjonowane; dostępne źródła informacyjne ISO: https://www.iso.org/standard/27001 i https://www.iso.org/standard/19011 . Nie odtwarzamy w pakiecie pełnej chronionej treści i nie deklarujemy zgodności z każdą kontrolą Załącznika A.
- **NIST CSF 2.0:** https://www.nist.gov/cyberframework ; **CIS Controls v8.1:** https://www.cisecurity.org/controls/v8-1 ; **OWASP:** https://owasp.org/www-project-application-security-verification-standard/ . Są to metodyki/standardy bezpieczeństwa, a ich wymagania nie zawsze są samodzielnym obowiązkiem prawnym.
- **RODO:** art. 32–35 https://eur-lex.europa.eu/eli/reg/2016/679/oj . **DORA:** https://eur-lex.europa.eu/eli/reg/2022/2554/oj . **UE 2024/2690:** https://eur-lex.europa.eu/eli/reg_impl/2024/2690/oj . **CRA:** https://eur-lex.europa.eu/eli/reg/2024/2847/oj . Przepisy sektorowe aktywuj dopiero po sprawdzeniu zakresu podmiotowego i obowiązujących terminów.

**Macierz 68 kryteriów jest roboczym przewodnikiem (crosswalk), nie literalnym reprodukowaniem pełnego tekstu prawa/norm i nie gwarantuje pełnego pokrycia.** Dla prawnego audytu zgodności doprecyzuj każdy paragraf i akt wykonawczy, a dla pełnego ISO zastosuj licencjonowany tekst, deklarację stosowania i zakres SZBI. Dodaj własne kryteria do `requirements-data.js` lub osobnego dokumentu programu. Kwalifikację statusu podmiotu KSC powinien potwierdzić kompetentny prawnik/właściciel obowiązków.

## Pliki i rozwój

| Ścieżka | Zawartość |
| --- | --- |
| `index.html`, `assets/style.css` | Punkt wejścia, widoki, dostępność i druk. |
| `assets/app-v2.js`, `assets/project-data.js` | Obsługa projektów, migracja, walidacja i wspólne narzędzia. |
| `assets/templates-data.js`, `assets/demo-data.js`, `assets/learning-ui.js` | Pytania, fikcyjne materiały, przewodnik i krótki raport. |
| `assets/followup-ui.js` | Widok działań i formularze decyzji. |
| `assets/audit-data.js`, `assets/playbook-data.js`, `assets/requirements-data.js` | Dotychczasowy katalog zadań, kroków, kryteriów oraz źródeł. |
| `dodatki/` | Formularze PDF, odpowiedniki Markdown oraz przykładowe raporty. |
| `archiwum_v1/`, `archiwum_v2/`, `referencje/` | Starsze przykłady i zrzuty oraz bieżące zestawienia pomocnicze. |
| `narzedzia/` | Weryfikacja i narzędzia do przygotowania paczki. |

Źródłem pakietu dla Vite i obrazu web jest `HexoraITWeb/public/audit-studio`. Po zmianie pytań zachowaj stabilne identyfikatory i zwiększ wersję szablonu, gdy zmienia się jego treść. Przed wydaniem uruchom `node narzedzia/check_pack_v3.cjs`, `node --test narzedzia/project-data.test.cjs` i próbę druku. Sumy można odtworzyć poleceniem `node narzedzia/make_checksums.js` oraz sprawdzić z opcją `--check`. Formularze odtwarza `python narzedzia/generate_forms.py` z ReportLab i wymaganymi lokalnymi czcionkami.
