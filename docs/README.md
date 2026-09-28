# Dokumentacja HexoraIT

HexoraIT jest samoobsługową aplikacją do dokumentowania infrastruktury IT, sieci, zasobów, incydentów, plików, haseł i uprawnień organizacyjnych. Dokumentacja opisuje stan aplikacji po migracji backendu do Minimal API i zakończeniu głównej refaktoryzacji.

## Dokumentacja bieżąca

- [Przegląd architektury](architecture/overview.md), [backend](architecture/backend.md), [frontend](architecture/frontend.md), [przepływ danych](architecture/data-flow.md) i [baza danych](architecture/database.md).
- [API](api/overview.md), [kontrakt OpenAPI](api/openapi-contract.md) i [paginacja](audit/08-pagination-contract.md).
- [Architektura bezpieczeństwa](security/security-architecture.md), [uwierzytelnianie](security/authentication.md), [autoryzacja](security/authorization.md) oraz [macierz OWASP](security/owasp-compliance-matrix.md).
- [Wdrożenie](deployment/deployment-guide.md), [konfiguracja](deployment/configuration.md) i [przewodnik deweloperski](development/developer-guide.md).
- [Strategia testów](testing/test-strategy.md), [wyniki regresji](testing/regression-results.md) i [testy bezpieczeństwa](testing/security-test-results.md).
- [Instrukcja użytkownika](user-guide/README.md) i [instrukcja administratora](admin-guide/README.md).

## Audyt

Katalog [`audit/`](audit/) zawiera historyczny stan sprzed refaktoryzacji, model zagrożeń, plan naprawczy i [raport końcowy](audit/08-final-security-report.md). Dokumenty `01`–`06` są materiałem audytowym i nie powinny być używane jako opis bieżącej architektury.

Stan dokumentacji: 2026-09-27. Otwarte wymagania infrastrukturalne i warunki przed produkcją znajdują się w raporcie końcowym.
