# Instrukcja użytkownika

Pełna instrukcja krok po kroku znajduje się w pliku [`instrukcja-obslugi.md`](../../instrukcja-obslugi.md) i jest również dostępna po zalogowaniu w widoku **Pomoc**. Kopia używana przez frontend znajduje się w `HexoraITWeb/src/content/` i musi być synchronizowana z dokumentem źródłowym.

## Najważniejsze zasady

- Po zalogowaniu wybierz organizację. Widoczne moduły i akcje zależą od członkostwa oraz przyznanych uprawnień.
- Brak przycisku jest tylko wskazówką UX; API zawsze ponownie sprawdza dostęp. Odpowiedź 403 zwykle oznacza brak prawa do modułu lub konkretnego zasobu.
- Nowe hasło musi mieć co najmniej 15 znaków. Po zmianie hasła pozostałe tokeny użytkownika zostają unieważnione.
- Ujawnienie sekretu z sejfu jest audytowane. Nie kopiuj haseł do notatek, opisów ani nazw zasobów.
- Pliki dodawaj wyłącznie w formatach i limitach wskazanych przez formularz. Nie każdy typ może być bezpiecznie wyświetlony w przeglądarce; pozostałe pliki są pobierane jako załączniki.
- Konto klienta rozpoczyna od widoku zgłoszeń. Dostęp do dokumentacji musi zostać jawnie nadany przez opiekuna organizacji.

Problemy z logowaniem, brak organizacji lub potrzebę resetu hasła zgłoś administratorowi instalacji. Problem z dostępem do pojedynczego modułu lub zasobu zgłoś właścicielowi/administratorowi organizacji.
