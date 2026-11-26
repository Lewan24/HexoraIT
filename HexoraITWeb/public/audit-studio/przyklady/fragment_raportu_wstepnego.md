# Przykładowy fragment raportu audytu wstępnego (fikcyjny)

**Projekt:** AUD-DEMO-001  
**Firma:** Przedsiębiorstwo Przykładowe Sp. z o.o. (fikcja)  
**Tryb:** rozpoznanie bezinwazyjne, przegląd dokumentacji i wywiady  
**Stan dowodów:** próbka, nie obejmuje wszystkich lokalizacji

## 1. Zakres

Przeanalizowano informacje o 2 przełącznikach zarządzalnych, 1 urządzeniu brzegowym, 2 punktach Wi-Fi, 1 hypervisorze i 7 maszynach wirtualnych. Nie przeprowadzono testu penetracyjnego, skanowania sieci, analizy kodu ani testu OT. Zebrano kopie konfiguracji pozbawione haseł.

## 2. Co potwierdzono

W środowisku występują wydzielone sieci biurowa i gościnna. Poczta i kopie zapasowe są obsługiwane przez dwóch dostawców zewnętrznych. Odbiór alertów EDR ma formalnie przypisanego administratora. Stan izolacji VLAN oceniono na podstawie konfiguracji; nie potwierdzono testem przepływu.

## 3. Największe ryzyka

| ID | Ustalenie | Stan dowodu | Priorytet |
|---|---|---|---|
| P-01 | Brak udokumentowanego przeglądu nieznanych reguł NAT | Wstępny dowód z konfiguracji i wywiadu | Wysoki - do potwierdzenia |
| P-02 | Nieudokumentowane przywracanie krytycznej VM | Raport kopii + brak protokołu restore | Wysoki - do potwierdzenia |
| P-03 | Niepełna inwentaryzacja kont technicznych | Rozbieżności IAM/CMDB | Średni - do potwierdzenia |

## 4. Luki informacyjne

Nie dostarczono umów z dostawcami chmury, aktualnego diagramu sieci i listy osób z uprawnieniami administracyjnymi do hypervisora. Brak dostarczenia nie przesądza, że dokumenty nie istnieją. W audycie właściwym zaplanowano uzyskanie tych materiałów.

## 5. Decyzja o pogłębieniu

Rekomendowany zakres: formalna kwalifikacja KSC/NIS2, szczegółowy przegląd IAM, polityk firewall, backupu, zarządzania ryzykiem i zdolności reakcji na incydenty. Aktywne testy tylko po zatwierdzeniu osobnych RoE.

**Uwaga:** niniejszy dokument nie jest opinią o spełnieniu wymogów KSC, RODO ani ISO/IEC 27001.
