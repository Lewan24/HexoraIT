# Eksport i import danych organizacji

Funkcja znajduje się w **Ustawienia → Eksport i import danych** bieżącej organizacji.
Wymaga działającego API; tryb demonstracyjny nie generuje i nie importuje archiwów.

## Wybrany model importu

Import trafia do wybranej **pustej organizacji**. W razie odtwarzania kopii należy
najpierw utworzyć nową organizację i przełączyć się na nią. Nie ma operacji
automatycznego kasowania, nadpisywania ani scalania istniejącej dokumentacji.
Nazwa, konfiguracja organizacji, jej członkowie i uprawnienia pozostają bez zmian.
Nawet pojedynczy istniejący wpis, plik, folder lub element diagramu blokuje import.
Prywatne notatki, ustawienia i audyt nie są wspólną dokumentacją i nie blokują importu.

Takie rozwiązanie pozwala sprawdzić odtworzoną dokumentację przed ewentualnym
zarchiwizowaniem starej organizacji i nie wymaga ryzykownego wyczyszczenia źródła.

## Zawartość ZIP-a

- `data.json`: format `hexorait-organization`, wersja `1`, informacyjna nazwa
  organizacji źródłowej, data UTC, kolekcje wpisów i opisy załączników.
- `files/{typ}-{identyfikator}.bin`: pliki eksploratora oraz załączniki umów
  i gwarancji; ich oryginalne nazwy są zapisane w JSON.
- Wpisy: zasoby, sieci i IP, hasła sejfu, licencje, kontakty, umowy, baza wiedzy,
  projekty, zadania, plany, incydenty, grupy, gwarancje, foldery, pliki i diagram.

Przed eksportem można wybrać sekcje, konkretne pliki eksploratora oraz dołączenie
załączników umów i gwarancji. Wymagane powiązane wpisy dołączane są automatycznie,
np. projekt zadania, zasób planu lub folder nadrzędny pliku.
Można wybrać również ukryte moduły. Archiwum nie przenosi kont, haseł kont aplikacji,
ról, reguł dostępu, tokenów, audytu, prywatnych notatek ani ustawień osobistych.
Nie zawiera wewnętrznych ścieżek magazynu ani zaszyfrowanych pól zależnych od kluczy
instancji. Powiązania z kontami twórców zadań są usuwane; opisowe nazwy opiekunów
i przypisanych osób pozostają zwykłymi danymi dokumentacji.

**Każdy nowy ZIP jest szyfrowany standardem WinZip AES-256**, łącznie z `data.json`
i wszystkimi załącznikami. Osobne hasło archiwum musi mieć od 16 do 1024 znaków;
interfejs wymaga jego powtórzenia. Zalecane są długie losowe frazy. Standard AES ZIP
ma ustalone parametry wyprowadzania klucza, więc siła hasła jest istotna przy próbach
offline. Hasła archiwum nie da się odzyskać; należy zachować je oddzielnie.
Odtworzenie na innej instancji wymaga tylko ZIP-a i jego hasła, bez kluczy serwera.
Czytniki zewnętrzne muszą obsługiwać AES ZIP, np. 7-Zip lub WinZip. Podstawowy
czytnik systemowy może go nie obsługiwać. Nazwy technicznych wpisów i ich rozmiary
pozostają widoczne w katalogu ZIP. Treść JSON, oryginalne nazwy plików i dane są
zaszyfrowane. Starsze nieszyfrowane kopie nadal można importować z pustym hasłem archiwum.
Hasło konta potwierdzające operację jest odrębne od hasła szyfrującego. Żadne z nich
nie jest zapisywane w manifeście. Podczas importu hasła sejfu są ponownie szyfrowane
kluczami instancji docelowej.

## Uprawnienia i potwierdzenia

Domyślnie eksport i import są dostępne wyłącznie dla właściciela i administratora
organizacji. Administrator systemowy bez właściwego członkostwa nie ma wyjątku.
Klient nie może wykonywać tych operacji.

W roli własnej dostępna jest reguła modułowa **Eksport i import danych**
(`data-transfer`). Odczyt pozwala na pełny eksport, a zapis dodatkowo na import.
To uprawnienie do całej wspólnej dokumentacji, także do modułów niewidocznych
dla tej roli w codziennej pracy. Reguły pojedynczych wpisów nie mają tu zastosowania.
Istniejące role własne, które nie zawierają tej reguły, nie uzyskują jej automatycznie.

Każdy eksport i wykonanie importu ZIP wymagają bieżącego hasła konta.
Jest to ponowne uwierzytelnienie jednym składnikiem, **nie pełne MFA**.
Nie dodano pozornego drugiego składnika ani nie pominięto weryfikacji po stronie API.

Import jest dwuetapowy: sprawdzenie ZIP-a i podgląd liczby wpisów oraz plików,
a następnie dialog ostrzegający przed konfliktem danych, wpisanie dokładnej nazwy
organizacji docelowej, zatwierdzenie i podanie hasła. Chroniony token przeglądu
wiąże sumę SHA-256 ZIP-a z użytkownikiem, znacznikiem bezpieczeństwa konta,
organizacją i terminem ważności 10 minut. Podmiana pliku, zmiana konta, celu
lub hasła konta unieważnia potwierdzenie. Import ponownie sprawdza uprawnienia
i stan docelowej organizacji przed zatwierdzeniem transakcji.

## Walidacja i odporność na błędy

- Limity: ZIP 64 GiB, dane po rozpakowaniu 64 GiB, pojedynczy plik 8 GiB,
  JSON 16 MiB, 50 000 wpisów i 5000 załączników. Przekroczenie odrzuca całą operację;
  dane nie są po cichu obcinane. Eksplorator plików również przyjmuje pliki do 8 GiB.
- Kontrola katalogu ZIP przed utworzeniem obiektów wpisów, ograniczenia rzeczywiście
  odczytanych bajtów, blokada nieznanych ścieżek, duplikatów i dowiązań symbolicznych.
  Nie ma wypakowywania na ścieżki dostarczone przez użytkownika. ZIP64 umożliwia
  pliki i archiwa powyżej 4 GiB. Archiwa wieloczęściowe nie są obsługiwane.
- Jawna lista pól i typów, wersja formatu, kontrola typów, długości, enumów,
  wymaganych wartości, finansów, duplikatów JSON i identyfikatorów.
- Kontrola kompletności plików, ich rozmiarów, SHA-256 i sygnatur. Typ MIME
  ustala walidator treści, a nie niezaufana deklaracja w archiwum.
- Kontrola powiązań, obcych/brakujących identyfikatorów oraz cykli folderów.
  Wszystkie importowane identyfikatory są generowane na nowo, a relacje przeliczane.
- Eksport jest spójnym odczytem transakcyjnym, a wynik jest sprawdzany tym samym
  walidatorem co import. Brakujący lub niespójny załącznik blokuje pobranie całej kopii.
- Import najpierw sprawdza dane i przygotowuje nowe pliki, następnie zapisuje dane
  w pojedynczej transakcji. Błąd wycofuje rekordy i usuwa nowe pliki; istniejące
  pliki nie są zastępowane. Awaria procesu w trakcie przygotowania plików może
  pozostawić niepowiązane pliki wymagające okresowego sprzątania magazynu.
- PostgreSQL: krótki etap zapisu używa izolacji `SERIALIZABLE` oraz rzeczywistych
  blokad tabel dokumentacji, chroniących również przed zwykłymi równoczesnymi
  zapisami API. Blokady obejmują tabele, więc podczas tego etapu zapisy do tych
  tabel w innych organizacjach również mogą krótko czekać. Walidacja i IO plików
  odbywają się wcześniej. Limit oczekiwania na blokadę wynosi 10 sekund.
- Maksymalnie dwa przetwarzane archiwa/pobrania na proces i 12 żądań na minutę
  na użytkownika. Pobrania zachowują swój limit zasobów do zamknięcia strumienia.
- Przeglądarka pobiera plik natywnie, bez `response.blob()`. Jednorazowy losowy
  token pobrania wygasa po 10 minutach od przygotowania kopii. API ponownie sprawdza
  konto, znacznik bezpieczeństwa i uprawnienia przy jego odebraniu. Token nie zawiera
  haseł. Wygasłe pliki są usuwane; przerwane pobranie wymaga nowego eksportu.
- Pliki są przetwarzane w ograniczonych buforach, ale duże importy wymagają miejsca
  na dysku: na bufor multipart, ZIP, sprawdzane pliki i nowy magazyn. Podgląd i import
  przesyłają archiwum osobno i sprawdzają jego sumę. Należy uwzględnić czas transferu
  i pojemność katalogu tymczasowego. Przy wielu procesach API natywne pobranie
  wymaga sticky routingu do procesu, który przygotował kopię.
- Odpowiedzi nie są buforowane (`no-store`), a audyt odnotowuje eksport, import
  i błędne potwierdzenia hasła bez haseł ani treści dokumentacji.

## API i testy

Ścieżka bazowa: `/api/organizations/{organizationId}/data-transfer`:
`GET /capabilities`, `GET /options`, `POST /export` (szyfrowany ZIP),
`POST /export-download` (token natywnego pobrania), `POST /preview` (multipart `file`, `archivePassword`),
`POST /import` (multipart: `file`, `password`, `reviewToken`,
`confirmOrganizationName`, `confirmImport`, `archivePassword`). Wszystkie wymagają uwierzytelnienia.
Eksport przyjmuje `archivePassword`, opcjonalne `sections`, `fileIds` i `includeAttachments`.
`GET /api/data-transfer/download?ticket=...` autoryzuje pobranie jednorazowym tokenem,
co umożliwia pobieranie przez przeglądarkę bez nagłówka Bearer i buforowania w JS.
Wyłączenie antiforgery dla multipart jest zgodne z używanym uwierzytelnianiem Bearer;
nie jest to endpoint oparty na automatycznie wysyłanych ciasteczkach sesji.

Testy obejmują pełny round trip, różne klucze szyfrowania instancji, role,
HTTP/multipart, audyt, hasła i potwierdzenia, podmianę ZIP-a, wygaśnięcie przeglądu,
złe powiązania, traversal, duplikaty, uszkodzone pliki, bomby ZIP i wycofanie
rekordów/pliku po awarii magazynu lub bazy. Testy frontendu sprawdzają wymagane
potwierdzenia, czyszczenie hasła i unieważnienie podglądu po zmianie pliku.

`dotnet test HexoraITApi/HexoraIT.Tests` uruchamia testy domyślne.
Test PostgreSQL wymaga zmiennej `HEXORA_ARCHIVE_TEST_POSTGRES` z administracyjnym
połączeniem testowym oraz filtra `FullyQualifiedName~PostgreSqlArchiveTests`.
Sam tworzy i usuwa osobną bazę `hexora_archive_test_<losowy identyfikator>`;
nie testuje na bazie aplikacji. Sprawdza dwa równoczesne importy oraz konflikt
importu ze zwykłym zapisem danych. `npm test --prefix HexoraITWeb` sprawdza frontend.

Rzeczywisty test pełnego odtworzenia pliku **4 GiB + 1 KiB** przez AES-256/ZIP64
uruchamia się przez `HEXORA_ARCHIVE_LARGE_TEST=1` i filtr
`FullyQualifiedName~LargeArchiveTests`. Test generuje dane strumieniowo, sprawdza
całą odtworzoną zawartość i wielkość buforów. Wymaga kilkunastu GiB wolnego miejsca
tymczasowego; nie uruchamia się automatycznie w zwykłym zestawie testów.

Szyfrowanie ZIP obsługuje SharpZipLib 1.4.2 (MIT); nie jest to własna implementacja
algorytmu szyfrowania. Testy sprawdzają także brak dostępu do JSON bez hasła,
błędne hasło, uszkodzony szyfrogram, częściowy eksport i jednorazowe pobrania.

Zasady limitowania rozpakowania opisuje [dokumentacja .NET](https://learn.microsoft.com/en-us/dotnet/standard/io/zip-tar-best-practices),
a semantykę blokad [dokumentacja PostgreSQL](https://www.postgresql.org/docs/current/sql-lock.html).
