# Baza danych

## Operacje i zmiany IT (2026-11-23)

Tabele `OperationTemplates`, `OperationRecords`, `OperationRevisions`, `OperationActivities`, `OperationTemplateSettings`, `OperationPolicies` i `OperationPolicyRevisions` są opisane w [architekturze modułu](../it-operations.md). Wersje szablonów oraz historia wpisów i administracji są dopisywane, a PostgreSQL chroni je triggerami przed UPDATE/DELETE. Wartości formularzy są w JSONB, a rejestr korzysta z kolumn relacyjnych i indeksu pełnotekstowego. Trzy nowe migracje zachowują wcześniejsze definicje i dane; poprzednie migracje nie zostały zmienione. Kopia całej bazy obejmuje moduł; obecny eksport organizacji do ZIP go nie obejmuje.

Główną bazą jest PostgreSQL zarządzany przez EF Core. Model obejmuje użytkowników, organizacje, członkostwa, role, reguły zasobowe, zasoby infrastruktury, projekty, zadania, sieci, dokumenty, pliki, notatki i wpisy sejfu.

Izolacja danych jest realizowana przez kontekst bieżącego użytkownika, członkostwo organizacyjne, reguły modułów oraz jawne sprawdzenia dla encji bez wspólnej klasy bazowej.

Zmiany schematu zapisuje się jako migracje w `HexoraITApi/HexoraIT.Api/Migrations`. Przed produkcją migracje powinny być wykonywane kontrolowanym krokiem wdrożenia przez konto o uprawnieniach schema-owner.
