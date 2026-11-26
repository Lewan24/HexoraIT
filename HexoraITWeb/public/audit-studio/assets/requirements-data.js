/**
 * Macierz kryteriów: autorskie STRESZCZENIA zakresu kontrolnego, a nie tekst norm/aktów.
 * Kryteria prawne wymagają kwalifikacji organizacji i sprawdzenia aktów wykonawczych.
 * ISO/CIS/OWASP: lista jest indeksem, nie pełnym testem certyfikacyjnym.
 */
window.AUDIT_REQUIREMENTS = [
  {
    "id": "KSC-01",
    "frame": "KSC",
    "reference": "KSC art. 5 + zał. 1-2",
    "title": "Kwalifikacja podmiotu",
    "question": "Czy status podmiotu kluczowego/ważnego, sektor i wyjątki potwierdzono w aktualnej ustawie?",
    "evidence": "Opinia/analiza kwalifikacji, dane o usługach, wielkości i grupie",
    "tasks": [
      "P16",
      "F01",
      "F03"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-02",
    "frame": "KSC",
    "reference": "KSC / wpis do Wykazu",
    "title": "Wpis i aktualizacja danych",
    "question": "Czy wymagany wpis istnieje i dane są aktualizowane przez uprawnioną osobę?",
    "evidence": "Potwierdzenie wpisu, właściciel, daty",
    "tasks": [
      "P16",
      "F01",
      "F18"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-03",
    "frame": "KSC",
    "reference": "KSC / zarządzanie",
    "title": "Odpowiedzialność kierownictwa",
    "question": "Czy kierownictwo nadzoruje cyberbezpieczeństwo, ryzyko i zasoby?",
    "evidence": "Uchwały, RACI, przeglądy, szkolenia",
    "tasks": [
      "F11",
      "F12",
      "F16"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-04",
    "frame": "KSC",
    "reference": "KSC / SZBI",
    "title": "SZBI i ocena ryzyka",
    "question": "Czy system zarządzania i środki są wdrożone proporcjonalnie do ryzyka i usług?",
    "evidence": "Ryzyko, polityki, rejestry działań, dowody testów",
    "tasks": [
      "F12",
      "F13",
      "F14",
      "F17"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-05",
    "frame": "KSC",
    "reference": "KSC / zabezpieczenia",
    "title": "Ochrona sieci, tożsamości i usług",
    "question": "Czy praktyki techniczne są wdrożone i faktycznie działają w określonym zakresie?",
    "evidence": "Próbki MFA, segmentacji, backupu, monitoringu i aktualizacji",
    "tasks": [
      "F21",
      "F23",
      "F31",
      "F32",
      "F34",
      "F39",
      "F41",
      "F44"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-06",
    "frame": "KSC",
    "reference": "KSC / incydenty",
    "title": "Obsługa i zgłoszenia incydentów",
    "question": "Czy procedura klasyfikuje zdarzenia i wskazuje właściwy CSIRT, progi oraz terminy?",
    "evidence": "Playbook, ćwiczenie, historia zgłoszeń",
    "tasks": [
      "P37",
      "F42",
      "F43",
      "F47"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-07",
    "frame": "KSC",
    "reference": "KSC / S46",
    "title": "Dostęp i obsługa S46",
    "question": "Czy wymagany dostęp do S46 jest ustanowiony i osoba odpowiedzialna potrafi z niego skorzystać?",
    "evidence": "Dane kontaktowe, potwierdzenie dostępu, ćwiczenie",
    "tasks": [
      "F01",
      "F18",
      "F43"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-08",
    "frame": "KSC",
    "reference": "KSC / łańcuch dostaw",
    "title": "Ryzyko dostawców",
    "question": "Czy nadzorowane są cyberzagrożenia związane z dostawcami i zależnościami?",
    "evidence": "Spis dostawców, umowy, oceny i działania",
    "tasks": [
      "P14",
      "F51"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-09",
    "frame": "KSC",
    "reference": "KSC / audyt",
    "title": "Audyt wymagany prawem",
    "question": "Czy dotyczy obowiązek audytu ustawowego, termin i kompetencje audytora?",
    "evidence": "Historia audytów, mandat, kwalifikacje i raport",
    "tasks": [
      "P05",
      "F01",
      "F17",
      "F64"
    ],
    "kind": "law",
    "notice": "Dla Polski oceniaj w pierwszej kolejności aktualny tekst KSC oraz akty wykonawcze; dyrektywa jest kontekstem."
  },
  {
    "id": "KSC-10",
    "frame": "KSC",
    "reference": "NIS2 art. 20",
    "title": "NIS2: Odpowiedzialność organu zarządzającego",
    "question": "Czy istnieją zatwierdzone środki i cykliczna edukacja kierownictwa?",
    "evidence": "Decyzje, szkolenia, przeglądy",
    "tasks": [
      "F11",
      "F16"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-11",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(a)",
    "title": "NIS2: Polityki analizy ryzyka i bezpieczeństwa",
    "question": "Czy ryzyka i polityki są cyklicznie oceniane i aktualizowane?",
    "evidence": "Metoda ryzyka, polityki, przeglądy",
    "tasks": [
      "F12",
      "F13",
      "F14"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-12",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(b)",
    "title": "NIS2: Obsługa incydentów",
    "question": "Czy role, klasyfikacja, reakcja i ślad decyzji są przetestowane?",
    "evidence": "Playbook, przypadki, ćwiczenia",
    "tasks": [
      "F42",
      "F43",
      "F48"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-13",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(c)",
    "title": "NIS2: Ciągłość i odzyskiwanie",
    "question": "Czy istnieją backup, DR, zarządzanie kryzysem i sprawdzone odtworzenia?",
    "evidence": "BCP/DRP, test restore, RTO/RPO",
    "tasks": [
      "P33",
      "F44",
      "F45",
      "F46"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-14",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(d)",
    "title": "NIS2: Bezpieczeństwo łańcucha dostaw",
    "question": "Czy dostawcy są klasyfikowani, umowy oceniane i ryzyka nadzorowane?",
    "evidence": "Umowy, lista dostawców, oceny",
    "tasks": [
      "P14",
      "F51"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-15",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(e)",
    "title": "NIS2: Bezpieczny rozwój i utrzymanie systemów",
    "question": "Czy zakup, rozwój, utrzymanie i obsługa podatności podlegają kontrolom?",
    "evidence": "SDLC, zmiany, testy i wyjątki",
    "tasks": [
      "F39",
      "F54",
      "F55",
      "F57"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-16",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(f)",
    "title": "NIS2: Ocena skuteczności środków",
    "question": "Czy organizacja testuje i mierzy działanie zabezpieczeń?",
    "evidence": "Plan pomiarów, wyniki, retesty",
    "tasks": [
      "F05",
      "F17",
      "F41",
      "F61"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-17",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(g)",
    "title": "NIS2: Higiena cybernetyczna i szkolenia",
    "question": "Czy wykonywane są działania higieniczne oraz szkolenia?",
    "evidence": "Program, potwierdzenia, wskaźniki",
    "tasks": [
      "F16",
      "F34"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-18",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(h)",
    "title": "NIS2: Kryptografia i szyfrowanie",
    "question": "Czy adekwatnie zarządzane są zasady kryptografii i kluczy?",
    "evidence": "Polityki, ustawienia, retencja kluczy",
    "tasks": [
      "F24",
      "F53"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-19",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(i)",
    "title": "NIS2: Bezpieczeństwo ludzi, dostęp i aktywa",
    "question": "Czy role, konta, aktywa i procesy HR mają właściwe kontrole?",
    "evidence": "Inwentarz, IAM, HR, próby",
    "tasks": [
      "P24",
      "F15",
      "F21",
      "F22"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-20",
    "frame": "KSC",
    "reference": "NIS2 art. 21(2)(j)",
    "title": "NIS2: MFA i bezpieczna komunikacja",
    "question": "Czy wieloskładnikowe logowanie i ochrona komunikacji są stosowane adekwatnie?",
    "evidence": "Polityka MFA, ustawienia, testy",
    "tasks": [
      "P31",
      "F23",
      "F38"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "KSC-21",
    "frame": "KSC",
    "reference": "NIS2 art. 23",
    "title": "NIS2: Zgłaszanie poważnych incydentów",
    "question": "Czy rozpoznano kategorie incydentów i ścieżkę terminowego zgłaszania?",
    "evidence": "Progi, kontakty, symulacja, raporty",
    "tasks": [
      "F43",
      "F47"
    ],
    "kind": "directive",
    "notice": "Mapowanie kontekstowe do NIS2; podstawą obowiązku polskiego podmiotu jest KSC i właściwe przepisy."
  },
  {
    "id": "ISO-01",
    "frame": "ISO",
    "reference": "pkt 4",
    "title": "Kontekst i zakres SZBI",
    "question": "Czy zdefiniowano interesariuszy, zakres oraz zależności?",
    "evidence": "Zakres, procesy, rejestr wymagań",
    "tasks": [
      "P03",
      "P11",
      "P12",
      "F04"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "ISO-02",
    "frame": "ISO",
    "reference": "pkt 5",
    "title": "Przywództwo i polityka",
    "question": "Czy zarząd nadaje kierunek, role i zasoby bezpieczeństwu?",
    "evidence": "Polityka, odpowiedzialności, decyzje",
    "tasks": [
      "F11",
      "F12"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "ISO-03",
    "frame": "ISO",
    "reference": "pkt 6",
    "title": "Planowanie i ryzyko",
    "question": "Czy ryzyka i cele SZBI są określone, realizowane i aktualizowane?",
    "evidence": "Metodyka, SoA, plan ryzyka, cele",
    "tasks": [
      "F04",
      "F13",
      "F14"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "ISO-04",
    "frame": "ISO",
    "reference": "pkt 7",
    "title": "Wsparcie SZBI",
    "question": "Czy ludzie, kompetencje i informacje są kontrolowane?",
    "evidence": "Szkolenia, komunikacja, nadzór dokumentów",
    "tasks": [
      "F12",
      "F16"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "ISO-05",
    "frame": "ISO",
    "reference": "pkt 8",
    "title": "Działanie SZBI",
    "question": "Czy zaplanowane procesy i decyzje dot. ryzyk są realizowane?",
    "evidence": "Plany, wybory ryzyk, dowody działań",
    "tasks": [
      "F13",
      "F57"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "ISO-06",
    "frame": "ISO",
    "reference": "pkt 9",
    "title": "Ocena efektów",
    "question": "Czy prowadzone są pomiary, audyty wewnętrzne i przeglądy?",
    "evidence": "Wskaźniki, program audytów, protokoły",
    "tasks": [
      "F05",
      "F17",
      "F61"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "ISO-07",
    "frame": "ISO",
    "reference": "pkt 10",
    "title": "Doskonalenie",
    "question": "Czy niezgodności prowadzą do sprawdzonych korekt?",
    "evidence": "CAPA, retesty, lessons learned",
    "tasks": [
      "F17",
      "F48",
      "F66",
      "F68"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "ISO-08",
    "frame": "ISO",
    "reference": "Załącznik A + SoA",
    "title": "Wybór i wdrożenie kontroli",
    "question": "Czy SoA uwzględnia ryzyka i przyjęto dowody skuteczności odpowiednich kontroli?",
    "evidence": "Aktualne SoA, ryzyka, próbki",
    "tasks": [
      "F04",
      "F21",
      "F31",
      "F41",
      "F51"
    ],
    "kind": "benchmark",
    "notice": "Indeks poglądowy. Pełna ocena ISO/IEC 27001 wymaga licencjonowanego tekstu normy i kompletnego SoA."
  },
  {
    "id": "NIST-01",
    "frame": "NIST",
    "reference": "NIST CSF 2.0 / GV",
    "title": "Govern",
    "question": "Czy odpowiedzialności, polityki i ryzyka są formalnie zarządzane?",
    "evidence": "Polityki, risk register, przeglądy",
    "tasks": [
      "F11",
      "F12",
      "F13",
      "F14"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "NIST-02",
    "frame": "NIST",
    "reference": "NIST CSF 2.0 / ID",
    "title": "Identify",
    "question": "Czy zasoby, usługi i ryzyka są prawidłowo rozpoznane?",
    "evidence": "CMDB, diagramy, zależności",
    "tasks": [
      "P17",
      "P21",
      "P24",
      "P27"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "NIST-03",
    "frame": "NIST",
    "reference": "NIST CSF 2.0 / PR",
    "title": "Protect",
    "question": "Czy wdrożono ochronę dostępu, danych i środowiska?",
    "evidence": "IAM, hardening, segmentacja",
    "tasks": [
      "F21",
      "F23",
      "F31",
      "F34",
      "F53"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "NIST-04",
    "frame": "NIST",
    "reference": "NIST CSF 2.0 / DE",
    "title": "Detect",
    "question": "Czy są logi i skuteczne wykrywanie anomalii?",
    "evidence": "Logi, alerty, próba",
    "tasks": [
      "F41",
      "F42"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "NIST-05",
    "frame": "NIST",
    "reference": "NIST CSF 2.0 / RS",
    "title": "Respond",
    "question": "Czy działają procedury obsługi zdarzeń i komunikacji?",
    "evidence": "Playbook, ćwiczenia, obsługa",
    "tasks": [
      "F42",
      "F43",
      "F47"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "NIST-06",
    "frame": "NIST",
    "reference": "NIST CSF 2.0 / RC",
    "title": "Recover",
    "question": "Czy można odtworzyć usługi po zakłóceniu?",
    "evidence": "BCP/DRP, restore, lessons learned",
    "tasks": [
      "F44",
      "F45",
      "F48"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "CIS-01",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 1",
    "title": "Inwentaryzacja aktywów",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P21",
      "P22",
      "P24"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-02",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 2",
    "title": "Inwentaryzacja oprogramowania",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P17",
      "P24",
      "P32"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-03",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 3",
    "title": "Ochrona danych",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P27",
      "F53"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-04",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 4",
    "title": "Bezpieczne konfiguracje",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F33",
      "F34"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-05",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 5",
    "title": "Zarządzanie kontami",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F21",
      "F24"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-06",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 6",
    "title": "Zarządzanie dostępem",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F22",
      "F23",
      "F25"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-07",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 7",
    "title": "Zarządzanie podatnościami",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P32",
      "F39"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-08",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 8",
    "title": "Zarządzanie logami",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P36",
      "F41"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-09",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 9",
    "title": "Ochrona poczty i przeglądarek",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F36",
      "F34"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-10",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 10",
    "title": "Ochrona przed malware",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P35",
      "F34"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-11",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 11",
    "title": "Odzyskiwanie danych",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P33",
      "F44"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-12",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 12",
    "title": "Zarządzanie infrastrukturą sieci",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F31",
      "F32",
      "F33"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-13",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 13",
    "title": "Monitorowanie i obrona sieci",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "P34",
      "F41"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-14",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 14",
    "title": "Świadomość i szkolenia",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F16"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-15",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 15",
    "title": "Dostawcy usług",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F51"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-16",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 16",
    "title": "Bezpieczeństwo aplikacji",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F54",
      "F55"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-17",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 17",
    "title": "Reagowanie na incydenty",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F42",
      "F43"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "CIS-18",
    "frame": "CIS",
    "reference": "CIS Controls v8.1 / Control 18",
    "title": "Testy penetracyjne",
    "question": "Czy określono właściwe safeguards, grupę IG i dowody wdrożenia w zakresie?",
    "evidence": "Przypisane safeguards i wyniki próby",
    "tasks": [
      "F39",
      "F55"
    ],
    "kind": "benchmark",
    "notice": "Control to rodzina. Szczegółowe safeguards dobierz z oficjalnego CIS Navigator; ten wpis nie zastępuje ich pełnej listy."
  },
  {
    "id": "GDPR-01",
    "frame": "GDPR",
    "reference": "RODO art. 32",
    "title": "Bezpieczeństwo przetwarzania",
    "question": "Czy poziom bezpieczeństwa odpowiada ryzyku dla praw i wolności osób?",
    "evidence": "Ocena ryzyka, kontrole i testy",
    "tasks": [
      "F52",
      "F53",
      "F44"
    ],
    "kind": "law",
    "notice": ""
  },
  {
    "id": "GDPR-02",
    "frame": "GDPR",
    "reference": "RODO art. 33",
    "title": "Zgłoszenie naruszenia organowi",
    "question": "Czy działa klasyfikacja i zgłoszenie naruszenia do organu gdy wymagane?",
    "evidence": "Rejestr naruszeń, procedura i ćwiczenie",
    "tasks": [
      "F43",
      "F52"
    ],
    "kind": "law",
    "notice": ""
  },
  {
    "id": "GDPR-03",
    "frame": "GDPR",
    "reference": "RODO art. 34",
    "title": "Zawiadomienie osób",
    "question": "Czy ustalono warunki zawiadamiania osób i wyjątki?",
    "evidence": "Decyzje IOD, szablony komunikacji",
    "tasks": [
      "F43",
      "F47",
      "F52"
    ],
    "kind": "law",
    "notice": ""
  },
  {
    "id": "GDPR-04",
    "frame": "GDPR",
    "reference": "RODO art. 35",
    "title": "Ocena skutków DPIA",
    "question": "Czy przeprowadzono DPIA tam, gdzie przetwarzanie prawdopodobnie powoduje wysokie ryzyko?",
    "evidence": "DPIA, rejestr przesłanek",
    "tasks": [
      "F52",
      "F53"
    ],
    "kind": "law",
    "notice": ""
  },
  {
    "id": "DORA-01",
    "frame": "DORA",
    "reference": "DORA / ICT risk",
    "title": "Zarządzanie ryzykiem ICT",
    "question": "Czy właściwy podmiot finansowy ma nadzór i kontrolę ryzyk ICT?",
    "evidence": "Program ICT risk, przeglądy",
    "tasks": [
      "F11",
      "F13",
      "F31"
    ],
    "kind": "law",
    "notice": "Wymaga analizy kategorii podmiotu i RTS/ITS, nie zastępuje pełnej macierzy DORA."
  },
  {
    "id": "DORA-02",
    "frame": "DORA",
    "reference": "DORA / Incident management",
    "title": "Zarządzanie incydentami",
    "question": "Czy klasyfikacja, raportowanie i komunikacja spełniają wymagania sektorowe?",
    "evidence": "Playbook DORA, próby",
    "tasks": [
      "F42",
      "F43",
      "F47"
    ],
    "kind": "law",
    "notice": "Wymaga analizy kategorii podmiotu i RTS/ITS, nie zastępuje pełnej macierzy DORA."
  },
  {
    "id": "DORA-03",
    "frame": "DORA",
    "reference": "DORA / Testing",
    "title": "Testowanie odporności",
    "question": "Czy prowadzone są odpowiednie testy ICT i usuwane luki?",
    "evidence": "Testy odporności, CAPA",
    "tasks": [
      "F39",
      "F46",
      "F66"
    ],
    "kind": "law",
    "notice": "Wymaga analizy kategorii podmiotu i RTS/ITS, nie zastępuje pełnej macierzy DORA."
  },
  {
    "id": "DORA-04",
    "frame": "DORA",
    "reference": "DORA / Third-party risk",
    "title": "Ryzyko dostawców ICT",
    "question": "Czy istnieje spis uzgodnień ICT i nadzór nad usługami krytycznymi?",
    "evidence": "Rejestr umów, exit plan",
    "tasks": [
      "F51"
    ],
    "kind": "law",
    "notice": "Wymaga analizy kategorii podmiotu i RTS/ITS, nie zastępuje pełnej macierzy DORA."
  },
  {
    "id": "EU2690-01",
    "frame": "EU2690",
    "reference": "UE 2024/2690 / Załącznik, zakres",
    "title": "Kwalifikacja kategorii dostawcy",
    "question": "Czy badana usługa jest wymieniona w zakresie rozporządzenia 2024/2690?",
    "evidence": "Katalog usług i ocena prawna",
    "tasks": [
      "F01",
      "F03"
    ],
    "kind": "law",
    "notice": "Dotyczy wyłącznie określonych kategorii usług cyfrowych i zaufania."
  },
  {
    "id": "EU2690-02",
    "frame": "EU2690",
    "reference": "UE 2024/2690 / Załącznik, środki",
    "title": "Wymagania metodyczne i techniczne",
    "question": "Czy aktualna macierz załącznika uwzględnia wszystkie właściwe środki?",
    "evidence": "Macierz właściwych punktów załącznika i dowody",
    "tasks": [
      "F12",
      "F13",
      "F21",
      "F32",
      "F41",
      "F51"
    ],
    "kind": "law",
    "notice": "Dotyczy wyłącznie określonych kategorii usług cyfrowych i zaufania."
  },
  {
    "id": "CRA-01",
    "frame": "CRA",
    "reference": "CRA / art. 14",
    "title": "Raportowanie produktu",
    "question": "Czy obowiązki zgłoszeń podatności/incydentów produktu stosowane od 11.09.2026 zostały ocenione?",
    "evidence": "Rola rynkowa, procedura i zdarzenia",
    "tasks": [
      "F01",
      "F03",
      "F54"
    ],
    "kind": "law",
    "notice": "Stosowanie CRA jest etapowe; większość obowiązków od 11.12.2027."
  },
  {
    "id": "CRA-02",
    "frame": "CRA",
    "reference": "CRA / harmonogram",
    "title": "Wymagania bezpieczeństwa produktu",
    "question": "Czy ustalono rolę i terminy pozostałych obowiązków CRA?",
    "evidence": "Macierz produktu, harmonogram i plan",
    "tasks": [
      "F03",
      "F54",
      "F55"
    ],
    "kind": "law",
    "notice": "Stosowanie CRA jest etapowe; większość obowiązków od 11.12.2027."
  },
  {
    "id": "OWASP-01",
    "frame": "OWASP",
    "reference": "OWASP / ASVS 5.0",
    "title": "Wymagania weryfikacji aplikacji",
    "question": "Czy dobrano właściwy poziom ASVS i wymagania dla aplikacji?",
    "evidence": "Macierz ASVS i ustalenia",
    "tasks": [
      "F54",
      "F55"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "OWASP-02",
    "frame": "OWASP",
    "reference": "OWASP / WSTG",
    "title": "Zakres testów web",
    "question": "Czy techniki testów odpowiadają ryzyku i RoE?",
    "evidence": "Plan testów, zgody, wyniki",
    "tasks": [
      "F55",
      "F08"
    ],
    "kind": "benchmark",
    "notice": ""
  },
  {
    "id": "OWASP-03",
    "frame": "OWASP",
    "reference": "OWASP / API",
    "title": "Bezpieczeństwo API",
    "question": "Czy autoryzacja, tożsamości i integracje są testowane?",
    "evidence": "Próba API, logi i architektura",
    "tasks": [
      "F56",
      "F23"
    ],
    "kind": "benchmark",
    "notice": ""
  }
];
