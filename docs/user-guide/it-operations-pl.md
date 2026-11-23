# Operacje i zmiany IT

Wybierz organizację, a następnie **Operacje i zmiany IT** w sekcji Operacje. Administrator może ukryć moduł w ustawieniach organizacji. Uprawnienia dotyczą organizacji i konkretnych wpisów.

1. W **Nowy wpis** wybierz A02 (GPO), A06 (zapora) lub D02 (test odtworzenia).
2. Podaj tytuł, ryzyko, typ, opis i ewentualnie zasób oraz planowany termin. Wykonawca i właściciel domyślnie są wnioskodawcą.
3. Uzupełnij formularz. Dla GPO użyj **Dodaj wiersz**, aby zapisać wiele ustawień wraz z poprzednimi i nowymi wartościami. Nie wpisuj haseł ani kluczy prywatnych; użyj modułu Hasła i podaj odnośnik.
4. **Zapisz szkic** pozwala zachować niepełne dane. Otwórz wpis ponownie z rejestru. Przyciskiem Wstecz można anulować opuszczenie niezapisanego formularza; zamknięcie karty przeglądarki również wyświetla ostrzeżenie. Nawigacja boczna/przełączenie organizacji nie ma jeszcze pełnej ochrony niezapisanych zmian — najpierw zapisz szkic.
5. Po uzupełnieniu wymaganych pól zapisz szkic i wybierz akcję **Wysłany**. Administrator kieruje zmianę do zatwierdzenia. Inny administrator zatwierdza ją; wnioskodawca i wykonawca nie mogą zatwierdzić własnej zmiany.
6. Wykonuj dostępne akcje procesu: rozpoczęcie, weryfikacja, ukończenie, zamknięcie. Wyniki testów i uwagi zapisuj w polu uwag akcji. Formularz po wysłaniu jest zamrożony. Zamknięcie wymaga uwag i uprawnień administratora.
7. Historia aktywności i wersji jest na dole wpisu. **Eksportuj PDF** jest dostępny po wysłaniu. Zmiana awaryjna wymaga uzasadnienia pominięcia zgody i niezależnego przeglądu przed zamknięciem.

D02 korzysta z prostszego procesu: szkic → wysłany → zamknięty → zarchiwizowany. Udany test odtworzenia wymaga opisania weryfikacji integralności danych i działania aplikacji.

Rejestr umożliwia wyszukiwanie, filtrowanie, sortowanie i stronicowanie. **Moje dokumenty** filtrują według wnioskodawcy. **Oczekujące zatwierdzenia** pokazują wpisy oczekujące na zgodę; dostępność decyzji sprawdza API. W szczegółach zasobu zakładka **Powiązane zmiany** pokazuje powiązane wpisy.

Konflikt 409 oznacza nieaktualną wersję: wczytaj wpis ponownie przed zapisem lub decyzją. Biblioteka szablonów jest obecnie tylko do odczytu. Moduł nie certyfikuje zgodności z normami ani prawem. Pełny zakres i ograniczenia: [opis techniczny](../it-operations.md).

Licencja typu **Wieczysta** ma nieaktywną datę wygaśnięcia. Po wybraniu licencji terminowej data ponownie staje się wymagana.
