# Organizacje stałe, zlecenia i archiwum

Po zalogowaniu użytkownik i administrator trafiają do **Panelu organizacji**.
Klienci zachowują swój dotychczasowy ekran zgłaszania problemów. Do panelu
można wrócić przez logo lub pozycję **Panel organizacji** w menu.

Panel pokazuje aktywne firmy, stałe organizacje, zlecenia tymczasowe oraz
archiwum. Karty można przeszukiwać; początkowo widać maksymalnie 12 organizacji,
a kolejne wyświetla przycisk **Pokaż więcej organizacji**.

Przy tworzeniu organizacji można wybrać:

- **Organizację stałą** — domyślnie wszystkie moduły są widoczne.
- **Zlecenie tymczasowe** — domyślnie widoczne są Zasoby, Hasła, Kontakty,
  Umowy, Baza wiedzy i Pliki oraz podstawowy pulpit i ustawienia.

Formularz od razu pozwala zmienić zestaw modułów. Typ i moduły są zapisywane
razem z organizacją, więc błąd tworzenia nie pozostawia częściowo ustawionej
firmy. Późniejsze zmiany modułów są dostępne przez **Dostosuj organizację**
w menu, na liście wyboru organizacji, przy karcie firmy oraz w ustawieniach.
Typ tymczasowy nie oznacza automatycznego usunięcia ani terminu ważności.

**Właściciel i administrator organizacji** mogą przenieść ją do archiwum
z karty w panelu, ustawień organizacji lub ekranu jej dostosowania.
Operacja wymaga potwierdzenia, ponieważ zmienia widoczność firmy dla wszystkich
członków. Dokumentacja, pliki, członkostwa i wybrane moduły pozostają zachowane.
Archiwum jest oddzielone od dotychczasowego kosza usuniętych organizacji.

W archiwum właściciel lub administrator może użyć **Przywróć do aktywnych**.
Firma wraca do bieżącego wyboru z dotychczasową dokumentacją i ustawieniami.
Pozostali członkowie widzą jej kartę w archiwum, ale nie mogą jej przywrócić.
Archiwizacja służy porządkowaniu widoczności, nie zastępuje uprawnień do danych.

Stan jest przechowywany w bazie danych i odświeżany w otwartych aplikacjach
co 30 sekund oraz po powrocie do okna. Zarchiwizowanie aktualnie otwartej
organizacji kieruje użytkownika do panelu organizacji.

Przy wdrożeniu należy uwzględnić migrację `AddOrganizationLifecycle`.
Istniejące organizacje pozostają domyślnie stałe i aktywne.
