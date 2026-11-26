# CyberAudit Studio 2.0 — przegląd i plan uproszczenia

## Stan na początku prac

Studio znajdowało się w `HexoraITWeb/public/audit-studio` jako nieśledzona jeszcze paczka. W drzewie roboczym były też wcześniejsza integracja z HexoraIT, migracja historii audytów, nagłówki Nginx i niezwiązane zmiany w sejfie haseł. Stan wyjściowy Studio skopiowano do `backup_original/audit-studio` w głównym katalogu repozytorium. Commit etapu 1 obejmuje wyłącznie Studio, wraz z odziedziczonymi plikami paczki. Kopia i zmiany w pozostałych częściach repozytorium są poza tym commitem.

Wcześniejsza praca w Studio obejmowała osobne klucze szkiców dla konta i organizacji, ochronę przed nadpisaniem przez inną kartę, odtwarzanie pól raportu po imporcie, odsyłacze z macierzy zachowujące zakres, eksport CSV oraz dodatkowe sprawdzenia jakości. Te mechanizmy uwzględniono przy naprawach.

## Co zachować, zmienić i usunąć

| Decyzja | Element i uzasadnienie |
| --- | --- |
| Zachować | 93 karty pracy i 68 kryteriów są przydatne w rozbudowanym badaniu. Karta pracy opisuje czynność audytora, podczas gdy pytanie kontrolne powinno opisywać możliwy do potwierdzenia stan firmy. |
| Zachować | Oddzielna ocena, status wykonania i rejestr dowodów pozwalają pokazać czynności zakończone mimo braku podstaw do pozytywnej oceny. W studium małej firmy należy zachować to rozróżnienie. |
| Zachować | Metadane dowodów, ustalenia z właścicielem i terminem oraz raport z aneksem tworzą dokumentację pozwalającą odtworzyć decyzję audytora. |
| Zachować | Lokalne zależności HTML/CSS/JS, JSON, druk A4 i formularze działają bez usługi zewnętrznej. Pakiet nadal można rozwijać niezależnie od HexoraIT. |
| Zmienić | Zabezpieczenia zapisu, walidację importu i widoczność kopii opisano poniżej. Użytkownik musi widzieć, jaki projekt edytuje i czy dane zapisano. |
| Zmienić | Pierwszy przegląd wymaga prostszej ścieżki opartej na pytaniach o firmę. Obecny pulpit zakłada znajomość zakresu, kryteriów i sposobu doboru próby. |
| Usunąć | Ozdobny rysunek na pulpicie zastąpiła krótka kolejność pracy. Angielskie śródtytuły i część żargonu zastąpiły polskie odpowiedniki. Nazwy źródeł, oznaczenia norm i identyfikatory zachowano. |
| Ocenić do archiwizacji | Przejrzeć starsze przykłady i obrazy interfejsu pod kątem przydatności po uproszczeniu. Decyzja o miejscu formularzy, szablonów i archiwum należy do etapu 2. |

## Naprawy etapu 1

- Błąd odczytu wstrzymuje automatyczny zapis. Przeglądarka, o ile ma miejsce, przechowuje osobną kopię surowych danych. Powtórne otwarcie tego samego uszkodzonego zapisu nie tworzy kolejnych identycznych kopii. Oryginał pozostaje pod kluczem projektu do ręcznego wznowienia zapisu. Surowy zapis można pobrać również wtedy, gdy przeglądarka odmówiła zapisania kopii awaryjnej.
- Import i nowy projekt zachowują poprzednią wersję jako ostatnią kopię i otwierają okno z możliwością pobrania JSON oraz anulowania. Gdy pamięć odmawia zapisania kopii, pobranie jest dostępne przed decyzją o zastąpieniu. Zmiana w innej karcie nadal chroni główny zapis przed nadpisaniem.
- Eksport schematu 2 zawiera nazwę i wersję aplikacji. Licznik oznacza faktyczne zmiany zawartości i przypomina o kopii od dziesiątej zmiany. Pasek pamięci szacuje zajętość całej przestrzeni `localStorage` widocznej w danej lokalizacji przeglądarki. Przyjęte 5 MiB stanowi punkt odniesienia. Przeglądarki mogą stosować inne limity i inaczej rozdzielać pamięć dla adresów `file://`.
- Walidacja stosuje zbiory statusów właściwe dla pól, ocenę ryzyka od 1 do 5 i sprawdzanie rzeczywistych dat kalendarzowych. Duplikaty identyfikatorów otrzymują wolne numery bez usuwania rekordów. Pierwszy rekord zachowuje identyfikator, a wcześniejsze odwołania tekstowe pozostają bez zmian. Przy pierwotnie zduplikowanym ID trzeba ręcznie ustalić, którego rekordu dotyczył odsyłacz. Klucze kart spoza katalogu pomija się tak jak dotychczas.
- Pola kart zyskały powiązane etykiety. Wzmocniono widoczność fokusu, kontrast podpowiedzi i nawigację klawiaturą. Druk raportu i eksport HTML korzystają z rozmiaru A4 z tymi samymi marginesami. Długie słowa i identyfikatory mogą się łamać zamiast wychodzić poza stronę.
- Ograniczenie rozmiaru importu pozostało bez zmian. Kopie i metadane w pamięci przeglądarki są jawne. Sekrety należy pozostawić poza projektem.

## Weryfikacja etapu 1

- Cztery testy Node sprawdzają zachowanie danych schematu 2, statusy, daty, skalę ryzyka, powtarzające się identyfikatory i nieprawidłową strukturę. Polecenie w katalogu Studio to `node --test narzedzia/project-data.test.cjs`.
- Kontrola pakietu potwierdziła 93 zadania, 279 podpunktów, 68 kryteriów i 20 źródeł. Uruchomienie za pomocą `node narzedzia/check_pack_v2.cjs`.
- Chromium w trybie bez okna sprawdził zapis awaryjny, odzyskanie przy symulowanym braku miejsca, pobrane pliki, licznik, wskaźnik pamięci, import schematu 2, anulowanie i utworzenie projektu, etykiety oraz fokus po zmianie widoku. Studio otwarto także z `file://`. Podczas scenariusza aplikacja nie zgłosiła żądań poza zasobami lokalnymi.
- Produkcyjny build Vite skopiował Studio i nowy moduł walidacji do katalogu wynikowego.
- Silnik drukowania Chromium wygenerował pełny raport testowy A4 z danymi z importu. Sprawdzono rozmiar stron oraz obecność podsumowania i dowodu w tekście PDF. Do sprawdzenia pozostaje systemowe okno wydruku w innych przeglądarkach, zachowanie `file://` poza Chromium oraz odbiór przez czytniki ekranu.

## Do weryfikacji przez użytkownika

Przegląd wykonano bez internetu. Poniższe twierdzenia i cytowania są zapisami zastanymi w paczce. Przed użyciem w formalnym audycie porównaj je z aktualnymi materiałami pierwotnymi i ustal, czy dotyczą organizacji. Dotyczy to też mapowania poszczególnych pytań w `assets/requirements-data.js` i `referencje/`, dat źródeł 04.11.2026 oraz skrótów w przykładowych materiałach.

| Katalogowe źródło | Co zweryfikować |
| --- | --- |
| KSC26, KSC_TIMES, KSC_OBL, KSC_MAP | Dz.U. 2026 poz. 252 i wejście w życie 03.04.2026, wpis 03.10.2026, terminy S46 i SZBI 03.04.2027, pierwszy audyt części podmiotów 03.04.2028, cykl trzyletni, status byłych UOK, wyjątki i kwalifikacje audytora. Ustalić status mapowania opisanego datą 10.09.2026. |
| CERT26 | Zasady kwalifikacji i zgłoszenia incydentu opisywane jako 24 godziny, 72 godziny i miesiąc, aktualizacja 02.09.2026 oraz wyjątki i okres przejściowy. |
| NIS2, EU2690, ENISA25 | Dyrektywa (UE) 2022/2555, art. 20, 21 i 23 oraz załączniki I–II, granice zastosowania rozporządzenia wykonawczego (UE) 2024/2690 i wydanie wytycznych ENISA oznaczone 26.06.2025. |
| GDPR | Rozporządzenie (UE) 2016/679, art. 5, 24, 28, 30 oraz 32–35, zwłaszcza przesłanki i termin 72 godzin w art. 33 oraz relację do zgłoszeń sektorowych. |
| DORA, CRA | Rozporządzenie (UE) 2022/2554 i zakres stosowania od 17.01.2025. Rozporządzenie (UE) 2024/2847, art. 14 i art. 71, daty 11.09.2026 i 11.12.2027 oraz obowiązki zależne od roli organizacji. |
| ISO19011, ISO27001, ISO27002, ISO27005 | ISO 19011:2026 i relację do wydania 2018, ISO/IEC 27001:2022 z Amd 1:2024, ISO/IEC 27002:2022 i ISO/IEC 27005:2022. Sprawdzić bloki wymagań, SoA i mapowania Załącznika A na licencjonowanym egzemplarzu. |
| NISTCSF, NIST115, CIS81, OWASPASVS, OWASPWSTG | NIST CSF 2.0, NIST SP 800-115, CIS Controls v8.1 i IG1–IG3, ASVS 5.0.0 z datą 30.05.2025 oraz status WSTG 4.2 i 5.0. |
| Źródła dodatkowe z README | NIST SP 800-53A, NIST SP 1301 i standardy IIA 14.4 oraz 15.2. Sprawdzić aktualne wydania i zastosowanie dla danego rodzaju przeglądu. |

## Proponowane dalsze zmiany i wysiłek

Szacunki w dniach roboczych jednej osoby, z przygotowaniem treści i weryfikacją. Propozycje trybów, migracji i archiwizacji opisano w planie etapu 2 poniżej.

| Zmiana do rozważenia | Przybliżony wysiłek |
| --- | --- |
| Projekt trybów, reguły przenoszenia danych i plan archiwizacji | 1–2 dni |
| Menedżer projektów, migracja i zabezpieczenia operacji na projektach | 2–4 dni |
| Pierwsza pasywna lista pytań, reguła oceny i powiązanie z ustaleniami | 3–5 dni |
| Pięć dodatkowych modułów i opis istniejących profili | 5–8 dni |
| Przewodnik po pierwszym audycie, słowniczek i ćwiczenie z fikcyjną firmą | 3–5 dni |
| Krótki raport PDF, wydruki próbne i porządki w paczce | 2–4 dni |
| Testy przekrojowe i sprawdzenie zgodności wstecznej | 2–3 dni |

## Etap 2 — plan do akceptacji

### Nauka i Audytor

Projekt ma jeden rejestr dowodów i ustaleń oraz dwa widoki pracy. Przełączenie trybu zmienia nawigację i dostępne narzędzia. Zapisane oceny, ustalenia i dowody pozostają dostępne po powrocie do właściwego widoku.

| Tryb | Co pokazuje | Jak zaczyna użytkownik |
| --- | --- | --- |
| **Nauka** | Pulpit, Audyt, Dowody, Ustalenia, Raport, Jak audytować?, Słowniczek | To domyślny tryb dla nowych użytkowników. Pulpit oferuje otwarcie istniejącego projektu, pierwszy audyt lub ćwiczenie na fikcyjnej firmie. Widok **Audyt** prowadzi przez pytania o stan firmy. |
| **Audytor** | Wspólne widoki oraz Konfigurator, pełny plan 93 zadań, Macierz wymagań, Formularze i Źródła prawne | Karty poziomów 3 i 4 prowadzą do istniejących profili. Każda podaje trudność, wymagania wstępne i obszary, do których pasuje. Zmiana trybu jest dostępna w nagłówku projektu. |

Projekt przeniesiony ze schematu 2 otwiera się w trybie **Audytor** z dotychczasowym planem, macierzą i raportem. Przejście do **Nauki** pokazuje wspólne dane i pozwala dodać listę pytań po wyborze szablonu. Zakres tej listy zapisuje się osobno od zakresu planu audytora. Wyniki pytań i statusy zadań mają własne podsumowania.

### Pierwszy audyt i dalsze poziomy

- **Mój pierwszy audyt krok po kroku** ma siedem kroków. Ustal zakres i zgodę, zbierz informacje, przejdź przez listę pytań, opisz dowody, zapisz ustalenia, przygotuj raport, uzgodnij plan naprawczy. Na początku wystarczą nazwa, firma, audytor, zakres i data. Wskazówki przy polach prowadzą do polskiego słowniczka.
- **Poziom 1** to proponowany start z 40–50 pytaniami „Audyt podstaw IT małej firmy”. **Poziom 2** to pięć modułów po 20–30 pytań o konta, kopie i ciągłość działania, sieć i Wi-Fi, stacje i serwery oraz pocztę i świadomość pracowników. Pytania kierują do rozmowy, dokumentu albo widoku ustawień w trybie odczytu. Przy kopiach zapasowych sprawdza się dokumentację ostatniego odtworzenia. Studio zapisuje identyfikatory i metadane dowodów. Z odpowiedzi „Niezgodne” lub „Częściowo” można utworzyć ustalenie z podpowiedzią ryzyka i zalecenia.
- **Poziomy 3 i 4** wykorzystują dotychczasowe profile. Na poziomie 3 proponuję Gotowość KSC/NIS2, Przegląd ISO 27001 i Retest. Wymagają odpowiednio ustalenia właściwych kryteriów, dostępu do normy albo wcześniejszych ustaleń do ponownego sprawdzenia. Na poziomie 4 znajdą się Audyt techniczny i Pełny program audytu z katalogiem 93 zadań. Wymagają uzgodnionego zakresu oraz odpowiednich kompetencji. Istniejące rozpoznanie sieci i własna konfiguracja pozostają dostępne w Konfiguratorze. Karty RODO, dostawców i chmury zapowiadają zakres jako **Wkrótce**.
- **Firma Demo Sp. z o.o.** to oznaczony, osobny projekt ćwiczeniowy dla fikcyjnej firmy zatrudniającej 10 osób. Przycisk otwiera istniejące ćwiczenie albo tworzy je przy pierwszym użyciu. Materiały szkoleniowe są dostępne od początku, a klucz odpowiedzi po świadomym odkryciu. Oddzielny przycisk usuwa wyłącznie projekt demonstracyjny po potwierdzeniu.
- **Ocena orientacyjna** dzieli punkty przez liczbę pytań mających zastosowanie. „Zgodne” daje 1 punkt, „Częściowo” 0,5, a „Niezgodne” 0. „Nie dotyczy” wyłącza się z obliczenia i wymaga uzasadnienia. „Nie oceniono” pozostaje w mianowniku i jest widoczne jako osobna liczba. Przykładowo 1 wynik zgodny i 9 nieocenionych daje 10% oraz pokrycie oceny 1 z 10. Przy braku ocen albo pytań mających zastosowanie interfejs pokazuje opis zamiast procentu. Krótki raport A4 przedstawia wyniki ogółem i według obszarów, zakres, ograniczenia, pięć pilnych działań, ustalenia według ryzyka, plan naprawczy i listę dowodów. Pełny raport pozostaje dostępny w trybie Audytor.

### Wiele projektów i migracja do schematu 3

**Lista projektów** jest dostępna z Pulpitu i nagłówka. Wiersz pokazuje nazwę, firmę, datę audytu, czas ostatniej zmiany i oznaczenie ćwiczenia. Wybór otwiera projekt. Lista pozwala utworzyć, skopiować, wyeksportować lub usunąć projekt. Kopia otrzymuje osobny identyfikator i zachowuje powiązania między dowodami a ustaleniami. Usunięcie wymaga potwierdzenia z nazwą projektu i oferuje eksport przed zatwierdzeniem. Przełączenie najpierw zapisuje aktywną pracę. W razie błędu można wrócić do edycji lub pobrać aktualny projekt.

**Format zapisu** używa jednego klucza schematu 3 na przestrzeń pracy. Osadzenie w HexoraIT zachowuje rozdział par konto–organizacja, a wersja samodzielna ma osobny klucz. Zapis obejmuje identyfikator aktywnego projektu, listę i zawartość projektów. Jedna operacja na kluczu zatwierdza razem powiązane zmiany, np. kopię i zaznaczenie jej jako aktywnej. Współdzielony limit pamięci i ponowny zapis całości uzasadniają grupowanie szybkich zmian. Przełączenie, kopiowanie i eksport najpierw zapisują dane oczekujące. Studio porównuje ostatnią odczytaną wersję z obecną i reaguje na zdarzenia zmiany pamięci. Gdy przeglądarka oferuje blokadę zapisu między kartami, zapis korzysta z krótkiej blokady. W pozostałych przeglądarkach porównanie zmniejsza ryzyko nadpisania, a jednoczesny zapis pozostaje ograniczeniem.

Każdy projekt zachowuje konfigurację, plan, macierz, dowody, ustalenia i raport. Dochodzą identyfikator projektu, data audytu, informacje o trybie i ćwiczeniu, wersja szablonu oraz odpowiedzi. Odpowiedzi odwołują się do stabilnych identyfikatorów pytań. Dotychczasowe brzmienie użytych pytań pozostaje czytelne po aktualizacji katalogu. Eksport JSON dotyczy jednego projektu, a import dodaje projekt do listy pod własnym identyfikatorem.

**Migracja zapisu lokalnego** odbywa się przy pierwszym uruchomieniu schematu 3 w danej przestrzeni. Studio odczytuje i waliduje dane pod dotychczasowym kluczem schematu 2, tworzy projekt w trybie Audytor, zapisuje go pod nowym kluczem i sprawdza odczyt. Stary zapis i kopie etapu 1 pozostają dostępne do odzyskania. Następne uruchomienie po poprawnej migracji otwiera schemat 3 i zachowuje jeden egzemplarz projektu. Brak miejsca albo uszkodzony zapis otwiera komunikat o odzyskiwaniu z możliwością pobrania oryginału. Zwolnienie miejsca po zabezpieczeniu danych wymaga odrębnej decyzji użytkownika. Import pliku schematu 2 używa tej samej reguły migracji i przedstawia wykryte korekty przed zatwierdzeniem.

### Porządki w paczce w etapie 4

| Obecny element | Proponowane miejsce | Uzasadnienie |
| --- | --- | --- |
| przyklady/ | archiwum_v1/przyklady/ | Materiały z wersji 1.x mają wartość historyczną. Główna ścieżka nauki poprowadzi do nowego ćwiczenia. |
| przyklady_v2/ | Raporty HTML i PDF do dodatki/przyklady_raportow/. Trzy zrzuty do archiwum_v2/zrzuty/. | Raporty ilustrują rozbudowany format. Zrzuty utrwalają dawny układ interfejsu. Materiały nowej fikcyjnej firmy będą miały osobne miejsce. |
| formularze_pdf/ i szablony_edytowalne/ | Podkatalogi o tych samych nazwach w dodatki/ | Wszystkie dziesięć par pozostaje dostępnych w zakładce Formularze w trybie Audytor, razem z podglądem i pobieraniem. |
| referencje/ | Dotychczasowa ścieżka | Zestawienia i źródła wspierają audyt zaawansowany. Ścieżki używa istniejący generator. |
| index.html, assets/, narzedzia/ | Dotychczasowe ścieżki | Punkt wejścia obsługuje otwarcie z dysku i osadzenie w HexoraIT. Przy przeniesieniu dodatków należy zaktualizować odsyłacze, generator formularzy, kontrolę pakietu, README i sumy kontrolne. |

Proponuję zachować zawartość wszystkich powyższych materiałów i ograniczyć porządki do przeniesienia plików oraz aktualizacji powiązań.

### Warunki akceptacji wdrożenia

1. Nowa przestrzeń otwiera Naukę. Projekt schematu 2 trafia do Audytora z dotychczasowym planem, macierzą, dowodami, ustaleniami i pełnym raportem. Zmiana trybu zachowuje pracę w obu widokach.
2. Testy obejmują ponowną migrację, brak miejsca, przerwany zapis i równoległą edycję w kartach. Import dodaje projekt do listy, a kopiowanie i usuwanie pozostawiają pozostałe projekty dostępne.
3. Pytania mają komplet danych i wyłącznie uprawnienie odczytu. Testy rozróżniają wynik i pokrycie oceny, sprawdzają utworzenie ustalenia z pytania oraz porównanie z kluczem ćwiczenia.
4. Oba raporty przechodzą próbę druku A4. Formularze, odsyłacze oraz sumy sprawdza się przy otwarciu z dysku i w wersji osadzonej. Scenariusz przeglądarkowy obejmuje pracę bez sieci.

Do decyzji przed etapem 3 są domyślna Nauka z otwieraniem starszych projektów w Audytorze, jeden lokalny zapis na przestrzeń z zachowaniem starej kopii oraz miejsca archiwizacji z tabeli.
