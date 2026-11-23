# Operacje i zmiany IT

Wybierz organizację, a następnie **Operacje i zmiany IT** w sekcji Operacje. Administrator może ukryć moduł w ustawieniach organizacji. Uprawnienia dotyczą organizacji i konkretnych wpisów.

1. W **Nowy wpis** wybierz jeden z 72 szablonów A01–F10. A02 opisuje GPO, A06 zaporę, a D02 test odtworzenia. Biblioteka szablonów ma wyszukiwanie, filtry kategorii/zakresu i stronicowanie.
2. Podaj tytuł, ryzyko, typ, opis i ewentualnie zasób oraz planowany termin. Wykonawca i właściciel domyślnie są wnioskodawcą; można wskazać inne osoby z organizacji. Przy wysokim ryzyku domyślnie trzeba rozdzielić wnioskodawcę i wykonawcę.
3. Uzupełnij formularz. Dla GPO użyj **Dodaj wiersz**, aby zapisać wiele ustawień wraz z poprzednimi i nowymi wartościami. Nie wpisuj haseł ani kluczy prywatnych; użyj modułu Hasła i podaj odnośnik.
4. **Zapisz szkic** pozwala zachować niepełne dane. Otwórz wpis ponownie z rejestru. Przyciskiem Wstecz można anulować opuszczenie niezapisanego formularza; zamknięcie karty przeglądarki również wyświetla ostrzeżenie. Nawigacja boczna/przełączenie organizacji nie ma jeszcze pełnej ochrony niezapisanych zmian — najpierw zapisz szkic.
5. Po uzupełnieniu wymaganych widocznych pól zapisz szkic i wybierz akcję **Wysłany**. Administrator kieruje zmianę do zatwierdzenia. Domyślnie zatwierdza inny administrator; szczegóły zależą od polityki organizacji. Dla zmiany wstępnie zatwierdzonej dostępna jest bezpośrednia akcja zatwierdzenia po wysłaniu.
6. Wykonuj dostępne akcje procesu: rozpoczęcie, weryfikacja, ukończenie, zamknięcie. Wyniki testów i uwagi zapisuj w polu uwag akcji. Formularz po wysłaniu jest zamrożony. Zamknięcie wymaga uwag i uprawnień administratora.
7. Historia aktywności i wersji jest na dole wpisu. **Eksportuj PDF** jest dostępny po wysłaniu. Zmiana awaryjna wymaga uzasadnienia pominięcia zgody i niezależnego przeglądu przed zamknięciem.

D02 i drobne wpisy operacyjne korzystają z procesu: szkic → wysłany → zamknięty → zarchiwizowany. Dokumenty wymagające zgody mają dodatkowo zatwierdzenie/odrzucenie po wysłaniu. Udany test odtworzenia wymaga opisania weryfikacji integralności i działania aplikacji. Termin ważności reguły zapory jest wymagany po oznaczeniu jej jako tymczasowej. Pola zależne pojawiają się zgodnie z wybranymi wartościami.

Rejestr umożliwia wyszukiwanie, filtrowanie, sortowanie i stronicowanie. **Moje dokumenty** filtrują według wnioskodawcy. **Oczekujące zatwierdzenia** pokazują wpisy oczekujące na zgodę; dostępność decyzji sprawdza API. W szczegółach zasobu zakładka **Powiązane zmiany** pokazuje powiązane wpisy.

Konflikt 409 oznacza nieaktualną wersję: wczytaj wpis ponownie przed zapisem lub decyzją. Administrator w bibliotece może **Klonować do organizacji**, edytować JSON jako nową wersję, **Sprawdzić schemat** z podglądem, importować/eksportować JSON i aktywować/dezaktywować szablony. Istniejące dokumenty zachowują pierwotną wersję; nowy wpis wymaga aktywnej najnowszej wersji.

W **Polityka operacji organizacji** administrator ustala wstępne zgody, rozdzielenie obowiązków, samodzielne zatwierdzanie przy niskim ryzyku oraz ewentualne uzasadnione wyjątki. Polityka nie nadaje roli zatwierdzającego: nadal wymagana jest rola administratora/właściciela. Wyjątek zapisuje uzasadnienie, zalogowanego administratora i czas w historii. Retencja jest liczbą dni; wpisy nie są usuwane automatycznie. Kryteria i terminy zgłoszeń są danymi JSON utrzymywanymi przez organizację — aplikacja nie wyznacza obowiązku prawnego.

Pola ograniczone widzą administratorzy i właściciele. Pozostali użytkownicy nie otrzymują ich wartości w API, PDF ani historii wersji; zapis pozostałych pól nie usuwa ukrytych danych. Pola sekretów wyświetlają instrukcję użycia sejfu i nie przyjmują wartości. Nie wpisuj sekretów w zwykłe pola tekstowe.

Moduł nie certyfikuje zgodności z normami ani prawem. Pełny zakres i ograniczenia: [opis techniczny](../it-operations.md).

Licencja typu **Wieczysta** ma nieaktywną datę wygaśnięcia. Po wybraniu licencji terminowej data ponownie staje się wymagana.
