# Model zagrożeń STRIDE

## Zasoby i aktorzy

Najcenniejsze zasoby: poświadczenia sejfu, topologia i adresacja sieci, pliki i umowy, klucze licencji, incydenty, dane kontaktowe, role/uprawnienia, tokeny JWT, baza PostgreSQL i key-ring Data Protection. Aktorzy: niezalogowany napastnik, klient o ograniczonym dostępie, pracownik, administrator organizacji, administrator systemu, złośliwy upload oraz przejęta zależność/build.

## Granice i scenariusze

| STRIDE | Scenariusz | Istniejąca ochrona | Luka / priorytet |
|---|---|---|---|
| Spoofing | brute force lub kradzież JWT z przeglądarki | PBKDF2, walidacja podpisu/lifetime | brak limitu, MFA i revocation; P1 |
| Tampering | modyfikacja cudzego zasobu/roli | filtry EF, checks per resource, testy negatywne | złożone mapowanie i brak pełnych HTTP tests; P1/P2 |
| Repudiation | admin zmienia rolę lub ujawnia hasło bez śladu | logi techniczne frameworka | brak audytu i korelacji; P1 |
| Information disclosure | cross-tenant IDOR, pobranie pliku, stack trace, wyciek sekretu | deny-by-default i filtry | sekrety repo, błędy, token localStorage; P0/P1 |
| Denial of service | wielkie JSON/kolekcje, XLSX ReDoS, login flood | limity multipart | brak limitów JSON/paginacji/rate limit; P1 |
| Elevation of privilege | stary admin JWT po degradacji/blokadzie | polityka claim `sys_role` | claim pozostaje ważny 8 h; P0/P1 |

## Najważniejsze ścieżki ataku

1. Ujawniony klucz JWT → podrobienie tokena administracyjnego → pełny dostęp do użytkowników i danych.
2. Przejęty token administratora → blokada/reset/zmiana roli nie kończy sesji → utrzymanie dostępu do wygaśnięcia.
3. Złośliwy XLSX/upload → parser w przeglądarce, ReDoS/prototype pollution lub DOM XSS → przejęcie tokena i danych organizacji.
4. Konto klienta/pracownika manipuluje ID zasobu → filtr EF i uprawnienia powinny zablokować; regresja w mapowaniu kontrolera może jednak fail-open dla nowego modułu.
5. Awaria storage po zmianie DB lub odwrotnie → osierocone/utracone pliki bez audytu.
6. Kompromitacja wolumenu storage + key-ring → odszyfrowanie całego sejfu haseł.

## Założony poziom ASVS

Level 2 jest minimum, ponieważ system przetwarza poufną dokumentację przedsiębiorstwa i poświadczenia. Dla sejfu haseł, kont administratorów, kryptografii i audytu należy stosować wybrane wymagania L3 lub równoważne kontrole infrastrukturalne. Nie deklaruje się zgodności — macierz powstanie po implementacji i weryfikacji.

