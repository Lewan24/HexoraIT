# Operacyjny kontrakt audytu bezpieczeństwa

Stan na 2026-09-27. Aplikacja emituje zdarzenia strukturalne przez kategorię
`HexoraIT.SecurityAudit`. Kod aplikacji zapewnia spójny schemat i punkt integracji, ale odporność
na manipulację wymaga zewnętrznego systemu logów poza hostem i kontem runtime aplikacji.

## Schemat zdarzeń

Każdy wpis ma znacznik czasu nadany przez provider logowania, `EventId`, `EventType`, `TraceId`
i — gdy jest dostępny — adres źródłowy. Zależnie od typu zawiera wyłącznie techniczne
identyfikatory użytkownika, organizacji lub zasobu.

| EventId | Nazwa | Przykładowe `EventType` | Poziom |
|---:|---|---|---|
| 1001 | `AuthenticationSucceeded` | `authentication_succeeded` | Information |
| 1101 | `AccountChanged` | `account_registered`, `password_changed`, `user_blocked`, `system_role_changed` | Information |
| 1201 | `SensitiveResourceAccessed` | `password_revealed` | Warning |
| 1901 | `RequestRejected` | `request_rejected` z kodem 401, 403 lub 429 | Warning |

Nie wolno dodawać do tych zdarzeń tokenów, haseł, odsłoniętych sekretów, treści dokumentów,
body, query stringów, nazw zasobów ani adresów e-mail. `Path` nie zawiera query stringu.

## Wymagania produkcyjne dla sinka

- Eksportować wyłącznie kategorię `HexoraIT.SecurityAudit` do centralnego magazynu poza hostem API.
- Konto runtime API może dopisywać zdarzenia, ale nie może ich zmieniać ani usuwać.
- Szyfrować transport i dane w magazynie; dostęp do odczytu ograniczyć do operatorów bezpieczeństwa.
- Retencja: co najmniej 180 dni online i 365 dni archiwalnie, o ile polityka organizacji lub prawo
  nie wymagają dłuższego okresu.
- Zsynchronizować czas hostów i zachować `TraceId`, `EventId`, poziom oraz wszystkie pola
  strukturalne bez spłaszczania do samego tekstu.
- Ustawić kontrolę kompletności eksportu, kolejkę/bufor oraz alarm na utratę połączenia z sinkiem.
- Lokalny stdout kontenera jest tylko transportem; sam nie spełnia wymogu trwałości ani
  odporności na manipulację.

Dobór providera zależy od infrastruktury właściciela (np. SIEM, append-only object storage lub
zarządzana usługa logów). Repozytorium celowo nie narzuca dostawcy ani danych dostępowych.

## Minimalne alerty

- seria odpowiedzi 401 dla jednego adresu lub wielu kont;
- dowolna odpowiedź 429 z rosnącą częstotliwością;
- seria 403 dla jednego użytkownika lub zasobu;
- blokada, reset hasła albo zmiana roli administratora;
- odsłonięcia wielu haseł w krótkim oknie lub nietypowa liczba organizacji/zasobów;
- brak zdarzeń/heartbeat eksportera albo opóźnienie ingestii przekraczające próg operacyjny.

Progi należy ustalić na podstawie ruchu produkcyjnego. Alert powinien zawierać identyfikatory i
`TraceId`, ale nie może dołączać danych wrażliwych z żądania.

## Odbiór wdrożenia

1. W kontrolowanym środowisku wykonać poprawne logowanie, błędne logowanie, wymusić 429,
   zmienić rolę testowego konta i odsłonić testowy wpis sejfu.
2. Potwierdzić obecność wszystkich czterech `EventId` w centralnym magazynie i korelację po
   `TraceId`.
3. Potwierdzić, że operator aplikacji nie może zmodyfikować ani usunąć odebranych wpisów.
4. Uruchomić reguły alertów i udokumentować czas od zdarzenia do powiadomienia.
5. Przeszukać próbkę eksportu pod kątem tokenów, haseł, body, query stringów i treści zasobów.

Do czasu wykonania tych kroków SEC-008 pozostaje częściowo naprawione, mimo że punkt integracji
i format zdarzeń są gotowe w aplikacji.
