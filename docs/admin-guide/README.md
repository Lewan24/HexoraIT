# Instrukcja administratora

Ten dokument obejmuje administrację aplikacją i środowiskiem. Szczegółowe zmienne znajdują się w [konfiguracji](../deployment/configuration.md), a procedura uruchomienia w [instrukcji wdrożenia](../deployment/deployment-guide.md).

## Konta systemowe

- `Admin` zarządza kontami całej instalacji. Aplikacja nie pozwala zablokować ani zdegradować ostatniego aktywnego administratora.
- `User` pracuje w organizacjach zgodnie z członkostwem i rolą organizacyjną.
- `Client` jest przypisany do jednej organizacji, zgłasza problemy i widzi wyłącznie jawnie udostępnione moduły lub zasoby.

Nowe i resetowane hasła muszą mieć od 15 do 200 znaków. Blokada konta, zmiana roli i reset hasła obracają `SecurityStamp`, dzięki czemu wydane wcześniej tokeny JWT przestają działać.

## Organizacje, role i klienci

Właściciel lub administrator organizacji może tworzyć role niestandardowe, przypisywać prawa modułowe i reguły pojedynczych zasobów. Reguła zasobowa ma pierwszeństwo przed regułą modułu; backend egzekwuje ją niezależnie od widoczności przycisku w UI.

Konto klienta utworzysz w **Ustawienia → Role organizacji → Utwórz konto klienta**. Adres e-mail musi być nowy; istniejącego konta pracownika nie można przekonwertować. Klient początkowo nie ma dostępu do dokumentacji. Dostęp nadaje się w sekcji **Klienci → Uprawnienia klienta**.

Przy roli organizacyjnej można wybrać **Kopiuj do organizacji**. Kopiowane są tylko domyślne reguły modułów. Lokalne reguły pojedynczych zasobów, identyfikator roli i przypisani użytkownicy pozostają bez zmian. Operacja wymaga uprawnień administratora lub właściciela we wszystkich organizacjach docelowych.

## Bootstrap i sekrety

Pierwszego administratora można utworzyć przez `AppSettings__HexoraITAdmin` oraz jednorazowe `AppSettings__InitialAdminPassword`. Po pierwszym poprawnym starcie usuń hasło z konfiguracji i zmień je po zalogowaniu. Nigdy nie zapisuj w repozytorium haseł DB, klucza JWT ani hasła bootstrap.

Po ujawnieniu sekretu obróć go, nie tylko usuń z pliku. Zmiana klucza JWT unieważnia wszystkie tokeny. Zachowaj bezpieczną kopię key-ringu Data Protection — jego utrata uniemożliwi odszyfrowanie wpisów sejfu.

## Backup i odtwarzanie

Backup musi obejmować jednocześnie:

1. PostgreSQL;
2. wolumen `/app/storage` z plikami;
3. wolumen `/app/data-protection-keys` z kluczami szyfrującymi.

Regularnie wykonuj próbne odtworzenie w izolowanym środowisku. Odtwarzaj elementy z tego samego punktu w czasie; niespójna baza i storage mogą pozostawić brakujące lub osierocone pliki.

## Aktualizacja

1. Wykonaj i zweryfikuj backup trzech powyższych elementów.
2. Przetestuj nową wersję i migracje na kopii bazy.
3. Wdróż razem kompatybilne obrazy API i frontendu.
4. Sprawdź logowanie, zmianę organizacji, autoryzację dwóch różnych ról, upload/download oraz odczyt sejfu.
5. Sprawdź logi `HexoraIT.SecurityAudit` i błędy migracji.

Aktualnie API wykonuje migracje EF Core podczas startu. Oznacza to, że konto runtime potrzebuje praw do schematu; docelowo zalecany jest oddzielny krok migracyjny i konto aplikacyjne least privilege.

## Reagowanie na incydent

- Zabezpiecz logi techniczne i audytowe wraz z `TraceId`.
- Zablokuj przejęte konta, zresetuj hasła i obróć klucz JWT, jeśli zakres incydentu obejmuje sesje.
- Obróć poświadczenia DB i inne sekrety, jeżeli mogły zostać odczytane.
- Sprawdź członkostwa, role, reguły klientów i próby dostępu cross-tenant.
- Zweryfikuj integralność bazy, storage i ostatnich backupów przed przywróceniem ruchu.

## Funkcje wymagające infrastruktury

Kod nie zapewnia obecnie MFA, kontroli haseł przejętych, produkcyjnego skanera malware ani własnego trwałego SIEM. Kategorię `HexoraIT.SecurityAudit` trzeba podłączyć do zewnętrznego append-only sinka zgodnie z [kontraktem audytu](../security/security-audit-operations.md).
