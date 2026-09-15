# HexoraIT — instrukcja obsługi

Przewodnik dla nowych użytkowników, administratorów systemu i opiekunów organizacji.

Instrukcja opisuje stan projektu z 15 września 2026 r. Powstała na podstawie kodu interfejsu, zasad dostępu po stronie serwera i zrzutów ekranów w repozytorium. Nie jest protokołem testów działającego wdrożenia. Nazwy przycisków podano dla polskiej wersji językowej; ilustracje przedstawiają wcześniejszy interfejs angielski.

## Spis treści

1. [Użytkownik — codzienna praca](#1-użytkownik--codzienna-praca)
2. [Administrator systemu — zarządzanie kontami](#2-administrator-systemu--zarządzanie-kontami)
3. [Opiekun organizacji — organizacje, osoby i uprawnienia](#3-opiekun-organizacji--organizacje-osoby-i-uprawnienia)
4. [Najczęstsze pytania](#4-najczęstsze-pytania)

## 1. Użytkownik — codzienna praca

### Do czego służy system?

HexoraIT gromadzi dokumentację infrastruktury IT: urządzenia, sieci, hasła, pliki, instrukcje oraz informacje o bieżących pracach. Dane są podzielone na **organizacje**, czyli osobne przestrzenie np. dla firm, klientów lub oddziałów.

To, co widzisz i możesz zmieniać, zależy od uprawnień w wybranej organizacji. Ta sama osoba może mieć różne role w różnych organizacjach.

### Pierwsze logowanie i orientacja na ekranie

1. Otwórz adres HexoraIT przekazany przez administratora.
2. Zaloguj się adresem e-mail i hasłem do swojego konta.
3. Sprawdź nazwę aktualnej organizacji w lewym panelu. Kliknij ją, aby wybrać inną dostępną organizację.
4. Wybierz zakładkę z menu po lewej stronie. Na małym ekranie rozwiń menu przyciskiem w nagłówku.
5. Skorzystaj z wyszukiwarki w górnym pasku, aby znaleźć dostępne dane; wpisz co najmniej dwa znaki.

W **Ustawienia → Wygląd** zmienisz język i motyw. W **Ustawienia → Profil** możesz zmienić swoją nazwę, a w **Ustawienia → Bezpieczeństwo** — hasło, podając obecne i nowe hasło. Nowe hasło musi mieć co najmniej 8 znaków. Przycisk wylogowania znajduje się przy danych użytkownika i w górnym pasku.

### Jakie zakładki są dostępne?

| Zakładka | Do czego służy |
| --- | --- |
| Pulpit | Przegląd danych organizacji i konfigurowalne widżety. |
| Zasoby | Ewidencja komputerów, serwerów, drukarek i pozostałych urządzeń. |
| Sieci | Dokumentacja sieci, podsieci i adresów IP. |
| Licencje | Informacje o licencjach oprogramowania i ich terminach. |
| Pliki | Przechowywanie i przeglądanie plików organizacji. |
| Hasła | Wpisy z danymi dostępowymi do urządzeń i usług. |
| Zadania | Lista prac do wykonania, ich priorytety i postęp. |
| Plany | Planowane zmiany i rozwój infrastruktury. |
| Incydenty | Dokumentowanie awarii i problemów. |
| Umowy | Informacje o umowach i związanych z nimi dokumentach. |
| Gwarancja | Ewidencja gwarancji sprzętu. |
| Grupy | Dokumentowanie grup infrastruktury, np. grup AD; role dostępu do HexoraIT ustawia się osobno. |
| Diagram | Graficzny schemat infrastruktury i połączeń urządzeń. |
| Baza wiedzy | Wspólne procedury, instrukcje i artykuły. |
| Prywatne notatki | Własne notatki użytkownika w kontekście organizacji. |
| Kontakty | Dane osób i firm związanych z infrastrukturą. |
| Ustawienia | Profil, wygląd, bezpieczeństwo oraz funkcje organizacji dostępne dla Twojej roli. |

Nie wszystkie pozycje muszą być widoczne na Twoim koncie. Brak przycisku dodawania albo nieaktywny przycisk edycji może oznaczać dostęp tylko do odczytu.

### Przykład 1: znajdź i dodaj urządzenie

**Cel:** zarejestrowanie nowego laptopa. Dodawanie wymaga prawa zapisu do modułu **Zasoby**.

1. Wybierz właściwą organizację i otwórz **Zasoby**.
2. Sprawdź w wyszukiwarce, czy laptop jest już na liście. Możesz szukać po nazwie, IP, lokalizacji lub właścicielu; dostępne są też filtry typu i statusu.
3. Kliknij **Dodaj zasób**.
4. Wypełnij formularz, np.:
   - nazwa zasobu: `LAP-BIURO-015`;
   - typ: stacja robocza;
   - status: wybierz wartość odpowiadającą stanowi urządzenia;
   - lokalizacja: `Biuro Warszawa`;
   - właściciel: `Anna Kowalska`;
   - opcjonalnie: adres IP, numer seryjny, tagi i notatki.
5. Kliknij **Utwórz zasób**. Nazwa, lokalizacja i właściciel są wymagane.
6. Odszukaj wpis i otwórz jego szczegóły, klikając nazwę lub ikonę oka. Ikona ołówka służy do edycji.

Pole „Właściciel” w formularzu urządzenia opisuje osobę odpowiedzialną za sprzęt. Nie nadaje uprawnień w systemie.

**Efekt:** urządzenie pojawi się w ewidencji organizacji. Osoba mająca tylko odczyt może wyszukać i obejrzeć wpis, ale nie utworzy ani nie zmieni urządzenia.

### Przykład 2: przeczytaj i utwórz instrukcję w bazie wiedzy

**Cel:** zapisanie procedury zgłaszania problemów z drukarką. Tworzenie wymaga prawa zapisu do modułu **Baza wiedzy**.

1. Otwórz **Baza wiedzy**. Użyj wyszukiwarki lub filtra kategorii i wybierz artykuł, aby przeczytać jego treść.
2. Aby dodać własny artykuł, kliknij **Nowy artykuł**.
3. Wpisz tytuł `Problemy z drukarką — pierwsze kroki` i kategorię `Wsparcie`. Oba pola są wymagane.
4. Wpisz treść, np.:

   ```markdown
   # Problemy z drukarką

   - Sprawdź, czy drukarka jest włączona.
   - Sprawdź komunikat na wyświetlaczu.
   - Zapisz nazwę drukarki i treść błędu.
   - Przekaż te informacje osobie obsługującej zgłoszenie.
   ```

5. Opcjonalnie dodaj tagi oddzielone przecinkami, np. `drukarka, wsparcie`.
6. Kliknij **Utwórz artykuł**. Późniejsze poprawki zapisuj przez edycję artykułu i **Zapisz zmiany**.

**Efekt:** instrukcja będzie dostępna osobom mającym uprawnienia do tego artykułu. Edytor obsługuje m.in. nagłówki, listy i pogrubienia w składni Markdown, jak w przykładzie powyżej.

### Osobna ścieżka dla klienta

Konto **Klient** jest przypisane do jednej organizacji. Po zalogowaniu otwiera **Zgłoś problem** i ma dostęp do osobistych ustawień konta. Dodatkowe moduły dokumentacji pojawią się po udostępnieniu ich przez opiekuna.

Aby zgłosić problem:

1. Otwórz **Zgłoś problem**.
2. Wpisz tytuł, np. `Brak wydruku w księgowości`.
3. Opisz problem, urządzenie i okoliczności wystąpienia.
4. Wybierz priorytet i kliknij **Wyślij zgłoszenie**.
5. Poczekaj na komunikat potwierdzający wysłanie.

Zgłoszenie trafia do **Zadań** organizacji jako nowe zadanie do wykonania, początkowo bez przypisanej osoby. Klient nie zarządza zadaniami; opiekun może udostępnić mu ich odczyt. Formularz zgłoszenia jest dostępny także bez dostępu do modułu Zadania.

## 2. Administrator systemu — zarządzanie kontami

### Dwa rodzaje administratora

| Rola | Zakres |
| --- | --- |
| Administrator systemu (`Admin` na koncie) | Panel administratora: tworzenie kont, blokowanie, reset haseł i zmiana roli systemowej. |
| Administrator organizacji (`Admin` w organizacji) | Zarządzanie konkretną organizacją, jej zwykłymi członkami, rolami i klientami. |
| Właściciel organizacji (`Owner`) | Pełne zarządzanie organizacją, w tym jej administratorami oraz usuwaniem i przywracaniem organizacji. |

Rola administratora systemu sama nie przyznaje członkostwa ani dostępu do dokumentacji wszystkich organizacji. Uprawnienia organizacji ustawia się oddzielnie.

### Utworzenie konta pracownika

1. Otwórz **Panel administratora** w bocznym menu.
2. Kliknij **Dodaj użytkownika**.
3. Wpisz nazwę wyświetlaną, adres e-mail i hasło o długości co najmniej 8 znaków.
4. Wybierz rolę systemową **Użytkownik**. Wybierz **Administrator** tylko dla osoby, która ma zarządzać kontami całej aplikacji.
5. Kliknij **Utwórz**.
6. Przekaż dane logowania pracownikowi bezpiecznym kanałem. Po pierwszym logowaniu powinien ustawić własne hasło.
7. Opiekun organizacji dodaje istniejące konto do odpowiedniej organizacji według instrukcji w części 3.

Konta klientów tworzy się w **Ustawienia → Role organizacji**, aby od razu przypisać je do właściwej organizacji.

### Zmiana roli systemowej

Na liście użytkowników wybierz **Użytkownik** lub **Administrator** w polu roli przy wskazanej osobie. Zmiana jest zapisywana od razu. Nie możesz zmienić w ten sposób swojej własnej roli ani przekształcić konta klienta w zwykłe konto.

### Reset hasła

1. Znajdź użytkownika i kliknij ikonę klucza **Zresetuj hasło**.
2. Wpisz nowe hasło, minimum 8 znaków.
3. Kliknij **Ustaw hasło** i przekaż nowe hasło użytkownikowi.

Przy następnym logowaniu użytkownik używa nowego hasła. Jest to ustawienie hasła przez administratora, a nie wysłanie wiadomości z linkiem resetującym.

### Blokowanie i odblokowanie

Przy użytkowniku kliknij **Zablokuj**. Konto otrzyma oznaczenie blokady. Aby przywrócić możliwość korzystania z konta, kliknij **Odblokuj**. Nie możesz zablokować własnego konta.

Blokada dotyczy konta w całym systemie. Jeżeli chodzi tylko o odebranie dostępu do jednej organizacji, usuń członkostwo w tej organizacji. Panel administratora nie udostępnia przycisku usuwania konta.

## 3. Opiekun organizacji — organizacje, osoby i uprawnienia

### Utworzenie i wybór organizacji

1. Kliknij nazwę organizacji w lewym panelu i wybierz **Nowa organizacja**. Alternatywnie otwórz **Ustawienia → Organizacje → Dodaj**.
2. Podaj nazwę, np. `Firma Alfa`, opcjonalny opis i kolor.
3. Kliknij **Utwórz**. Twórca zostaje właścicielem organizacji.
4. Przed dodawaniem danych lub ustawianiem ról sprawdź, czy pracujesz w odpowiedniej organizacji.

Zwykłe konto może tworzyć organizacje; konto klienta nie ma tej możliwości. Firma obsługiwana przez Twój zespół może mieć własną organizację, a jej przedstawiciel osobne konto klienta w tej organizacji.

### Dodanie osoby do organizacji

Wymagana rola: **Właściciel** lub **Administrator organizacji**.

1. Upewnij się, że osoba ma już konto w HexoraIT. Jeśli nie ma, administrator systemu tworzy je wcześniej.
2. Wybierz organizację i otwórz **Ustawienia → Role organizacji**.
3. Przejdź do sekcji **Dodaj istniejącego użytkownika**.
4. Wpisz dokładny adres e-mail konta.
5. Wybierz rolę wbudowaną lub wcześniej utworzoną rolę własną.
6. Kliknij **Dodaj członka**.

Dodanie odbywa się bezpośrednio po adresie e-mail — system nie wysyła zaproszenia do rejestracji. Konto klienta nie może zostać dodane tą ścieżką do kolejnej organizacji.

### Jak wybrać rolę?

| Rola organizacji | Znaczenie |
| --- | --- |
| Tylko odczyt (`ReadOnly`) | Przeglądanie dokumentacji bez jej modyfikowania. |
| Członek (`Member`) | Odczyt i zapis danych modułów; bez zarządzania rolami i członkami. |
| Administrator (`Admin`) | Zarządzanie danymi, rolami, klientami i zwykłymi członkami organizacji. |
| Właściciel (`Owner`) | Dodatkowo zarządzanie administratorami i usuwanie/przywracanie organizacji. |
| Rola własna | Dostęp według wskazanych modułów i reguł pojedynczych elementów. |

Tylko właściciel może nadawać rolę administratora organizacji i zmieniać role jej administratorów. Roli właściciela nie zmienia się na liście ról członków.

### Utworzenie własnej roli i uprawnień

**Przykład:** rola `Technik` może zmieniać zasoby i czytać bazę wiedzy.

1. W **Ustawienia → Role organizacji** kliknij **Nowa rola**.
2. Podaj nazwę `Technik`.
3. Przy module **Zasoby** zaznacz **Odczyt** i **Zapis**.
4. Przy module **Baza wiedzy** zaznacz tylko **Odczyt**.
5. Pozostałe moduły zostaw wyłączone. Jeśli technik ma widzieć pulpit, zaznacz też odczyt modułu **Pulpit**.
6. Kliknij **Zapisz rolę**.
7. W sekcji **Role członków** wybierz `Technik` przy odpowiedniej osobie. Przypisanie zapisuje się od razu.

**Odczyt** pozwala oglądać dane. **Zapis** pozwala je modyfikować, w tym usuwać tam, gdzie moduł to umożliwia; zapis na poziomie modułu pozwala też tworzyć nowe wpisy. Zaznaczenie zapisu automatycznie włącza odczyt. Wyłączenie odczytu wyłącza zapis.

Rola własna określa dostęp osoby zamiast standardowych uprawnień roli wbudowanej. Nadanie zapisu modułu Ustawienia nie czyni z niej administratora organizacji.

### Wyjątki dla pojedynczych elementów

Reguła konkretnego elementu ma pierwszeństwo przed ustawieniami całego modułu. Może udostępnić pojedynczy wpis albo zablokować wybrany wpis z szerzej udostępnionego modułu.

**Przykład: udostępnienie tylko jednego artykułu.**

1. Otwórz edycję roli.
2. Wyłącz odczyt i zapis całego modułu **Baza wiedzy**.
3. W sekcji **Indywidualne uprawnienia zasobów** wybierz moduł bazy wiedzy i konkretny artykuł.
4. Kliknij **Dodaj regułę**, następnie zaznacz **Odczyt** przy dodanej regule. Samo dodanie reguły nie włącza odczytu.
5. Zapisz rolę.

Osoba zobaczy udostępniony artykuł, ale nie pozostałe artykuły. Usunięcie reguły przywraca dla tego elementu ustawienie całego modułu. Reguła sieci obejmuje również jej adresy IP. Dla pulpitu, diagramu i ustawień edytor udostępnia uprawnienia modułu, bez wyboru pojedynczych elementów.

Przyciski **Zezwól na wszystko** i **Zablokuj wszystko** zastępują aktualną konfigurację edytowanej roli, w tym usuwają jej indywidualne reguły. Przed zapisaniem sprawdź wynik.

### Zmiana i usuwanie ról

- Przy roli kliknij **Edytuj**, zmień uprawnienia i wybierz **Zapisz rolę**. Zmiana dotyczy wszystkich osób z tą rolą w tej organizacji.
- Aby zmienić rolę jednej osoby, użyj listy w sekcji **Role członków**.
- **Usuń** jest dostępne tylko dla roli nieprzypisanej do żadnego członka. Najpierw przypisz tym osobom inną rolę.

Nowe uprawnienia obowiązują przy kolejnych operacjach, a otwarte aplikacje automatycznie odświeżają dostęp.

### Kopiowanie ról między swoimi organizacjami

1. Wybierz organizację źródłową i otwórz **Ustawienia → Role organizacji**.
2. Przy zapisanej roli kliknij **Kopiuj do organizacji**.
3. Zaznacz organizacje docelowe. Możesz wybrać te, w których jesteś właścicielem lub administratorem.
4. Kliknij **Kopiuj**.
5. Jeśli w organizacji docelowej istnieje rola o tej samej nazwie, sprawdź listę konfliktów i wybierz **Potwierdź nadpisanie**, jeśli chcesz zastąpić jej uprawnienia modułów.
6. Przełącz się do organizacji docelowej i przypisz nową rolę odpowiednim osobom.

To **kopiowanie**: rola pozostaje w organizacji źródłowej. Kopiowane są tylko uprawnienia całych modułów. Indywidualne reguły elementów ze źródła nie przechodzą do innej organizacji.

Przy nadpisaniu istniejącej roli jej członkowie i lokalne reguły pojedynczych elementów pozostają zachowane. Zmiana uprawnień modułów obejmie więc osoby już przypisane do roli docelowej. Wielkość liter w nazwie roli nie rozróżnia konfliktów. Kolejne edycje roli źródłowej nie synchronizują automatycznie jej kopii.

### Utworzenie konta klienta

1. Wybierz organizację klienta.
2. Otwórz **Ustawienia → Role organizacji → Utwórz konto klienta**.
3. Podaj nowy adres e-mail, nazwę wyświetlaną i hasło mające co najmniej 8 znaków.
4. Kliknij **Utwórz konto klienta**.
5. Przekaż klientowi adres aplikacji i dane logowania.

Adres e-mail nie może już należeć do istniejącego konta. Formularz tworzy nowe konto klienta przypisane do tej jednej organizacji. Klient nie może tworzyć organizacji ani zarządzać ich członkami i rolami.

### Udostępnienie danych klientowi

1. W tej samej zakładce znajdź osobę w sekcji **Klienci**.
2. Kliknij **Uprawnienia klienta**.
3. Zaznacz odczyt/zapis wybranych modułów albo dodaj reguły pojedynczych elementów — tak jak przy roli własnej.
4. Kliknij **Zapisz rolę**. Tak podpisany przycisk zapisuje tutaj indywidualne uprawnienia wskazanego klienta.

Domyślnie klient nie ma dostępu do dokumentacji. Jego uprawnienia ustawia się indywidualnie, bez przypisywania zwykłej roli własnej. **Zgłoś problem** i osobiste ustawienia są dostępne niezależnie od tych uprawnień. Klient nie otrzyma pulpitu ani ustawień organizacji, a do zadań można nadać wyłącznie odczyt.

**Przykład:** aby klient czytał instrukcję drukowania, pozostaw odczyt całej bazy wiedzy wyłączony, dodaj indywidualną regułę dla tej instrukcji, włącz w niej odczyt i zapisz.

### Usuwanie osób i pozostałe operacje organizacji

- **Usunięcie członka:** otwórz **Ustawienia → Organizacje → Członkowie** przy danej organizacji i użyj ikony usunięcia przy osobie. Odbiera to członkostwo, bez kasowania konta systemowego. Administrator organizacji nie usuwa właściciela ani innych administratorów; właściciela nie można usunąć jako członka.
- **Edycja organizacji:** w **Ustawienia → Organizacje** użyj ikony edycji, zmień nazwę, opis lub kolor i zapisz.
- **Opuszczenie organizacji:** przy dostępnej opcji **Opuść** tracisz własny dostęp do czasu ponownego dodania. Właściciel nie może opuścić organizacji tą operacją.
- **Usunięcie organizacji:** właściciel może użyć ikony usunięcia i potwierdzić operację. Organizacja zostaje ukryta dla wszystkich.
- **Przywrócenie organizacji:** właściciel w sekcji **Usunięte organizacje** klika **Sprawdź**, a następnie **Przywróć** przy wybranej organizacji.

### Szybki scenariusz wdrożenia nowej firmy

1. Utwórz organizację `Firma Alfa`.
2. Administrator systemu tworzy konta pracowników obsługujących firmę, jeśli jeszcze nie istnieją.
3. Utwórz rolę `Technik` lub skopiuj ją z innej organizacji.
4. Dodaj pracowników po adresach e-mail i przypisz role.
5. Dodaj urządzenia i pierwsze instrukcje.
6. Utwórz konto klienta dla przedstawiciela firmy.
7. Udostępnij mu potrzebne dane i przekaż instrukcję korzystania z **Zgłoś problem**.

## 4. Najczęstsze pytania

| Sytuacja | Co sprawdzić lub zrobić |
| --- | --- |
| Nie widzę danych firmy | Sprawdź wybraną organizację i swoje członkostwo. |
| Nie widzę zakładki lub nie mogę zapisać zmian | Poproś opiekuna o sprawdzenie roli, odczytu/zapisu i indywidualnych reguł elementu. |
| Nie mogę dodać osoby po e-mailu | Konto musi już istnieć; sprawdź adres i czy osoba nie jest już członkiem. Klientów dodaje się osobnym formularzem. |
| Nie mogę usunąć roli | Przypisz inną rolę wszystkim korzystającym z niej osobom. |
| Skopiowana rola nie daje identycznego dostępu | Kopia obejmuje moduły. Sprawdź lokalne reguły elementów oraz przypisanie roli w organizacji docelowej. |
| Klient widzi tylko zgłaszanie problemów i ustawienia | To prawidłowy stan początkowy. Opiekun musi udostępnić dokumentację w Uprawnieniach klienta. |
| Nie pamiętam hasła | Skontaktuj się z administratorem systemu, który ustawi nowe hasło. |
| Funkcja jest oznaczona „Wkrótce” | Nie jest jeszcze dostępna. Dotyczy to m.in. 2FA, dziennika audytu i listy dozwolonych IP w ustawieniach bezpieczeństwa. |

Preferencje powiadomień nie są jeszcze trwale zapisywane. Kolor akcentu, gęstość widoku i opcja czcionki danych w ustawieniach wyglądu dotyczą bieżącej sesji. Eksport danych i wylogowanie ze wszystkich urządzeń w sekcji O aplikacji są obecnie niedostępne.
