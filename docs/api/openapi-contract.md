# Kontrakt OpenAPI

Źródłem kontraktu jest dokument generowany przez testowy host API:

```text
GET /swagger/v1/swagger.json
```

Dokument jest dostępny wyłącznie w środowiskach `Development` i `Testing`. Produkcja nie publikuje Swaggera. Wersjonowany artefakt znajduje się w [`openapi/v1.json`](openapi/v1.json). Testy `OpenApiContractTests` sprawdzają format, wersję i operacje `/api/*`.

## Zasada wersjonowania

Wersja dokumentu `v1` (metadane OpenAPI: `1.0`) zachowuje istniejące ścieżki i kształty DTO. Zmiany kompatybilne wstecznie są dopisywane do `v1`; usunięcie pola, zmiana typu, znaczenia statusu albo ścieżki wymaga nowej wersji kontraktu i testu migracyjnego frontendu.

Kontrakt jest zamrożony jako `v1`. Po zmianie API należy uruchomić `tools/export-openapi-from-tests.ps1`, dołączyć zmianę JSON do review i zweryfikować wpływ na frontend. Workflow CI ponownie generuje dokument i zatrzymuje build, jeżeli artefakt różni się od kodu. `tools/export-openapi.ps1` pozostaje wariantem dla już uruchomionego hosta.
