# Baza danych

Główną bazą jest PostgreSQL zarządzany przez EF Core. Model obejmuje użytkowników, organizacje, członkostwa, role, reguły zasobowe, zasoby infrastruktury, projekty, zadania, sieci, dokumenty, pliki, notatki i wpisy sejfu.

Izolacja danych jest realizowana przez kontekst bieżącego użytkownika, członkostwo organizacyjne, reguły modułów oraz jawne sprawdzenia dla encji bez wspólnej klasy bazowej.

Zmiany schematu zapisuje się jako migracje w `HexoraITApi/HexoraIT.Api/Migrations`. Przed produkcją migracje powinny być wykonywane kontrolowanym krokiem wdrożenia przez konto o uprawnieniach schema-owner.
