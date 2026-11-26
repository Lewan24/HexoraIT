# Historia zmian

## CyberAudit Studio 2.2

- Wskazówki przy ocenach pokazują brak uzasadnienia, brak dowodu i nieaktualne odwołania. Dodano wybór dowodu z rejestru i powrót do pytania po zapisaniu nowego dowodu.
- Ustalenia zachowują źródłowy moduł i ocenę z chwili utworzenia. Krótki raport łączy ustalenia ze śladem oceny i dowodami.
- Widok działań filtruje według właściciela i terminu. Zapis ponownego sprawdzenia oraz akceptacja ryzyka mają osobne formularze i historię decyzji.
- Krótki raport przyjmuje kilka wybranych modułów i pokazuje każdy wynik osobno. Projekty i pliki nadal korzystają ze schematu 3.

## CyberAudit Studio 2.1

- Domyślny tryb Nauka z przewodnikiem, słowniczkiem, zestawem 149 pytań do pasywnego przeglądu i fikcyjnym ćwiczeniem. Dotychczasowe 93 zadania i macierz wymagań są w trybie Audytor.
- Lista projektów z kopiowaniem, usuwaniem po potwierdzeniu oraz eksportem i importem JSON. Schemat 3 przenosi projekty schematu 2 z zachowaniem wcześniejszego zapisu.
- Wskaźnik oceny ogółem i według obszarów. Z pytania można utworzyć ustalenie i dołączyć identyfikator dowodu.
- Krótki raport A4 z wykresem i planem działań oraz dotychczasowy raport z aneksem w trybie Audytor.
- Kopie przed usunięciem, odzyskiwanie, licznik zmian i szacunkowy wskaźnik pamięci.
- Formularze i przykładowe raporty przeniesiono do dodatków, materiały historyczne do archiwów. Dodano lokalny generator sum SHA-256.

## Integracja z HexoraIT

- Dodano osobny lokalny szkic dla pary konto–organizacja i ochronę przed przypadkowym nadpisaniem projektu w innej karcie.
- Import oraz nowy projekt odświeżają ustawienia formularza raportu. Przejście z macierzy do zadania zachowuje zakres. Identyfikator proponowany dla dowodu pozostaje wolny po usunięciu rekordów.
- Kontrola jakości sprawdza weryfikację dowodów i próby, dane planu działań oraz udokumentowanie akceptacji ryzyka.

## CyberAudit Studio 2.0 | 04.11.2026

- Odświeżony, ciemniejszy i responsywny interfejs HTML działający offline.
- Konfigurator pojedynczego projektu z 6 profilami, typem audytu, głębokością, wielkością firmy, listą ram prawnych/norm i 11 obszarami.
- Inteligentny dobór zadań technicznych, przygotowawczych i formalnych (93 bazowe zadania).
- 3 praktyczne mikrokroki dla każdej czynności, łącznie 279 punktów kontrolnych.
- Oddzielne statusy wykonania, wyniku badania, rodzaju dowodu, próby i weryfikacji.
- Macierz 68 roboczych kryteriów ze wsparciem KSC/NIS2, ISO 27001, NIST CSF, CIS, RODO, DORA, CRA, UE 2024/2690 i OWASP.
- Ręczne wyłączanie/przywracanie pojedynczych kryteriów wraz z uzasadnieniem i śladem w raporcie.
- Retest z 13 podstawowymi zadaniami formalnymi i wskazanymi ID kontroli; automatyczne powiązanie wymagań z zadaniami retestu.
- Rejestr metadanych dowodów i rejestr niezgodności / CAPA / retest z punktową oceną ryzyka.
- Kontrole jakości raportu, w tym nieocenione pozycje, braki dowodów, nieuzasadnione wyłączenia i zamknięcia bez retestu.
- Pełny raport HTML i wersja PDF generowana lokalnie przez drukowanie przeglądarki, z aneksem wszystkich zadań i wyników.
- Zachowano 10 edytowalnych formularzy PDF AcroForm, 10 szablonów Markdown i pliki pomocnicze CSV.
- Dodano fikcyjny raport przykładowy PDF oraz skrypt kontroli spójności danych (`narzedzia/check_pack_v2.cjs`).

**Istotna różnica względem v1:** projekt JSON z wersji 1.0 nie jest automatycznie konwertowany. Eksport/import w Studio 2.0 obsługuje format `schema: 2`. Zachowaj kopię wcześniejszego pakietu dla starych projektów.

**Ograniczenia:** brak połączenia z systemami firmowymi, automatycznych skanów i automatycznego potwierdzania zgodności; dane lokalne nie są zaszyfrowane; drukowanie PDF wymaga wybrania „Zapisz jako PDF” w przeglądarce; zadania i skrócone kryteria nie zastępują norm prawnie wiążących, specjalistycznych uprawnień ani kompletnego testu certyfikacyjnego.
