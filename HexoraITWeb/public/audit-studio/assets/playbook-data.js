/**
 * Praktyczne mikrochecklisty (3 kroki na zadanie), zakresy i sugerowane mapowania.
 * Edytuj teksty i listy ID. Mapowanie pomaga planować, nie potwierdza pełnej zgodności.
 */
window.AUDIT_GUIDE = {
  "version": "2.0",
  "steps": {
    "P01": [
      "Ustal pisemną podstawę zlecenia i właściciela zakresu",
      "Sprawdź czy osoby udzielające dostępu są uprawnione",
      "Zapisz datę zatwierdzenia, ograniczenia i osoby eskalacji"
    ],
    "P02": [
      "Zapisz jedno mierzalne pytanie audytowe",
      "Ustal adresata i oczekiwany typ wyniku",
      "Zaznacz czy to gap assessment, retest czy audyt ustawowy"
    ],
    "P03": [
      "Wypisz badane usługi, spółki i lokalizacje",
      "Dodaj sieci, domeny i systemy wyłączone z zakresu",
      "Potwierdź granice u właścicieli i datę obowiązywania"
    ],
    "P04": [
      "Wypisz dozwolone i zabronione techniki",
      "Zatwierdź okna testów, punkt stop i kontakt awaryjny",
      "Sprawdź zgodę właścicieli zasobów i dostawców"
    ],
    "P05": [
      "Odnotuj relacje audytorów z wdrożeniami",
      "Sprawdź kompetencje do zakresu i wymogi ustawowe",
      "Zaplanuj przegląd niezależny dla spornych ustaleń"
    ],
    "P06": [
      "Ustal miejsce składowania dowodów i uprawnienia",
      "Zdefiniuj retencję, anonimizację i sposób bezpiecznego transferu",
      "Wpisz zakaz sekretów i danych nadmiarowych w notatkach"
    ],
    "P07": [
      "Zapisz kryteria oceny i skalę ryzyka",
      "Zdefiniuj populacje i sposób wyboru próbek",
      "Ustal jak oznaczać brak dowodu i wyłączenia"
    ],
    "P08": [
      "Przeprowadź spotkanie otwierające z właścicielami",
      "Sprawdź dostępność osób i dokumentów",
      "Uzgodnij kanał pilnej eskalacji oraz harmonogram"
    ],
    "P11": [
      "Zapytaj o usługi najważniejsze dla przychodów i ciągłości",
      "Ustal tolerancję na przestój oraz skutki naruszenia",
      "Zatwierdź priorytety z biznesem"
    ],
    "P12": [
      "Wybierz najważniejsze usługi i ich właścicieli",
      "Wypisz serwery, sieci, dostawców i zależności",
      "Uzgodnij robocze RTO i RPO z procesami"
    ],
    "P13": [
      "Poproś o ostatnie raporty i plany naprawy",
      "Wybierz poprzednie ustalenia wysokiego ryzyka",
      "Zweryfikuj dowód skutecznego zamknięcia, nie tylko deklarację"
    ],
    "P14": [
      "Wypisz właścicieli sieci, chmury, poczty i backupu",
      "Zidentyfikuj administratorów zewnętrznych i okna dostępu",
      "Sprawdź kto może zatwierdzać ryzyko i zmiany"
    ],
    "P15": [
      "Zbierz dokumenty z datą i właścicielem",
      "Porównaj wersje dokumentów z bieżącą konfiguracją",
      "Oznacz luki: brak, stary dokument lub poza zakresem"
    ],
    "P16": [
      "Zweryfikuj sektor, rodzaj usług i wyjątki",
      "Zbierz dane o grupie, wielkości oraz decyzji prawnej",
      "Odnotuj podmiot kluczowy, ważny lub status nieustalony"
    ],
    "P17": [
      "Wypisz AD/IdP, hypervisor, SaaS, LAN, VPN i OT",
      "Wskaż systemy krytyczne i internet-facing",
      "Weryfikuj listę z min. dwoma właścicielami"
    ],
    "P18": [
      "Zidentyfikuj brak MFA, brak kopii lub EOL",
      "Wskaż dostępy z Internetu i konta nieznanego właściciela",
      "Zapisz hipotezy z poziomem pewności zamiast wyroku"
    ],
    "P21": [
      "Odczytaj podsieci, VLAN i trasy z konfiguracji",
      "Uzgodnij je z DHCP, DNS i dokumentacją",
      "Zapisz brakujące segmenty oraz źródła informacji"
    ],
    "P22": [
      "Zbierz urządzenia, model, firmware i właściciela",
      "Ustal czy jest backup konfiguracji i EOL",
      "Sprawdź adresy zarządcze i sposób uwierzytelniania"
    ],
    "P23": [
      "Zestaw hosty, VM, sieci wirtualne i datastore",
      "Oznacz krytyczne VM i zależność od hosta",
      "Sprawdź wskaźniki backupów oraz snapshoty"
    ],
    "P24": [
      "Porównaj CMDB, EDR, MDM i dane sieci",
      "Wybierz brakujące oraz zduplikowane urządzenia",
      "Ustal właściciela i proces wycofania sprzętu"
    ],
    "P25": [
      "Zapisz SSID, strefy, IoT i sieci gości",
      "Potwierdź izolację i metodę logowania",
      "Zidentyfikuj dostępy zarządcze oraz obce urządzenia"
    ],
    "P26": [
      "Uzyskaj listę domen i publicznych adresów",
      "Porównaj przekierowania NAT i aktualne usługi",
      "Potwierdź biznesowe uzasadnienie ekspozycji"
    ],
    "P27": [
      "Wybierz proces i prześledź przepływ danych",
      "Zidentyfikuj odbiorców, integracje i transfery",
      "Sprawdź własność, typ danych i szyfrowanie"
    ],
    "P28": [
      "Porównaj urządzenia z minimum dwóch spisów",
      "Wyjaśnij rozbieżności z administratorem",
      "Zapisz procent i ograniczenia pokrycia"
    ],
    "P31": [
      "Pobierz politykę MFA i listę wyjątków",
      "Sprawdź konta adminów, zdalny dostęp i pocztę",
      "Potwierdź działanie w próbce, bez przejmowania sesji"
    ],
    "P32": [
      "Zidentyfikuj EOL i krytyczne wersje",
      "Porównaj daty poprawek z polityką oraz wyjątkami",
      "Zapisz ekspozycję i właściciela podatności"
    ],
    "P33": [
      "Sprawdź pokrycie krytycznych systemów backupem",
      "Zbadaj izolację, retencję i alarmy o błędach",
      "Poproś o protokół ostatniego testu odtworzenia"
    ],
    "P34": [
      "Przejrzyj WAN/LAN, NAT i reguły administracyjne",
      "Sprawdź osobne strefy gości, IoT i serwerów",
      "Uzgodnij wyjątki oraz nieużywane reguły"
    ],
    "P35": [
      "Pobierz raport EDR/AV i zakres wdrożenia",
      "Zidentyfikuj urządzenia bez agenta oraz wyjątki",
      "Sprawdź alert testowy i odpowiedzialność za obsługę"
    ],
    "P36": [
      "Zobacz źródła logów i retencję",
      "Zweryfikuj synchronizację czasu i alertowanie",
      "Prześledź jeden alert do decyzji człowieka"
    ],
    "P37": [
      "Poproś o plan reagowania i kontakty awaryjne",
      "Sprawdź kanał niezależny od głównej poczty",
      "Prześledź ostatnie ćwiczenie lub incydent"
    ],
    "P38": [
      "Każda uwaga: źródło, właściciel, data",
      "Oddziel podejrzenie od stwierdzonego faktu",
      "Zapisz co trzeba potwierdzić w audycie pogłębionym"
    ],
    "P41": [
      "Narysuj strefy sieci i połączenia WAN",
      "Uwzględnij usługi krytyczne, chmurę i dostawców",
      "Oznacz luki i datę wersji diagramu"
    ],
    "P42": [
      "Oddziel działania pilne od ulepszeń długoterminowych",
      "Przypisz wpływ biznesowy i priorytet",
      "Zaproponuj właściciela i termin, bez wdrażania zmian samemu"
    ],
    "P43": [
      "Wypisz obszary niedostępne i nieprzetestowane",
      "Wskaż próbę, techniki i jakość dowodów",
      "Zastrzeż, jakie wnioski nie wynikają z badania"
    ],
    "P44": [
      "Zapisz cele, kryteria i planowany zakres",
      "Ustal próbki, narzędzia, okna i kompetencje",
      "Potwierdź budżet, zgodę i plan komunikacji"
    ],
    "P45": [
      "Zaprezentuj top 5 ryzyk i ograniczenia",
      "Uzyskaj stanowisko właścicieli",
      "Zapisz decyzje i termin audytu docelowego"
    ],
    "F01": [
      "Potwierdź aktualny tekst prawa na datę audytu",
      "Sprawdź sektor, wyjątki, status podmiotu i terminy",
      "Zapisz osobę odpowiedzialną za kwalifikację"
    ],
    "F02": [
      "Wymień obowiązki prawne osobno od zaleceń",
      "Przypisz każdemu kryterium podstawę i źródło",
      "Potwierdź czy kryterium jest umowne, prawne czy dobrowolne"
    ],
    "F03": [
      "Sprawdź czy organizacja podlega DORA/2690/CRA",
      "Wypisz wymagania sektorowe i właściwy organ",
      "Udokumentuj wyjątki oraz interpretację prawną"
    ],
    "F04": [
      "Uzyskaj aktualne SoA i zakres SZBI",
      "Sprawdź uzasadnienie wyłączeń kontroli",
      "Porównaj SoA z ryzykiem i rzeczywistą implementacją"
    ],
    "F05": [
      "Rozdziel projekt kontroli, wdrożenie i skuteczność",
      "Ustal próbę z okresu, nie tylko stan dzisiejszy",
      "Zapisz progi i sposób oceny dowodów"
    ],
    "F06": [
      "Zdefiniuj populację i okres próbkowania",
      "Dobierz próbę opartą na ryzyku i krytyczności",
      "Zapisz metodę wyboru i ograniczenia wniosków"
    ],
    "F07": [
      "Nadaj ID wymaganiom, zadaniom i dowodom",
      "Sprawdź spójność dat, właścicieli i wersji",
      "Oznacz źródła, których brakuje"
    ],
    "F08": [
      "Potwierdź pisemną zgodę na skan i testy",
      "Sprawdź ograniczenia przepustowości i okna",
      "Zatwierdź kontakt stop-test oraz plan przywracania"
    ],
    "F11": [
      "Sprawdź decyzje zarządu o SZBI i ryzyku",
      "Zweryfikuj budżet, role i szkolenia kierownictwa",
      "Prześledź reakcję na raportowane ryzyko"
    ],
    "F12": [
      "Sprawdź aktualne polityki i cele bezpieczeństwa",
      "Potwierdź właścicieli i przeglądy dokumentów",
      "Wybierz jeden cel i zweryfikuj pomiar wykonania"
    ],
    "F13": [
      "Zbadaj metodę szacowania ryzyka i aktualizacje",
      "Porównaj rejestr z realnymi usługami i zmianami",
      "Sprawdź zatwierdzone postępowanie z ryzykiem"
    ],
    "F14": [
      "Odczytaj rejestr wyjątków i daty ich wygaśnięcia",
      "Potwierdź akceptację przez właściwego właściciela",
      "Sprawdź kontrolę kompensującą i retest"
    ],
    "F15": [
      "Wybierz próbkę nowych i odchodzących osób",
      "Porównaj datę decyzji HR z nadaniem/odebraniem kont",
      "Sprawdź uprzywilejowane dostępy i przepustki"
    ],
    "F16": [
      "Sprawdź szkolenia pracowników i zarządu",
      "Zweryfikuj obecność i aktualizację programu",
      "Zbadaj śledzenie efektów i zgłoszenia podejrzanych wiadomości"
    ],
    "F17": [
      "Sprawdź plan i kompetencje audytu wewnętrznego",
      "Porównaj wcześniejsze niezgodności z działaniami",
      "Zweryfikuj niezależny retest zamkniętych problemów"
    ],
    "F18": [
      "Przejrzyj rejestr obowiązków i zmian w prawie",
      "Zweryfikuj terminy przeglądów oraz odpowiedzialnych",
      "Sprawdź otwarte obowiązki na datę badania"
    ],
    "F21": [
      "Wybierz próbę założenia, zmiany i usunięcia konta",
      "Porównaj wnioski z logami systemów",
      "Sprawdź konta nieaktywne i bez właściciela"
    ],
    "F22": [
      "Zweryfikuj listę administratorów i kont awaryjnych",
      "Sprawdź zasadę najmniejszych uprawnień",
      "Potwierdź monitoring działań admina i przeglądy"
    ],
    "F23": [
      "Porównaj politykę MFA z rzeczywistymi wyjątkami",
      "Sprawdź pocztę, VPN, IAM i role uprzywilejowane",
      "Przeanalizuj konto break-glass i kontrolę jego użycia"
    ],
    "F24": [
      "Zweryfikuj właściciela kont serwisowych",
      "Sprawdź rotację sekretów i magazyn bezpieczny",
      "Oceń logowanie i ograniczenia uprawnień"
    ],
    "F25": [
      "Poproś o ostatni przegląd dostępów",
      "Wybierz odrzucone i zatwierdzone uprawnienia",
      "Sprawdź czy cofnięcia zostały zastosowane"
    ],
    "F26": [
      "Zbadaj dostęp do serwerowni i szaf",
      "Wybierz próbkę wejść oraz przegląd uprawnień",
      "Ustal działanie alarmów, CCTV i procedury gości"
    ],
    "F31": [
      "Uzgodnij strefy zaufania z diagramem AS-IS",
      "Zidentyfikuj ścieżki admin, IoT, gości i chmurę",
      "Potwierdź połączenia między strefami"
    ],
    "F32": [
      "Wybierz reguły WAN, VPN i stref krytycznych",
      "Zweryfikuj właściciela oraz zasadność każdej próbki",
      "Sprawdź logowanie, termin przeglądu i reguły bez użycia"
    ],
    "F33": [
      "Oceń zarządzanie adminem, AAA i MFA",
      "Sprawdź firmware, EOL i kopie konfiguracji",
      "Potwierdź odseparowanie sieci zarządzającej"
    ],
    "F34": [
      "Wybierz próbki serwerów i endpointów",
      "Porównaj je z polityką hardeningu",
      "Zapisz wyjątki, wersje i ustawienia EDR"
    ],
    "F35": [
      "Sprawdź uprawnienia hypervisora i storage",
      "Zweryfikuj segmentację port-group i backup",
      "Przejrzyj aktualizacje, audyt logów i migawki"
    ],
    "F36": [
      "Sprawdź SPF, DKIM, DMARC i adminów poczty",
      "Zweryfikuj zabezpieczenie paneli oraz certyfikatów",
      "Przejrzyj konfigurację i ryzyko starych protokołów"
    ],
    "F37": [
      "Ustal CSP/SaaS i model odpowiedzialności",
      "Zbadaj logowanie, MFA, klucze i udostępnianie",
      "Sprawdź backup, retencję i konfiguracje wysokiego ryzyka"
    ],
    "F38": [
      "Zbadaj VPN/ZTNA, MFA i listę użytkowników",
      "Sprawdź split tunneling oraz urządzenia niezarządzane",
      "Zweryfikuj logi i procedurę odebrania dostępu"
    ],
    "F39": [
      "Zweryfikuj upoważnienie na testy i zakres hostów",
      "Porównaj podatności z ekspozycją i aktywami",
      "Sprawdź obsługę wyjątków i retest poprawek"
    ],
    "F310": [
      "Zobacz harmonogram kopii urządzeń sieciowych",
      "Sprawdź bezpieczne przechowywanie konfiguracji",
      "Potwierdź próbę odtworzenia na zasobie testowym"
    ],
    "F41": [
      "Porównaj źródła logów z listą systemów krytycznych",
      "Sprawdź retencję i integralność danych",
      "Zidentyfikuj nieobjęte telemetrią zasoby"
    ],
    "F42": [
      "Zbadaj zasady triage, SLA i eskalacje",
      "Wybierz alert i sprawdź oś czasu działań",
      "Potwierdź zamknięcie i wnioski analityka"
    ],
    "F43": [
      "Oddziel kwalifikację incydentów KSC, RODO i DORA",
      "Sprawdź role, zegar, kontakt CSIRT/organów",
      "Przećwicz proces na fikcyjnym scenariuszu"
    ],
    "F44": [
      "Wybierz krytyczny system do odtworzenia",
      "Sprawdź wynik odtworzenia z datą i pomiarem",
      "Porównaj realne RTO/RPO z oczekiwaniami biznesu"
    ],
    "F45": [
      "Zobacz aktualne BIA, BCP i DRP",
      "Zweryfikuj zależności ludzi, dostawców i lokalizacji",
      "Sprawdź ostatnie ćwiczenie i wnioski"
    ],
    "F46": [
      "Zatwierdź fikcyjny scenariusz bez wpływu na produkcję",
      "Prześledź role, decyzje i komunikację",
      "Zapisz czas oraz listę usprawnień"
    ],
    "F47": [
      "Sprawdź kontakty poza podstawową siecią i pocztą",
      "Przeanalizuj wzory komunikatów i zgodę na publikację",
      "Zidentyfikuj odbiorców: klient, organ, pracownik"
    ],
    "F48": [
      "Przejrzyj lessons learned po incydencie",
      "Zweryfikuj działania korygujące z terminami",
      "Sprawdź czy skuteczność została potwierdzona"
    ],
    "F51": [
      "Zidentyfikuj krytycznych dostawców i podwykonawców",
      "Sprawdź klauzule incydentowe, audytowe i SLA",
      "Zweryfikuj ciągłość, exit plan i dowody oceny"
    ],
    "F52": [
      "Zmapuj procesy, role i podstawy przetwarzania",
      "Sprawdź umowy powierzenia i rejestr czynności",
      "Potwierdź proces reakcji na naruszenia i DPIA wg ryzyka"
    ],
    "F53": [
      "Sprawdź klasyfikację, szyfrowanie i retencję",
      "Porównaj uprawnienia oraz transfery z polityką",
      "Zweryfikuj usuwanie, backup i dostęp do danych"
    ],
    "F54": [
      "Sprawdź przeglądy kodu, wymagania i pipeline",
      "Ustal odpowiedzialność za SCA, sekrety i artefakty",
      "Zweryfikuj przykładowy proces naprawy podatności"
    ],
    "F55": [
      "Zatwierdź plan testów i konta testowe",
      "Dobierz ASVS/WSTG do aplikacji i ryzyka",
      "Zapisz zakres, wyniki i retesty bez wrażliwych danych"
    ],
    "F56": [
      "Wypisz API, tożsamości maszynowe i integracje",
      "Sprawdź autoryzację, ograniczenia i logowanie",
      "Zbadaj rotację sekretów i wersjonowanie API"
    ],
    "F57": [
      "Wybierz próbkę zmian i ich zatwierdzeń",
      "Sprawdź testy, rollback oraz rozdzielenie obowiązków",
      "Zweryfikuj awaryjne zmiany po fakcie"
    ],
    "F58": [
      "Potwierdź opiekuna OT i zasady bezpieczeństwa procesów",
      "Użyj pasywnej dokumentacji, nie skanuj PLC bez zgody",
      "Zapisz segmentację, dostępy dostawców i okna serwisowe"
    ],
    "F61": [
      "Sprawdź dowody, ID, daty i wersje",
      "Porównaj próbę planowaną z faktyczną",
      "Oznacz braki, sporne źródła i stopień pewności"
    ],
    "F62": [
      "Pokaż każdą obserwację właścicielowi",
      "Zapisz jego stanowisko i kontrdowody",
      "Oddziel uzgodnienie faktów od zgody na ryzyko"
    ],
    "F63": [
      "Powiąż kryterium, obserwację i dowód",
      "Uzasadnij prawdopodobieństwo i wpływ",
      "Przypisz decyzję o naprawie do właściciela"
    ],
    "F64": [
      "Sformułuj ograniczenia i poziom zapewnienia",
      "Zaznacz systemy oraz okres poza zakresem",
      "Nie wydawaj certyfikatu ani potwierdzenia ustawowego z checklisty"
    ],
    "F65": [
      "Przygotuj podsumowanie decyzji dla zarządu",
      "Dodaj metodę, kryteria, próbki i tabelę ustaleń",
      "Usuń sekrety oraz dane nadmiarowe z raportu klienta"
    ],
    "F66": [
      "Wpisz działanie, odpowiedzialnego i termin",
      "Ustal mierzalne kryterium zamknięcia",
      "Zaplanuj dowód po wdrożeniu i retest"
    ],
    "F67": [
      "Wypisz ryzyka rezydualne i akceptujących",
      "Sprawdź formalne uprawnienie do akceptacji",
      "Oddziel akceptację ryzyka od obowiązku prawnego"
    ],
    "F68": [
      "Przeprowadź zamknięcie i podpis protokołu",
      "Zatwierdź dystrybucję oraz retencję raportu",
      "Ustal datę sprawdzenia napraw i kolejnego audytu"
    ]
  },
  "topics": {
    "governance": [
      "P01",
      "P02",
      "P03",
      "P04",
      "P05",
      "P06",
      "P07",
      "P08",
      "P11",
      "P12",
      "P13",
      "P14",
      "P15",
      "P16",
      "P18",
      "P38",
      "P42",
      "P43",
      "P44",
      "P45",
      "F01",
      "F02",
      "F03",
      "F04",
      "F05",
      "F06",
      "F07",
      "F08",
      "F11",
      "F12",
      "F13",
      "F14",
      "F15",
      "F16",
      "F17",
      "F18",
      "F57",
      "F61",
      "F62",
      "F63",
      "F64",
      "F65",
      "F66",
      "F67",
      "F68"
    ],
    "assets": [
      "P17",
      "P21",
      "P22",
      "P23",
      "P24",
      "P25",
      "P26",
      "P27",
      "P28",
      "P41",
      "F31"
    ],
    "network": [
      "P21",
      "P22",
      "P25",
      "P26",
      "P34",
      "F31",
      "F32",
      "F33",
      "F36",
      "F38",
      "F310"
    ],
    "identity": [
      "P31",
      "F15",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F26"
    ],
    "systems": [
      "P23",
      "P24",
      "P32",
      "P35",
      "F34",
      "F35",
      "F39"
    ],
    "continuity": [
      "P33",
      "P36",
      "P37",
      "F41",
      "F42",
      "F43",
      "F44",
      "F45",
      "F46",
      "F47",
      "F48"
    ],
    "suppliers": [
      "P14",
      "F51"
    ],
    "data": [
      "P06",
      "P27",
      "F52",
      "F53",
      "F43"
    ],
    "apps": [
      "F54",
      "F55",
      "F56"
    ],
    "cloud": [
      "F37"
    ],
    "ot": [
      "F58"
    ]
  },
  "core": [
    "P01",
    "P02",
    "P03",
    "P04",
    "P06",
    "P11",
    "P12",
    "P16",
    "P17",
    "P21",
    "P22",
    "P23",
    "P24",
    "P26",
    "P31",
    "P32",
    "P33",
    "P34",
    "P35",
    "P36",
    "P37",
    "P38",
    "P41",
    "P42",
    "P43",
    "P45",
    "F01",
    "F02",
    "F05",
    "F06",
    "F07",
    "F08",
    "F11",
    "F13",
    "F15",
    "F16",
    "F21",
    "F22",
    "F23",
    "F24",
    "F31",
    "F32",
    "F34",
    "F36",
    "F38",
    "F39",
    "F41",
    "F42",
    "F43",
    "F44",
    "F45",
    "F51",
    "F52",
    "F53",
    "F61",
    "F62",
    "F63",
    "F64",
    "F65",
    "F66",
    "F67",
    "F68"
  ],
  "anchors": [
    "P01",
    "P02",
    "P03",
    "P04",
    "P05",
    "P06",
    "P07",
    "F01",
    "F02",
    "F05",
    "F06",
    "F07",
    "F08",
    "F61",
    "F62",
    "F63",
    "F64",
    "F65",
    "F66",
    "F67",
    "F68"
  ],
  "standards": {
    "KSC": [
      "P01",
      "P02",
      "P03",
      "P04",
      "P05",
      "P06",
      "P07",
      "P08",
      "P11",
      "P12",
      "P13",
      "P14",
      "P15",
      "P16",
      "P17",
      "P18",
      "P21",
      "P22",
      "P23",
      "P24",
      "P25",
      "P26",
      "P27",
      "P28",
      "P31",
      "P32",
      "P33",
      "P34",
      "P35",
      "P36",
      "P37",
      "P38",
      "P41",
      "P42",
      "P43",
      "P44",
      "P45",
      "F01",
      "F02",
      "F03",
      "F05",
      "F06",
      "F07",
      "F08",
      "F11",
      "F12",
      "F13",
      "F14",
      "F15",
      "F16",
      "F17",
      "F18",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F26",
      "F31",
      "F32",
      "F33",
      "F34",
      "F35",
      "F36",
      "F37",
      "F38",
      "F39",
      "F310",
      "F41",
      "F42",
      "F43",
      "F44",
      "F45",
      "F46",
      "F47",
      "F48",
      "F51",
      "F52",
      "F53",
      "F54",
      "F55",
      "F56",
      "F57",
      "F58",
      "F61",
      "F62",
      "F63",
      "F64",
      "F65",
      "F66",
      "F67",
      "F68"
    ],
    "ISO": [
      "P01",
      "P02",
      "P03",
      "P04",
      "P05",
      "P06",
      "P07",
      "P08",
      "P11",
      "P12",
      "P13",
      "P14",
      "P15",
      "P16",
      "P17",
      "P18",
      "P21",
      "P22",
      "P23",
      "P24",
      "P25",
      "P26",
      "P27",
      "P28",
      "P31",
      "P32",
      "P33",
      "P34",
      "P35",
      "P36",
      "P37",
      "P38",
      "P41",
      "P42",
      "P43",
      "P44",
      "P45",
      "F01",
      "F02",
      "F03",
      "F04",
      "F05",
      "F06",
      "F07",
      "F08",
      "F11",
      "F12",
      "F13",
      "F14",
      "F15",
      "F16",
      "F17",
      "F18",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F26",
      "F31",
      "F32",
      "F33",
      "F34",
      "F35",
      "F36",
      "F37",
      "F38",
      "F39",
      "F310",
      "F41",
      "F42",
      "F43",
      "F44",
      "F45",
      "F46",
      "F47",
      "F48",
      "F51",
      "F52",
      "F53",
      "F54",
      "F55",
      "F56",
      "F57",
      "F58",
      "F61",
      "F62",
      "F63",
      "F64",
      "F65",
      "F66",
      "F67",
      "F68"
    ],
    "NIST": [
      "P11",
      "P12",
      "P13",
      "P14",
      "P16",
      "P17",
      "P18",
      "P21",
      "P22",
      "P23",
      "P24",
      "P25",
      "P26",
      "P27",
      "P28",
      "P31",
      "P32",
      "P33",
      "P34",
      "P35",
      "P36",
      "P37",
      "P41",
      "P42",
      "F11",
      "F12",
      "F13",
      "F14",
      "F15",
      "F16",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F31",
      "F32",
      "F33",
      "F34",
      "F35",
      "F36",
      "F37",
      "F38",
      "F39",
      "F41",
      "F42",
      "F43",
      "F44",
      "F45",
      "F46",
      "F47",
      "F48",
      "F51",
      "F52",
      "F53",
      "F54",
      "F55",
      "F56",
      "F57",
      "F58"
    ],
    "CIS": [
      "P15",
      "P17",
      "P18",
      "P21",
      "P22",
      "P23",
      "P24",
      "P25",
      "P26",
      "P27",
      "P28",
      "P31",
      "P32",
      "P33",
      "P34",
      "P35",
      "P36",
      "F15",
      "F16",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F31",
      "F32",
      "F33",
      "F34",
      "F35",
      "F36",
      "F37",
      "F38",
      "F39",
      "F310",
      "F41",
      "F44",
      "F51",
      "F53",
      "F54",
      "F56",
      "F57"
    ],
    "GDPR": [
      "P06",
      "P16",
      "P27",
      "P31",
      "P33",
      "P36",
      "P37",
      "F01",
      "F02",
      "F03",
      "F11",
      "F13",
      "F15",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F26",
      "F41",
      "F43",
      "F44",
      "F47",
      "F51",
      "F52",
      "F53",
      "F61",
      "F62",
      "F63",
      "F65",
      "F66"
    ],
    "DORA": [
      "P01",
      "P03",
      "P06",
      "P12",
      "P13",
      "P14",
      "P16",
      "P17",
      "P18",
      "P31",
      "P33",
      "P36",
      "P37",
      "F01",
      "F02",
      "F03",
      "F05",
      "F06",
      "F07",
      "F08",
      "F11",
      "F12",
      "F13",
      "F14",
      "F16",
      "F18",
      "F21",
      "F22",
      "F23",
      "F24",
      "F31",
      "F32",
      "F34",
      "F37",
      "F38",
      "F39",
      "F41",
      "F42",
      "F43",
      "F44",
      "F45",
      "F46",
      "F47",
      "F48",
      "F51",
      "F53",
      "F57",
      "F61",
      "F62",
      "F63",
      "F64",
      "F65",
      "F66",
      "F67",
      "F68"
    ],
    "EU2690": [
      "P06",
      "P12",
      "P14",
      "P16",
      "P21",
      "P22",
      "P23",
      "P26",
      "P27",
      "P31",
      "P32",
      "P33",
      "P34",
      "P35",
      "P36",
      "P37",
      "F01",
      "F02",
      "F03",
      "F11",
      "F12",
      "F13",
      "F15",
      "F16",
      "F18",
      "F21",
      "F22",
      "F23",
      "F24",
      "F25",
      "F31",
      "F32",
      "F33",
      "F34",
      "F35",
      "F37",
      "F38",
      "F39",
      "F41",
      "F42",
      "F43",
      "F44",
      "F45",
      "F46",
      "F47",
      "F48",
      "F51",
      "F53",
      "F57",
      "F61",
      "F63",
      "F65",
      "F66"
    ],
    "CRA": [
      "P06",
      "P13",
      "P14",
      "P16",
      "F01",
      "F02",
      "F03",
      "F13",
      "F18",
      "F54",
      "F55",
      "F56",
      "F57",
      "F61",
      "F63",
      "F65",
      "F66"
    ],
    "OWASP": [
      "F54",
      "F55",
      "F56",
      "F57",
      "F23",
      "F24",
      "F39"
    ]
  }
};
