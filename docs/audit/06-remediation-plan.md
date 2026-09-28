# Plan naprawczy bezpieczeństwa

> Plan został zrealizowany w zakresie opisanym w `08-final-security-report.md`. Tabela pozostaje jako ślad powiązania ustaleń audytu z pracami naprawczymi, a nie lista bieżących zadań.

| Kolejność | ID | Działanie | Kryterium ukończenia |
|---|---|---|---|
| P0.1 | SEC-001 | usunięcie sekretów i walidacja konfiguracji | brak sekretów w śledzonych plikach; startup fail-fast; instrukcja rotacji |
| P0.2 | SEC-002 | bezpieczne provisionowanie administratora | hasło nigdy nie trafia do logu; test loggera |
| P0.3 | SEC-003 | security stamp i unieważnianie JWT | stary token odrzucony po blokadzie, zmianie hasła/roli/reset |
| P1.1 | SEC-004, 015 | hardening uwierzytelniania | 429 przy nadużyciu; jednolity błąd; testy negatywne |
| P1.2 | SEC-006, 010 | bezpieczne pliki i podgląd | walidacja MIME/sygnatur/nazw, bezpieczne response headers, brak raw HTML |
| P1.3 | SEC-005, 016 | zależności i supply chain | brak znanych high lub jawna, czasowa akceptacja z kompensacją |
| P1.4 | SEC-007, 009 | Problem Details i nagłówki | spójne 4xx/5xx, korelacja, CSP/nosniff/frame/referrer/HSTS |
| P1.5 | SEC-008 | audyt | logowanie wymaganych zdarzeń bez tokenów/sekretów; test redakcji |
| P2.1 | SEC-011, 014 | walidacja, limity, paginacja | kontrakty i testy graniczne bez regresji UI |
| P2.2 | SEC-012, 013 | kryptografia i deployment | plan migracji license keys, chroniony key-ring, osobny migrator DB |
| P2.3 | wszystkie | pełne testy hosta HTTP/PostgreSQL | WebApplicationFactory + scenariusze ról i własny/cudzy zasób |

Naprawy będą wdrażane małymi partiami. Każda partia otrzyma test regresyjny i aktualizację statusu w tym raporcie. Zmiany wymagające rotacji klucza JWT, ochrony key-ring, zewnętrznego skanera malware, MFA lub uprawnień DB wymagają także czynności operatora i nie mogą być uznane za zakończone samą zmianą kodu.
