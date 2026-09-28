# Kontrakt OpenAPI

Aktualna wersja dokumentu OpenAPI to **2.0.0**, dostępna jako `openapi/v2.json`. Poprzedni kontrakt `openapi/v1.json` pozostaje niezmienionym artefaktem historycznym.

Źródłem kontraktu jest dokument generowany przez testowy host API:

```text
GET /swagger/v2/swagger.json
```

Dokument jest dostępny wyłącznie w środowiskach `Development` i `Testing`. Produkcja nie publikuje Swaggera. Bieżący artefakt znajduje się w [`openapi/v2.json`](openapi/v2.json). Testy `OpenApiContractTests` sprawdzają format, wersję i operacje `/api/*`.

## Zasada wersjonowania

Kontrakt `v2` (metadane OpenAPI: `2.0.0`) zmienia odpowiedź rejestracji z uwierzytelnionego `200` na `202` bez sesji, ponieważ konto wymaga potwierdzenia e-mail. Ta zmiana statusu i kształtu odpowiedzi wymagała nowej wersji głównej. Kolejne zmiany kompatybilne mogą być dopisywane do v2; usunięcie pola, zmiana typu, znaczenia statusu albo ścieżki wymaga następnej wersji głównej i testu migracyjnego frontendu.

Kontrakt jest zamrożony jako `v2`. Po zmianie API należy uruchomić `tools/export-openapi-from-tests.ps1`, dołączyć zmianę JSON do review i zweryfikować wpływ na frontend. Workflow CI ponownie generuje dokument i zatrzymuje build, jeżeli artefakt różni się od kodu. `tools/export-openapi.ps1` pozostaje wariantem dla już uruchomionego hosta.
