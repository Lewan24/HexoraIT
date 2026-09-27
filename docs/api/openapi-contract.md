# Kontrakt OpenAPI

Aktualnym źródłem kontraktu jest dokument generowany przez testowy host API:

```text
GET /swagger/v1/swagger.json
```

Dokument jest dostępny wyłącznie w środowisku `Testing`. Produkcja nie publikuje Swaggera. Test `OpenApiContractTests.TestingHost_ExposesOpenApiDocumentWithSecuredApiPaths` sprawdza, że dokument ma poprawny format OpenAPI i zawiera ścieżki `/api/*`.

## Zasada wersjonowania

Wersja dokumentu `v1` (metadane OpenAPI: `1.0`) zachowuje istniejące ścieżki i kształty DTO. Zmiany kompatybilne wstecznie są dopisywane do `v1`; usunięcie pola, zmiana typu, znaczenia statusu albo ścieżki wymaga nowej wersji kontraktu i testu migracyjnego frontendu.

Przed publikacją artefaktu zewnętrznego należy pobrać JSON z testowego hosta, zapisać go jako `docs/api/openapi/v1.json`, a następnie sprawdzić go w review razem z testami kontraktowymi. Służy do tego `tools/export-openapi.ps1`. Nie dodajemy ręcznie wygenerowanego pliku, dopóki specyfikacja nie zostanie zamrożona — obecnie nadal trwają prace nad multipart i pełnym kontraktem błędów.
