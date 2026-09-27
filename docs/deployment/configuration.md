# Konfiguracja

## Wymagane ustawienia

| Obszar | Klucz / zmienna | Uwagi |
|---|---|---|
| PostgreSQL | `ConnectionStrings__Default` / `HEXORAIT_DB_PASSWORD` | Connection string musi wskazywać istniejącą bazę; Compose składa go z hasła. |
| JWT | `Jwt__Issuer`, `Jwt__Audience`, `Jwt__SigningKey` | Klucz ma mieć co najmniej 32 bajty losowego materiału. Zmiana unieważnia tokeny. |
| CORS | `AppSettings__AllowOrigins__0...n` | Dokładne originy frontendu, bez ścieżki i wildcardów. Lista nie może być pusta. |
| Pliki | `FileStorage__RootPath` | Prywatny, trwały katalog poza statycznym rootem serwera WWW. |
| Szyfrowanie | `FileStorage__DataProtectionKeysPath` | Trwały, chroniony i backupowany key-ring. |
| Tryb frontendu | `HEXORAIT_APP_MODE` | `http` (domyślnie) albo `mock`. `mock` jest wyłącznie publicznym demo opartym na `localStorage`. |
| Frontend/API | `HEXORAIT_API_BASE_URL` | Pełny URL HTTP(S) albo ścieżka od `/`, zwykle `/api` przy wspólnym originie. Wymagany tylko w trybie `http`. |

## Ustawienia opcjonalne

- `AppSettings__AllowRegister` — publiczna rejestracja; w produkcji zwykle `false`.
- `AppSettings__HexoraITAdmin` i `AppSettings__InitialAdminPassword` — jednorazowy bootstrap pierwszego administratora; hasło min. 15 znaków trzeba usunąć po utworzeniu konta.
- `ReverseProxy__KnownProxies__0...n` — dokładne adresy zaufanych proxy. Przy bezpośrednim dostępie lista pozostaje pusta.

Środowisko `Production` nie publikuje Swaggera. `appsettings.Development.json` jest lokalną konfiguracją deweloperską i nie może trafić do obrazu, paczki ani środowiska współdzielonego. Sekrety dostarczaj przez secret store lub zmienne procesu, nie przez śledzone pliki.
