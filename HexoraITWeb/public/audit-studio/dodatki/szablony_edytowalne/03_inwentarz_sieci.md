# Inwentarz sieci i zasobów

> Punkt startowy CMDB, diagramów oraz analizy zależności

**Cel:** Rozpoznanie infrastruktury z odróżnieniem faktu od przypuszczenia. Właściciele oraz nieznane urządzenia powinny być jawnie zaznaczone.

**Status:** WZÓR. Przed użyciem dostosuj do firmy, prawa i zatwierdzonego zakresu audytu.

**Wersja / data:** 1.0 / 2026-11-04

---

## Kontekst sieci

### Lokalizacje, WAN, ISP, łącza zapasowe
*Wskazówka:* Opisz miejsca i zależności zewnętrzne.

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


### VLAN / podsieci / strefy / VPN / Wi-Fi / OT
*Wskazówka:* Wpisz lokalne i zdalne segmenty, strefę zarządzania.

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


### Dokument / lokalizacja diagramu AS-IS
*Wskazówka:* Wskaż ścieżkę pliku i datę potwierdzenia.

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


## Przykładowy spis zasobów - uzupełniaj w osobnej tabeli CSV

### Zasób 1: ID / model / rola / IP / właściciel / wersja
*Wskazówka:* Status utrzymania, krytyczność i stan potwierdzenia.

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


### Zasób 2: ID / model / rola / IP / właściciel / wersja

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


### Zasób 3: ID / model / rola / IP / właściciel / wersja

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


### Zasób 4: ID / model / rola / IP / właściciel / wersja

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


### Zasób 5: ID / model / rola / IP / właściciel / wersja

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


## Luki w inwentaryzacji

### Nieznani właściciele, NAT, EOL, VM, SaaS, IoT
*Wskazówka:* Dla każdej luki zapisz właściciela działania i termin.

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


### Źródła danych / data weryfikacji / metoda
*Wskazówka:* CMDB, DHCP, firewall, switch, EDR, hypervisor itp.

[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]


---

## Instrukcja użytkowania
1. Nadaj dokumentowi identyfikator, wersję, datę i klasyfikację poufności.
2. Każdy wniosek wymagający potwierdzenia połącz z ID dowodu z rejestru.
3. Rozdziel stan potwierdzony, przypuszczenie, brak dowodu i brak zastosowania.
4. Uzgodnij fakty z właścicielem i zapisz istotne kontrdowody.
5. Zweryfikuj szczególne przepisy i oficjalne formularze branżowe.
6. Zapewnij zatwierdzenie, wersjonowanie i ochronę danych w repozytorium firmy.

## Źródła metodyki i prawa

- Ustawa o KSC z nowelizacją Dz.U. 2026 poz. 252: https://eli.gov.pl/eli/DU/2026/252/ogl
- ISO 19011:2026: https://www.iso.org/standard/19011
- NIST SP 800-115: https://csrc.nist.gov/pubs/sp/800/115/final
- NIST CSF 2.0: https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20
- CERT Polska, zgłaszanie incydentów: https://wiedza.cert.pl/obsluga-incydentow/zgloszenie/zgloszenie-incydentu/

*Materiał autorski oparty na metodologii audytu; nie jest cytatem z licencjonowanego standardu.*
