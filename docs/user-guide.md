# Praca w HexoraIT

## Organizacje i uprawnienia

Po zalogowaniu utwórz organizację stałą albo tymczasowe zlecenie. W **Dostosuj organizację** zmienisz zestaw widocznych modułów. Właściciel lub administrator organizacji może zarządzać członkami, rolami i dostępem klientów oraz przenieść organizację do archiwum i później ją przywrócić. Ukrycie modułu w menu służy organizacji widoku. Prawa do odczytu i zapisu ustawia się w rolach i regułach dostępu.

W aplikacji jest wbudowana **Instrukcja obsługi**. Jej źródło zawiera szczegółowy opis ekranów i administracji. [Instrukcja w repozytorium](../HexoraITWeb/src/content/instrukcja-obslugi.md)

## Audyt wewnętrzny

1. W organizacji wybierz **Przeprowadź audyt**. CyberAudit Studio otworzy się pod `/audyt`. Tryb **Nauka** prowadzi przez checklistę, dowody, ustalenia i raport. Tryb **Audytor** udostępnia szerszy plan audytu.
2. Eksportuj projekt jako JSON, jeśli chcesz zachować kopię lub kontynuować pracę w innej przeglądarce. Raport możesz zapisać jako PDF przez okno drukowania przeglądarki.
3. W **Historii audytów** dodaj wspólny wpis z datą audytu. Każda aktualizacja zapisuje status, autora i czas dodania. Możesz dodać notatkę i maksymalnie dwa pliki JSON lub PDF do 10 MiB każdy. Projekty Studio są zapisywane w pamięci przeglądarki. Pliki do historii dodaje się ręcznie.
4. W aktualizacji istniejącego audytu ustaw status **Archiwalny**, aby przenieść wpis z głównej listy do **Pokaż archiwalne**. W archiwum można odczytać przebieg i pobrać załączniki. Ustawienie innego statusu przywraca wpis do głównej listy.

[Instrukcja CyberAudit Studio](../HexoraITWeb/public/audit-studio/README.md)

## Operacje IT i dokumentacja PDF

W **Operacjach i zmianach IT** wybierz **Dokument podstawowy**, aby zapisać prostą procedurę lub notatkę, albo **Szablon zaawansowany**, aby skorzystać z pól dopasowanych do operacji i obiegu zatwierdzeń. Zapisz dane przed generowaniem raportu. [Katalog szablonów](it-operations-catalog.md)

Właściciel lub administrator organizacji może otworzyć **Dokumentacja PDF**, określić sekcje i wpisy oraz sprawdzić zakres przed wygenerowaniem pliku. Jawne dane dostępowe, klucze licencji i finanse są domyślnie wyłączone. Zawartość załączników można pobrać osobno, PDF zawiera ich wykaz. [Przykładowy PDF z danymi fikcyjnymi](examples/organization-documentation-example.pdf)

## Przenoszenie dokumentacji

W **Ustawienia → Eksport i import danych** wybierz zakres eksportu i osobne hasło szyfrowanego ZIP-a. Zachowaj hasło oddzielnie od pliku. Uprawnienie do eksportu obejmuje wspólną dokumentację w wybranym zakresie, w tym dane sejfu po uwzględnieniu tej sekcji. Do importu przygotuj pustą organizację i przejrzyj podsumowanie przed zatwierdzeniem. Eksport i zatwierdzenie importu wymagają ponownego podania hasła do konta. Konta, role, prywatne notatki i historia audytów wymagają osobnego zabezpieczenia.
