# Klienci i kopiowanie ról

## Dodanie klienta

1. Wybierz organizację, w której masz rolę właściciela lub administratora.
2. Otwórz **Ustawienia → Role organizacji → Utwórz konto klienta**.
3. Podaj adres e-mail, nazwę i hasło (minimum 8 znaków). Przekaż dane logowania klientowi.
4. Konto otrzyma systemową rolę `Client` i członkostwo tylko w tej organizacji.

Adres e-mail musi być nowy. Formularz nie zmienia istniejących kont pracowników w klientów. Klient nie może tworzyć organizacji, dołączać do kolejnych, zarządzać członkami ani zmieniać swojej roli.

## Panel i uprawnienia klienta

Po zalogowaniu klient otwiera zakładkę **Zgłoś problem**. Ma również dostęp do ustawień Profil, Wygląd, Bezpieczeństwo, Powiadomienia i O aplikacji. Dashboard oraz ustawienia organizacji są niedostępne.

W sekcji **Klienci** opiekun wybiera **Uprawnienia klienta**. Ustawienia dotyczą wyłącznie wskazanego konta. Domyślnie klient nie ma dostępu do dokumentacji. Można udostępnić moduł lub pojedyncze zasoby i ustawić odczyt/zapis. Reguła pojedynczego zasobu ma pierwszeństwo przed regułą modułu. Uprawnienia są egzekwowane również w API i zapytaniach do bazy, a panel odświeża je automatycznie.

Zgłoszenie zawiera tytuł, opis i priorytet. Zapisuje się jako zadanie `todo`, bez przypisanej osoby, tagów i terminu. Autor i data są zapisywani przez serwer. Klient nie zarządza zadaniami; opcjonalne udostępnienie zakładki Tasks pozwala mu je czytać. Dla historycznych zadań bez zapisanego autora widnieje „Nieznany autor”.

## Kopiowanie ról

Przy zapisanej roli wybierz **Kopiuj do organizacji**, zaznacz organizacje i zatwierdź. W każdej organizacji docelowej wymagane są uprawnienia administratora lub właściciela.

Kopiowane są wyłącznie uprawnienia modułów. Jeśli rola o tej nazwie już istnieje (bez rozróżniania wielkości liter), pojawi się potwierdzenie. Nadpisanie zachowuje identyfikator roli, przypisanych użytkowników oraz lokalne reguły pojedynczych zasobów. Reguły zasobów z organizacji źródłowej nie są przenoszone. Operacja zapisuje wszystkie wybrane organizacje razem.

## Uruchomienie

Migracja `AddClientsAndTaskAuthors` dodaje tabelę indywidualnych uprawnień oraz pola autora zadania. Istniejący inicjalizator API wykonuje migracje przy starcie. Wdróż API i frontend razem. Ta zmiana nie uruchamia migracji na działającej bazie w trakcie pracy nad kodem.
