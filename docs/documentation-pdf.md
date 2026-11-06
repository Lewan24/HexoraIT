# Eksport dokumentacji do PDF

## Układ dokumentu

Krótkie wpisy (np. konta dostępowe, licencje, kontakty i urządzenia) są prezentowane
w kartach w dwóch kolumnach. Każda karta ma własny tytuł, numer, etykiety pól
i wyróżnione wartości. Hasła i klucze licencji mają dodatkowe tło;
pojawiają się wyłącznie po zatwierdzeniu eksportu sekretów.

Dłuższe wpisy zajmują pełną szerokość strony. Artykuły i notatki przepływają
między stronami, a krótkie karty pozostają w całości na jednej stronie.
O wyborze układu decyduje długość i struktura wpisu. Długie wartości bez spacji
są zawijane bez obcinania danych i bez dodawania myślników.
Sekcje mają krótkie wprowadzenia w języku raportu. Zachowane są spis treści,
numeracja stron, osadzone czcionki i dotychczasowe zasady doboru danych.

Przykładowy PDF można wygenerować podczas testu `CardLayoutRenders` przez
ustawienie zmiennej `HEXORA_DOCUMENTATION_CARD_SAMPLE` na docelową ścieżkę pliku.

## Wybór zakresu eksportu

W aktywnej organizacji właściciel lub administrator może wybrać
**Dokumentacja PDF** w menu albo na ekranie **Dostosuj organizację**.
Uprawnienia są sprawdzane przez API przy pobieraniu opcji, wybieraniu wpisów
i generowaniu dokumentu. Administrator systemu bez odpowiedniej roli
w danej organizacji nie ma dostępu do eksportu.

1. Zaznacz sekcje dokumentacji. Możesz pozostawić wszystkie wpisy sekcji
   albo wybrać konkretne rekordy przez **Wybierz wpisy**. Wyszukiwanie obejmuje
   wszystkie wpisy danej sekcji, a wyniki są stronicowane.
2. Ustaw tytuł, odbiorcę i język dokumentu: polski lub angielski.
3. Wybierz dodatkowe pola: treść artykułów, opis organizacji, notatki,
   finanse oraz jawne hasła i klucze licencji.
4. Przejdź do **Sprawdź zakres**, zatwierdź wybór i użyj **Generuj PDF**.

Domyślnie wyłączone są hasła, zadania, projekty, plany, incydenty, grupy
i prywatne notatki. Dodatkowe notatki przy rekordach, finanse oraz jawne
hasła i klucze również są wyłączone. Ukryte moduły nie są automatycznie
zaznaczane, ale można świadomie uwzględnić ich istniejące dane.

Sekcja **Moje prywatne notatki** może zawierać wyłącznie notatki autora
raportu. Notatki innych użytkowników nie są udostępniane nawet właścicielowi.
Raport z danymi logowania wymaga jawnego potwierdzenia zakresu; API odrzuca
żądanie bez potwierdzenia eksportu sekretów. Nie eksportuje wewnętrznych
ścieżek magazynu plików, zaszyfrowanych pól ani danych obcych organizacji.

PDF zawiera stronę tytułową, dane odbiorcy i autora, datę wygenerowania UTC,
spis treści z numerami stron, zakładki PDF, numerowane sekcje i wpisy,
nagłówki oraz stopki z numeracją stron. Osadzone czcionki obsługują polskie
znaki także w kontenerze Linux. Treść artykułów i notatek obsługuje podstawowe
nagłówki Markdown, pogrubienia, listy i bloki kodu. Zewnętrzne obrazy,
skrypty i strony nie są pobierane. Diagram jest przedstawiony jako wykaz
wybranych urządzeń i połączeń pomiędzy nimi.

Pliki i załączniki są ujęte jako wykaz z metadanymi — PDF nie zawiera
zawartości ZIP, plików binarnych ani kopii załączonych dokumentów.
Dane są pobierane ponownie podczas generowania. Jeśli wybrany wpis został
usunięty lub przeniesiony, raport nie powstaje z po cichu zmienionym zakresem;
trzeba odświeżyć wybór.

Limit pojedynczego dokumentu wynosi 5000 wpisów i 2 miliony znaków danych.
Przekroczenie limitu zwraca błąd zamiast obciętego raportu. Można wtedy
wygenerować kilka dokumentów dla wybranych sekcji. API dopuszcza cztery
próby generowania na użytkownika na minutę i najwyżej dwa równoczesne
renderowania w jednym procesie. Raport nie jest zapisywany na serwerze,
a odpowiedź pobrania ma nagłówek `Cache-Control: no-store`.

Generowanie działa w trybie HTTP z uruchomionym API. Tryb demonstracyjny
obsługuje wybór i przegląd zakresu; tworzenie rzeczywistego PDF wymaga API.

Użyta biblioteka to PDFsharp/MigraDoc 6.2.4, przypięta do tej wersji;
czcionki oraz ich licencje są dołączone do aplikacji. Nie wymaga instalacji
Chromium ani systemowych czcionek na serwerze.
