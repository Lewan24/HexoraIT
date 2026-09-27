# Macierz OWASP Top 10:2025

| Kategoria | Stan | Dowód / ograniczenie |
|---|---|---|
| A01 Broken Access Control | Zaimplementowane i testowane częściowo | testy Minimal API, cross-tenant i zasobowe; wymagany PostgreSQL |
| A02 Security Misconfiguration | Zaimplementowane częściowo | headers, proxy allowlist, brak sekretów produkcyjnych; pozostają klucze DP i deployment |
| A03 Supply Chain Failures | Częściowo | `npm audit` PASS; NU1903 w zależności testowej SQLite |
| A04 Cryptographic Failures | Częściowo | PBKDF2 i szyfrowany vault; key-ring wymaga ochrony at-rest |
| A05 Injection | Zaimplementowane | EF Core, walidacja wejścia, brak raw HTML w preview |
| A06 Insecure Design | Częściowo | model organizacji i kompensacja storage; wymagany pełny przegląd produkcyjny |
| A07 Authentication Failures | Zaimplementowane i testowane | SecurityStamp, rate limiting, limity haseł; MFA niezaimplementowane |
| A08 Software/Data Integrity | Częściowo | walidacja uploadów i kontrakty; brak pełnego pipeline SBOM |
| A09 Logging/Alerting | Zaimplementowane częściowo | strukturalny audyt; sink, retencja i alerty wymagają infrastruktury |
| A10 Exceptional Conditions | Zaimplementowane częściowo | Problem Details i kompensacje; potrzebny odbiór awarii produkcyjnych |
