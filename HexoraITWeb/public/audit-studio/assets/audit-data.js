/**
 * DANE WORKFLOW. Edytuj etapy, zadania, kryteria i bibliografię tutaj.
 * Statusów użytkownika nie zapisujemy w tym pliku: przeglądarka przechowuje je lokalnie
 * i umożliwia eksport/import pliku JSON.
 * Stan merytoryczny źródeł: 4 listopada 2026 r. Nie zastępuje opinii prawnej.
 */
window.AUDIT_DATA = (() => {
  const task = (id, name, action, evidence, refs, applicability='all', permission='read', tip='') =>
    ({id, name, action, evidence, refs, applicability, permission, tip});

  const stages = [
    {
      id:'P0', mode:'pre', title:'0. Mandat, umowa i zasady badania',
      duration:'przed wejściem do środowiska', owner:'Sponsor + audytor wiodący',
      goal:'Ustalić kto, po co, w jakim zakresie i z jaką zgodą może oceniać systemy.',
      gate:'Zatwierdzone: mandat, zakres, lista wyłączeń, kontakty awaryjne, plan, NDA/DPA jeżeli wymagane.',
      tasks:[
        task('P01','Potwierdź sponsora, właściciela biznesowego i mandat','Pisemnie ustal osobę zlecającą, właścicieli badanych systemów oraz podstawę upoważnienia; odnotuj ograniczenia umowne dostawców.','Podpisany mandat / karta zlecenia, lista osób decyzyjnych.','ISO19011;NIST115'),
        task('P02','Zdefiniuj cel i typ audytu','Zapisz czy celem jest rozpoznanie, audyt wewnętrzny, gap assessment, audit compliance, ocena techniczna lub przygotowanie do certyfikacji.','Cel, kryteria, typ oceny, adresat raportu.','ISO19011;ISO27001'),
        task('P03','Ustal granice zakresu','Wypisz jednostki, lokalizacje, spółki, adresacje, domeny, sieci, chmury, dostawców, OT, wyłączenia i okres badany; osobno systemy niedostępne.','Karta zakresu z podpisem, lista in/out.','ISO19011;NIST115'),
        task('P04','Zatwierdź reguły zaangażowania (RoE)','Zapisz dozwolone techniki, godziny, limit obciążenia, zakaz DoS i socjotechniki bez odrębnej zgody, testowe konta, plan wycofania, procedurę stop-test.','RoE, kontakty 24/7, okno prac, ścieżka eskalacji.','NIST115','all','approval'),
        task('P05','Sprawdź konflikt interesów i kompetencje','Audytor ocenia swoją niezależność od wdrażanych rozwiązań; dla audytu ustawowego potwierdza kwalifikacje i wymagania specyficzne.','Deklaracja niezależności, kompetencje, skład zespołu.','ISO19011;KSC26'),
        task('P06','Ustal zasady dowodów i poufności','Wybierz repozytorium, uprawnienia, retencję, szyfrowanie, zasady anonimizacji i bezpiecznego transferu; zakaz zbierania haseł i pełnych zrzutów bez potrzeby.','Protokół obsługi danych, matryca uprawnień, terminy retencji.','GDPR;ISO27001'),
        task('P07','Ustal metodę oceny i próbę','Zapisz skalę ryzyka 5×5, pojęcie niezgodności, sposób doboru próby, pewność ustaleń, weryfikację z właścicielem i ograniczenia metody.','Program audytu, plan próbkowania, kryteria ryzyka.','ISO19011;ISO27005'),
        task('P08','Zorganizuj otwarcie i kanał eskalacji','Kick-off z IT, biznesem, IOD, bezpieczeństwem, dostawcami i OT (jeśli dotyczy); zgłoś sposób natychmiastowej eskalacji ryzyka krytycznego.','Protokół spotkania, harmonogram, kanał komunikacji.','ISO19011')]
    },
    {
      id:'P1', mode:'pre', title:'1. Wywiad biznesowy i szybkie rozpoznanie',
      duration:'dzień 1-2 / zależnie od skali', owner:'Audytor + IT + właściciele procesów',
      goal:'Zrozumieć jak firma działa i od czego faktycznie zależy ciągłość usług.',
      gate:'Schemat krytycznych usług, pierwsze założenia zasięgu i lista braków wiedzy.',
      tasks:[
        task('P11','Przeprowadź wywiad z kierownictwem','Spytaj o krytyczne usługi, dotkliwość przestojów, obowiązki klientów, incydenty, planowane zmiany, oczekiwania i akceptację ryzyka.','Notatki wywiadu i mapa procesów.','NISTCSF;ISO27001'),
        task('P12','Ustal usługi i zależności','Dla każdej usługi zapisz właściciela, użytkowników, czas niedostępności akceptowalny przez biznes, dostawców i kluczowe aplikacje.','Katalog usług i zależności, wstępne RTO/RPO do potwierdzenia.','NISTCSF'),
        task('P13','Zapytaj o wcześniejsze audyty i incydenty','Porównaj raporty, zgłoszenia i działania naprawcze z obecnym środowiskiem; sprawdź czy zalecenia rzeczywiście zamknięto.','Poprzednie raporty, wykaz incydentów i CAPA.','ISO19011;NISTCSF'),
        task('P14','Zidentyfikuj ludzi i dostawców','Zmapuj właścicieli routerów, serwerów, domen, certyfikatów, kont dostawców, obiektu, HR, aplikacji i backupu.','RACI / spis właścicieli, kontakty, umowy SLA.','ISO27001;NISTCSF'),
        task('P15','Zgromadź istniejące dokumenty','Poproś o topologie, CMDB, umowy, polityki, BCP/DRP, kopie configów, raporty EDR, wykazy kont i przeglądy dostępów.','Indeks dokumentacji: jest / brak / nieaktualna.','ISO27001;CIS81'),
        task('P16','Wstępna kwalifikacja regulacyjna','Zbadaj sektor, usługi, progi zatrudnienia/finansowe, strukturę grupy, wyjątki i podmiotowość KSC; osobno RODO/DORA/CRA i inne.','Arkusz kwalifikacji z podstawą i opinią compliance.','KSC26;NIS2;DORA;GDPR'),
        task('P17','Ustal krajobraz technologiczny','Czy jest AD/Entra/IdP? Hypervisor? serwer poczty? LAN/WAN/Wi-Fi/OT? chmura? BYOD? DevOps?','High-level overview i lista technologii do sprawdzenia.','NISTCSF;CIS81'),
        task('P18','Wyznacz czerwone flagi','Ustal czy są nieznane konta admin, brak odzysku haseł, brak backupów, EOL, wystawione RDP, wspólny admin, niezidentyfikowane NAT.','Lista wstępnych hipotez, bez przesądzania o niezgodności.','CIS81;NISTCSF')]
    },
    {
      id:'P2', mode:'pre', title:'2. Inwentaryzacja i mapa sieci',
      duration:'dzień 2-5 / bezinwazyjnie', owner:'Administrator infrastruktury + audytor',
      goal:'Potwierdzić co istnieje, kto tym zarządza i jak przepływają dane.',
      gate:'Minimalny aktualny spis zasobów, stref i połączeń, nieznane elementy jawnie oznaczone.',
      tasks:[
        task('P21','Zbierz informacje pasywne o podsieciach','Przejrzyj konfiguracje bram, VLAN, DHCP, DNS, routing, VPN, interfejsy L3, NAT, informacje z CMDB i switchy; bez skanowania.','Lista podsieci/VLAN i tras z datą zrzutu.','CIS81'),
        task('P22','Zweryfikuj urządzenia sieciowe','Dla routerów, firewalli, switchy, AP, kontrolerów i modemów: model, serial (w sejfie), wersja firmware, IP zarządzające, EOL/EOS, właściciel.','Arkusz inwentarza oraz backup konfiguracji tylko do odczytu.','CIS81;NISTCSF'),
        task('P23','Zidentyfikuj hypervisory i VM','Zbierz hosty, maszyny, systemy operacyjne, datastore, snapshoty, backupy, połączenia port-group i właścicieli usług.','Lista VM + zależności + stan zabezpieczeń.','CIS81'),
        task('P24','Zidentyfikuj endpointy i serwery','Uzgodnij CMDB / RMM / EDR / MDM / DHCP; wskaż duplikaty, niewidoczne końcówki, urządzenia prywatne i niezarządzane.','Pokrycie agentami i lista wyjątków.','CIS81'),
        task('P25','Zmapuj Wi-Fi, gości i IoT','Nazwy SSID, VLAN, uwierzytelnianie, izolacja, IoT, drukarki, CCTV, terminale, urządzenia dostawców, fizyczne porty.','Mapa logiczna WLAN/IoT i przypisanie właścicieli.','CIS81;NISTCSF'),
        task('P26','Zidentyfikuj ekspozycję zewnętrzną','Uzgodnij domeny, IP publiczne, DNS, port-forwardy, serwisy SaaS, dostawców DNS, certyfikaty i VPN ze znanych źródeł administracyjnych.','Rejestr publicznych usług i zaakceptowanych wyjątków.','CIS81'),
        task('P27','Zmapuj przepływy krytycznych danych','Dla usług z P12 określ: skąd, dokąd, port/protokół, właściciel, rodzaj danych, sposób szyfrowania, przepływy między oddziałami i dostawcami.','Diagram high-level i data flow z legendą.','GDPR;NISTCSF'),
        task('P28','Porównaj źródła i zaznacz luki','Wskaż różnice między DHCP, ARP, CMDB, hypervisorem, EDR i firewall: brak właściciela = problem ewidencyjny.','Wykaz rozbieżności oraz stopień pokrycia, bez udawania 100%.','ISO19011;CIS81')]
    },
    {
      id:'P3', mode:'pre', title:'3. Szybki przegląd podstawowych zabezpieczeń',
      duration:'po uzyskaniu dostępów read-only', owner:'Audytor + właściciele systemów',
      goal:'Wykryć oczywiste słabości, nie narażając produkcji.',
      gate:'Karta quick wins z dowodem, właścicielem i decyzją o pilności.',
      tasks:[
        task('P31','Sprawdź MFA i konta uprzywilejowane','Na podstawie ustawień i zanonimizowanych zestawień oceń MFA dla adminów, zdalnego dostępu, e-mail oraz kont awaryjnych.','Eksport polityk MFA / lista wyjątków (bez sekretów).','CIS81;NISTCSF'),
        task('P32','Sprawdź aktualizacje i EOL','Porównaj listę OS, firmware, aplikacji z polityką poprawek, istotnością luk i procesem wyjątków.','Zestawienie wersji, dat aktualizacji i planu patchowania.','CIS81;NISTCSF'),
        task('P33','Sprawdź backup i odtwarzanie','Przejrzyj raport ostatnich backupów, zakres, izolację/niemutowalność, retencję i ostatni udokumentowany test odtworzenia.','Raporty backup oraz dowód testu restore.','CIS81;NISTCSF'),
        task('P34','Sprawdź firewall, NAT i separację','Weryfikuj konfigurację read-only: nieużywane reguły, usługi admina od WAN, any-any, nieznane przekierowania, izolacja gości/IoT.','Zrzut zredagowanych reguł i decyzje właścicieli.','CIS81;NISTCSF'),
        task('P35','Sprawdź zabezpieczenia endpointów','Ustal coverage EDR/AV, polityki szyfrowania dysków, blokady ekranu, adminów lokalnych oraz alerty nieobsłużone.','Zagregowane raporty EDR/MDM i wyjątki.','CIS81'),
        task('P36','Sprawdź logowanie i alertowanie','Określ źródła logów (firewall, IdP, EDR, serwery), retencję, synchronizację czasu, alerting i dyżur.','Matryca źródeł + przykład incydentu / alertu.','NISTCSF;CIS81'),
        task('P37','Sprawdź procedurę incydentu i dostęp awaryjny','Kto odbiera alert w weekend, odcina kompromitowane konto i przejmuje sprawę? Czy kontakt działa?','Plan reagowania + próba kontaktu uzgodniona organizacyjnie.','NISTCSF;KSC26'),
        task('P38','Zapisz luki jako wstępne, nie ostateczne','Dla każdej czerwonej flagi podaj źródło, pewność, możliwy wpływ i co trzeba jeszcze zbadać.','Rejestr hipotez/ustaleń i braków dowodowych.','ISO19011;ISO27005')]
    },
    {
      id:'P4', mode:'pre', title:'4. Raport wstępny i plan audytu pogłębionego',
      duration:'zamknięcie etapu wstępnego', owner:'Audytor wiodący + sponsor',
      goal:'Przekazać realny obraz środowiska i ustalić dalsze priorytety.',
      gate:'Zatwierdzony raport wstępny, rejestr niewiadomych i uzgodniony plan audytu zasadniczego.',
      tasks:[
        task('P41','Przedstaw architekturę w wersji AS-IS','Pokaż fizyczne lokalizacje, logiczne strefy, krytyczne usługi i łańcuch dostaw; oznacz elementy niepotwierdzone.','Diagram i rejestr niepotwierdzonych założeń.','NISTCSF'),
        task('P42','Zidentyfikuj quick wins i sytuacje pilne','Oddziel decyzje wymagające działania dziś od strategicznych projektów; zidentyfikuj wpływ na produkcję.','Lista 24-72 h, 30 dni, 90 dni (terminy robocze, nie ustawowe).','ISO27005'),
        task('P43','Przekaż ograniczenia wiarygodności','Podaj, czego nie sprawdzano: zewnętrznego IP, cloud tenancy, OT, dostawcy, podsystemów i dlaczego.','Rozdział „Ograniczenia i zastrzeżenia”.','ISO19011'),
        task('P44','Zaprojektuj formalny program audytu','Na podstawie krytyczności i wymagań prawnych zaplanuj wywiady, próbki, testy, dokumenty i pracę ekspertów.','Plan audytu zasadniczego + wymagania dostępu.','ISO19011;NIST115'),
        task('P45','Zrób read-out kierownictwu','Zatwierdź status działań awaryjnych, właścicieli ustaleń i deadline na uzupełnienie dokumentów.','Protokół prezentacji oraz akceptacja planu.','ISO19011')]
    },
    {
      id:'F0', mode:'full', title:'5. Kryteria, zgodność i program audytu zasadniczego',
      duration:'przygotowanie audytu zgodności', owner:'Audytor wiodący + compliance + IOD',
      goal:'Ustalić z jakim konkretnie wymaganiem porównujemy stan faktyczny.',
      gate:'Macierz wymagań zatwierdzona i powiązana z testami oraz dowodami.',
      tasks:[
        task('F01','Ustal właściwą podstawę prawną i datę','Zweryfikuj obowiązywanie KSC (z nowelizacją), kategorię podmiotu, okresy przejściowe, akty wykonawcze, regulacje branżowe, RODO i umowy.','Karta kwalifikacji + źródła/wersje/daty i osoba zatwierdzająca.','KSC26;NIS2;GDPR;DORA;CRA'),
        task('F02','Rozdziel obowiązek od benchmarku','Oznacz każdy punkt: prawo, norma umowna/certyfikacyjna, wewnętrzna polityka lub rekomendacja; nie nazywaj CIS obowiązkiem prawa.','Macierz wymagań z kolumną „typ kryterium”.','ISO27001;KSC26'),
        task('F03','Zbadaj sektorowe dodatki','Jeśli dotyczy: 2024/2690 dla określonych usług cyfrowych, DORA dla finansów, OT, tajemnice sektorowe, wymogi kontraktowe, CRA dla producentów.','Decyzja o aktywacji modułów specjalnych i podstawy.','EU2690;DORA;CRA;KSC26'),
        task('F04','Przygotuj Statement of Applicability (jeśli ISO)','Dla formalnego audytu ISO 27001 zbierz SoA i uzasadnienia uwzględnienia/wykluczenia kontroli; wykorzystaj licencjonowany tekst normy.','Wersja SoA, data, właściciel; bez kopiowania treści ISO.','ISO27001;ISO27002'),
        task('F05','Zdefiniuj ocenę wdrożenia i skuteczności','Dla każdej kontroli sprawdź projekt, wdrożenie, działanie w wybranym okresie i skuteczność; oceny: Zgodne / Niezgodne / Częściowe / N/D / N/O.','Metodyka testów, liczebności próbek i kryteria wyników.','ISO19011;NIST115'),
        task('F06','Zaplanuj próbkowanie i próg pewności','Pełny przegląd krytycznych kont i systemów, dobrana próba innych jednostek; opis doboru i ograniczeń; przy przepisach bez próbkowania spełnij wymóg.','Plan doboru próbek i uzasadnienie liczebności.','ISO19011'),
        task('F07','Wprowadź numerację dowodów i wymagań','Każdy test ma ID, właściciela, kryterium, datę, próbę, wynik, dowód i recenzenta; tworzenie spójnego audit trail.','Rejestr testów i dowodów, katalog dokumentów.','ISO19011'),
        task('F08','Potwierdź RoE dla testów technicznych','Odnowienie zgody na skany, testy aplikacji, ocenę podatności i kontrolę ruchu; ocena ryzyka zakłóceń.','Podpisane RoE na konkretny okres i hosty.','NIST115','all','approval')]
    },
    {
      id:'F1', mode:'full', title:'6. Ład, SZBI, ryzyko i ludzie',
      duration:'pełny audyt zarządzania', owner:'Zarząd + CISO + HR + IOD',
      goal:'Sprawdzić nie tylko dokumenty, lecz stosowanie decyzji o ryzyku.',
      gate:'Dowody działającego zarządzania i zatwierdzony rejestr ryzyk.',
      tasks:[
        task('F11','Zbadaj role kierownictwa','Sprawdź decyzje, odpowiedzialności, zasoby, przeglądy zarządcze, szkolenia kierownictwa i nadzór nad działaniami.','Protokoły, zatwierdzenia, decyzje budżetowe, role.','KSC26;NIS2;ISO27001'),
        task('F12','Przejrzyj politykę i cele bezpieczeństwa','Polityki zatwierdzone, aktualizowane, dostępne pracownikom i powiązane z mierzalnymi celami oraz wyjątkami.','Wersje dokumentów + dowód komunikacji + KPI.','ISO27001;EU2690'),
        task('F13','Zbadaj analizę ryzyka','Metoda, apetyt na ryzyko, właściciele, aktywa, scenariusze, wpływ, prawdopodobieństwo, środki i decyzje akceptacyjne.','Metodyka + aktualny rejestr + przeglądy.','ISO27005;KSC26;NIS2'),
        task('F14','Zbadaj nadzór nad wyjątkami','Czy wyjątki mają uzasadnienie, datę wygaśnięcia, kompensację i akceptację uprawnionej osoby?','Rejestr wyjątków i dowody monitoringu.','ISO27001;ISO27005'),
        task('F15','Weryfikuj onboarding/offboarding','Na próbie losowo dobranych odejść i zatrudnień zweryfikuj terminy odcięcia dostępów, szkolenia, NDA, zwroty sprzętu.','Zanonimizowane próbki HR/IAM i zlecenia.','CIS81;ISO27002'),
        task('F16','Sprawdź szkolenia i phishing awareness','Zbadaj skuteczność programu: tematy, frekwencję, testy i działania po niepowodzeniach; kampanię phishingową tylko po zgodzie.','Plan, lista zaliczeń, wyniki szkoleń; oddzielne RoE dla symulacji.','NIS2;CIS81'),
        task('F17','Zbadaj niezależność audytu i działania korygujące','Zweryfikuj wcześniejsze ustalenia, niezależne przeglądy, terminy oraz evidence of closure.','Plan audytu wewnętrznego, protokoły, CAPA.','ISO19011;ISO27001;KSC26'),
        task('F18','Sprawdź zmiany prawne i zgodność','Kto monitoruje zmiany KSC, RODO, DORA, kontraktów i wymagań organów? Zweryfikuj rejestr i aktualizacje procedur.','Rejestr compliance, decyzje właścicieli, monitoring zmian.','KSC26;GDPR;DORA')]
    },
    {
      id:'F2', mode:'full', title:'7. Tożsamość, konta i bezpieczeństwo dostępu',
      duration:'pełna próba IAM', owner:'IAM / IT + biznes',
      goal:'Dowiedzieć się kto ma dostęp, dlaczego i czy można go nadużyć.',
      gate:'Zidentyfikowane wszystkie ścieżki uprawnień krytycznych i wyniki przeglądu dostępów.',
      tasks:[
        task('F21','Zbadaj cykl życia kont','Porównaj stan IAM/AD/IdP i HR; identyfikuj konta osierocone, nieaktywne, techniczne, współdzielone i tymczasowe.','Listy z pseudonimami, daty, zatwierdzenia, próby.','CIS81;ISO27002'),
        task('F22','Zbadaj przywileje administracyjne','Zbierz adminów domenowych, lokalnych, cloud root, hypervisor i urządzeń sieciowych; zweryfikuj podział obowiązków i PAM.','Matryca ról, uprawnienia i przeglądy 100% kont krytycznych (zalecenie).','CIS81;NISTCSF'),
        task('F23','Zbadaj MFA i dostęp warunkowy','Przetestuj konfigurację wyjątków, kont break-glass, odzyskiwanie tożsamości, wymuszanie dla dostawców i dostępów zdalnych.','Polityki, wyjątki i zapisy prób logowania (bez tokenów).','CIS81;NISTCSF'),
        task('F24','Sprawdź konta usługowe i sekrety','Zidentyfikuj właściciela, rotację, uprawnienia, składowanie sekretów i zależności kont usługowych od aplikacji.','Zanonimizowany rejestr kont i polityki vault.','CIS81;ISO27002'),
        task('F25','Przejrzyj okresowe recertyfikacje','Sprawdź cykl recertyfikacji dostępów do finansów, danych osobowych i systemów krytycznych; udokumentuj usunięcia.','Raporty recertyfikacji, decyzje właściciela.','ISO27001;CIS81'),
        task('F26','Sprawdź kontrolę dostępu fizycznego','Jak chronione są serwerownia, szafy, kopie offline, przepustki i dostęp firm serwisowych?','Log wejść i wyjść, procedura gości, plan stref.','ISO27002')]
    },
    {
      id:'F3', mode:'full', title:'8. Sieci, hosty, wirtualizacja i chmura',
      duration:'ocena konfiguracji i próbek', owner:'NetOps + SecOps + CloudOps',
      goal:'Zweryfikować skuteczność architektury i konfiguracji zabezpieczeń.',
      gate:'Powiązane z dowodami wyniki dla stref, urządzeń, systemów i usług.',
      tasks:[
        task('F31','Zweryfikuj architekturę i granice zaufania','Oceń VLAN/ACL/firewall/east-west, sieć gościnną, Wi-Fi/IoT, DMZ, strefy zarządzania i łączność z dostawcami.','Topologia AS-IS, reguły, testy ścieżek przez administratora.','CIS81;NISTCSF'),
        task('F32','Przeglądaj reguły firewall i NAT','Sprawdź potrzebę biznesową, ownera, zakres źródło-cel-port, reguły szersze niż trzeba, zdalny admin i przestarzałe wpisy.','Redagowany eksport reguł i rejestr wyjątków.','CIS81'),
        task('F33','Zbadaj zarządzanie urządzeniami sieciowymi','Firmware, dostęp tylko z mgmt VLAN, AAA, MFA gdzie wspierane, SSH/TLS, backup config, logowanie, NTP i SNMP.','Zrzuty konfiguracyjne po usunięciu sekretów.','CIS81'),
        task('F34','Zbadaj hardening serwerów i endpointów','Baseline OS, patching, AV/EDR, szyfrowanie, firewall hosta, LAPS, ochrona przed zmianą, usługi zbędne.','Próbki konfigów i wyniki benchmarku dostosowanego do OS.','CIS81;NISTCSF'),
        task('F35','Zbadaj wirtualizację i storage','Role hypervisora, odporność, dostęp do konsol, backup konfiguracji, snapshot lifecycle, datastore, oddzielenie backup i produkcji.','Zrzuty ustawień, wykaz hostów, polityki i próbki.','CIS81'),
        task('F36','Zbadaj usługę pocztową i domeny','SPF, DKIM, DMARC (dopasowanie do modelu poczty), TLS, MFA admina, kopie, uprawnienia DNS i rejestratora.','Przegląd rekordów i konfiguracji administracyjnych.','CIS81;NISTCSF'),
        task('F37','Zbadaj usługi chmurowe i SaaS','Lista tenantów, root/admin, logi, klucze, polityki dostępu, udostępnienia, szyfrowanie, regiony i umowy odpowiedzialności.','CSPM / eksport konfiguracji, macierz shared responsibility.','CIS81;NISTCSF','cloud'),
        task('F38','Zbadaj bezpieczny zdalny dostęp','Koncentratory VPN/ZTNA, MFA, split tunneling według ryzyka, konta dostawców, dostęp serwisowy i retencja logów.','Polityki, logi logowania z anonimizacją, lista wyjątków.','CIS81'),
        task('F39','Zbadaj poprawki i podatności w praktyce','Sprawdź SLA dla CVE/KEV, skany uwierzytelnione tylko za zgodą, priorytetyzację i dowody eliminacji podatności.','Raport skanera + próbka ticketów i ponownego testu.','NIST115;CIS81','all','approval'),
        task('F310','Zbadaj backupy konfiguracji sieci','Czy możliwy jest odtworzenie konfiguracji firewall, switchy, AP, IdP i kluczowego SaaS? Uwzględnij offsite i kontrolę dostępu.','Wykaz kopii konfiguracyjnych, test restore.','CIS81')]
    },
    {
      id:'F4', mode:'full', title:'9. Wykrywanie, incydenty, ciągłość i odtwarzanie',
      duration:'test dowodowy procesów', owner:'SOC / IT / BCM',
      goal:'Sprawdzić zdolność wykrycia awarii lub ataku oraz powrotu do działania.',
      gate:'Potwierdzone czasy, odpowiedzialności, wyniki testów i brakujące elementy.',
      tasks:[
        task('F41','Sprawdź pokrycie telemetrii','Oceń logi EDR/IdP/AD/firewall/WAF/hypervisor/chmura, synchronizację, ochronę przed modyfikacją, retencję i ścieżki alertów.','Matryca źródeł i dowody alertów.','CIS81;NISTCSF'),
        task('F42','Sprawdź triage i eskalację alertów','Przejrzyj próbę incydentów i alertów: kto, kiedy, na podstawie jakich decyzji, do kogo eskalował.','Zanonimizowane tickety, timeline, playbook.','NISTCSF;KSC26'),
        task('F43','Sprawdź gotowość do raportowania KSC/RODO/DORA','Odrębne procesy kwalifikacji zdarzeń, moment wykrycia, odpowiedzialność i kanały raportowe; stosuj właściwy reżim i wyjątki.','Drzewo decyzyjne, wykaz osób, przykłady symulacji.','KSC26;NIS2;GDPR;DORA'),
        task('F44','Zbadaj kopie zapasowe od strony odtworzeń','Porównaj krytyczne procesy z RTO/RPO, izolację kopii, odporność na ransomware, test odtworzenia, kto zna klucze.','Raport restore i porównanie z RTO/RPO.','NISTCSF;CIS81'),
        task('F45','Sprawdź BIA, BCP i DRP','Czy plany obejmują utratę lokalizacji, dostępów, Internetu, dostawców, tożsamości, personelu i kluczowych danych?','BIA/BCP/DRP, wyniki ćwiczeń i poprawki.','NISTCSF;KSC26'),
        task('F46','Przeprowadź ćwiczenie tabletop','Rozważ ransomware, awarię IdP lub utratę dostawcy; dokumentuj czas decyzji, bariery i zadania. Nie wyłączaj produkcji.','Protokół tabletop i CAPA.','NISTCSF;ISO19011'),
        task('F47','Sprawdź komunikację kryzysową','Zbadaj szablony powiadomień kierownictwa, klientów, IOD, CSIRT i komunikacji do mediów; sprawdź aktualność kontaktów.','Matryca eskalacji, szablony i przeprowadzony test kontaktu.','KSC26;GDPR;NISTCSF'),
        task('F48','Zweryfikuj ścieżkę po incydencie','RCA, post-incident review, lessons learned, aktualizacja kontroli i nadzór nad ryzykiem rezydualnym.','Dokument RCA i dowody wdrożenia rekomendacji.','ISO27001;NISTCSF')]
    },
    {
      id:'F5', mode:'full', title:'10. Dostawcy, dane, aplikacje, DevSecOps',
      duration:'audyt wybranych procesów i aplikacji', owner:'Zakupy + IOD + AppOps + DevOps',
      goal:'Prześledzić ryzyko od dostawców i danych aż po wdrożenie aplikacji.',
      gate:'Dowody zgodności umów, procesów danych i bezpieczeństwa cyklu życia aplikacji.',
      tasks:[
        task('F51','Oceń krytycznych dostawców ICT','Kryteria krytyczności, umowy, SLA, powiadamianie o incydentach, audyty dostawców, exit plan i subcontractorów.','Rejestr dostawców, umowy / DPA i oceny okresowe.','NIS2;KSC26;EU2690'),
        task('F52','Sprawdź przetwarzanie danych osobowych','Rejestr czynności, podstawy udostępnień, role administrator/procesor, minimalizacja, retencja, prawa osób, dostęp i naruszenia.','Uzgodniony z IOD rejestr procesów i próbki.','GDPR'),
        task('F53','Sprawdź bezpieczeństwo danych','Klasyfikacja, retencja, szyfrowanie w tranzycie/spoczynku, DLP gdy uzasadnione, bezpieczne niszczenie.','Próbki polityk i ustawień oraz umowy z dostawcami.','GDPR;ISO27002'),
        task('F54','Zbadaj secure SDLC','Kontrole zmian, przeglądy kodu, zależności, tajne klucze, CI/CD, separację dev/test/prod i rollback.','Rejestr wdrożeń, konfiguracje pipeline i przykładowe PR.','OWASPASVS;CIS81','apps'),
        task('F55','Oceń testy aplikacji','Przypisz wybrane wymagania OWASP ASVS 5.0, zbadaj IAM, sesje, walidację danych i API; aktywne testy po RoE.','Arkusz testów aplikacji, dowody zredagowane.','OWASPASVS;OWASPWSTG','apps','approval'),
        task('F56','Sprawdź API i integracje','Konta techniczne, rotacja kluczy, ograniczenia uprawnień, rate limiting, logi, integracje z dostawcami i monitorowanie.','Lista endpointów, architektura i wynik kontroli.','OWASPASVS;NISTCSF','apps'),
        task('F57','Sprawdź zarządzanie zmianą i konfiguracją','Weryfikacja zmian awaryjnych, CAB, testów, rollback, rozdziału uprawnień i integracji z CMDB.','Próba ticketów i logów zmian.','ISO27001;CIS81'),
        task('F58','Zbadaj OT/ICS bez ingerencji','Jeśli OT: segmentacja, zdalny serwis, asset owners, kopie logic, safety, dostawcy i ograniczenia skanów; konsultacja z inżynierem procesowym.','Mapa OT, plan safety, deklaracja dozwolonych testów.','NISTCSF;KSC26','ot','approval')]
    },
    {
      id:'F6', mode:'full', title:'11. Wyniki, raport formalny i zamknięcie audytu',
      duration:'po zebraniu dowodów', owner:'Audytor + właściciele + kierownictwo',
      goal:'Dowieść wniosków, zapewnić rozliczalność i przekazać plan naprawczy.',
      gate:'Raport podpisany, CAPA zaakceptowane, ryzyko rezydualne rozliczone; zaplanowany follow-up.',
      tasks:[
        task('F61','Zamknij rejestr próby i dowodów','Sprawdź referencje, wersje plików, daty, hash wrażliwych dowodów, ograniczenia i zgodność z planem próbkowania.','Zamknięty indeks dowodów i lista braków.','ISO19011'),
        task('F62','Zweryfikuj każde ustalenie z właścicielem','Przedyskutuj fakty, warunki, ryzyko, dowód i potencjalny wpływ; oddziel spór o fakty od zgody na ryzyko.','Zapis spotkania walidacyjnego i ewentualne kontrdowody.','ISO19011'),
        task('F63','Oceń ryzyko i niezgodności','Dla każdej pozycji: kryterium, stan faktyczny, dowód, skutki, prawdopodobieństwo, stan kontroli, ryzyko rezydualne i priorytet.','Rejestr ryzyk/niezgodności; uzasadnienie ocen.','ISO27005;ISO19011'),
        task('F64','Nie przekraczaj zakresu opinii','Sformułuj wniosek osobno o badanym obszarze i zgodności kryteriów; wyjaśnij, czy audyt ustawowy ma formalne umocowanie.','Sekcja „Zakres opinii, wyłączenia, poziom zapewnienia”.','ISO19011;KSC26'),
        task('F65','Złóż raport dwu-poziomowy','Executive summary: 5 najważniejszych ryzyk, pokrycie, decyzje i koszt; część techniczna: metodyka, próbki, wykaz testów, dowody.','Raport końcowy + annex techniczny o ograniczonej dystrybucji.','ISO19011'),
        task('F66','Uzgodnij plan działań CAPA','Działanie, właściciel, termin, koszt, zależności, kryterium zamknięcia, dowód i alternatywne środki kompensujące.','Podpisana tabela CAPA i plan retestów.','ISO27001;ISO27005'),
        task('F67','Zapisz decyzje akceptacji ryzyka','Każde ryzyko przekraczające tolerancję ma akceptację właściwej osoby lub plan naprawy; odrębnie obowiązki niepodlegające „akceptacji”.','Rejestr decyzji i eskalacji.','ISO27005;KSC26'),
        task('F68','Przekaż wyniki i ustanów follow-up','Spotkanie zamykające, wersjonowanie raportu, retencja dowodów, termin retestu i kolejny cykl formalnego audytu.','Protokół zamknięcia, lista odbiorców, data follow-up.','ISO19011;KSC26')]
    }
  ];

  const criteria = [
    {id:'KSC-01', type:'Prawo PL', title:'Zakwalifikowanie podmiotu kluczowego lub ważnego', apply:'Polska; po potwierdzeniu kategorii i sektora', source:'KSC26', verify:'Analiza rodzaju usług, sektorów, wielkości, wyjątków; decyzja prawna i data kwalifikacji.', evidence:'Opis usług, dane grupy, kody działalności, opinia compliance.'},
    {id:'KSC-02', type:'Prawo PL', title:'Wpis do Wykazu KSC', apply:'Podmioty objęte przepisami, z uwzględnieniem wpisu z urzędu i terminów', source:'KSC26', verify:'Czy jest wpis, właściwe dane i utrzymanie aktualności; jeśli termin minął: odnotuj potencjalną zaległość.', evidence:'Potwierdzenie wpisu, odpowiedzialny, numer i data.'},
    {id:'KSC-03', type:'Prawo PL', title:'SZBI i środki zarządzania ryzykiem', apply:'Podmioty kluczowe/ważne wg obowiązujących terminów', source:'KSC26', verify:'Sprawdź polityki, ryzyka, procesy, technikę i dowody skuteczności; nie ograniczaj się do istnienia dokumentu.', evidence:'SZBI, analiza ryzyka, plan postępowania i testy.'},
    {id:'KSC-04', type:'Prawo PL', title:'S46 / właściwy kanał zgłaszania', apply:'Podmioty kluczowe/ważne wg terminów i wyjątków', source:'CERT26', verify:'Czy organizacja ma użytkowników, uprawnienia, kontakty i procedurę zgłoszenia do właściwego CSIRT.', evidence:'Potwierdzenie dostępu, RACI, ćwiczenie procesowe.'},
    {id:'KSC-05', type:'Prawo PL', title:'Raportowanie incydentów poważnych', apply:'Kwalifikacja i wyjątki zależne od podmiotu, sektora i daty', source:'CERT26', verify:'Scenariusz 24h wczesne ostrzeżenie, 72h zgłoszenie, sprawozdanie do miesiąca; uwzględnij wyjątki dla części podmiotów publicznych i DORA.', evidence:'Zatwierdzony playbook, timeline ćwiczenia, aktualne progi.'},
    {id:'KSC-06', type:'Prawo PL', title:'Formalny audyt podmiotu kluczowego', apply:'Jeśli podmiot jest kluczowy: zróżnicowane terminy historyczne', source:'KSC26', verify:'Sprawdź status byłego UOK, datę ostatniego audytu, uprawnienia audytora, zakres ustawowy i cykl 3 lata.', evidence:'Raport, data podpisu, mandat, kwalifikacje audytorów.'},
    {id:'NIS2-21', type:'Dyrektywa UE', title:'Art. 21 ust. 2, obszary środków zarządzania ryzykiem', apply:'Punkt odniesienia; stosuj właściwą implementację krajową', source:'NIS2', verify:'Ryzyko, incydenty, BCP, łańcuch dostaw, bezpieczne systemy, skuteczność, higiena, kryptografia, HR i dostęp, MFA/komunikacja.', evidence:'Macierz polityk, procedur, wdrożenia i dowodów.'},
    {id:'NIS2-20', type:'Dyrektywa UE', title:'Art. 20, odpowiedzialność kierownictwa', apply:'Podmioty w zakresie NIS2 i implementacji PL', source:'NIS2', verify:'Zatwierdzenia kierownictwa, nadzór, szkolenia, odpowiedzialności.', evidence:'Protokoły zarządu, plan szkoleń, wyznaczone role.'},
    {id:'EU-2690', type:'Rozporządzenie UE', title:'Szczegółowe wymagania 2024/2690', apply:'Tylko wymienione kategorie usług cyfrowych i zaufania', source:'EU2690', verify:'Dopasuj odpowiednie punktu załącznika i wymagania metodyczne do badanego podmiotu.', evidence:'Macierz punktów załącznika i osobne testy.'},
    {id:'RODO-32', type:'Rozporządzenie UE', title:'RODO art. 32: bezpieczeństwo przetwarzania', apply:'Gdy przetwarzane są dane osobowe', source:'GDPR', verify:'Kontrole odpowiednie do ryzyka dla osób, odtwarzanie, szyfrowanie i regularne testy.', evidence:'Ocena ryzyka, kontrole, testy, decyzje IOD.'},
    {id:'RODO-33', type:'Rozporządzenie UE', title:'RODO art. 33-34: naruszenia danych', apply:'Gdy wystąpi naruszenie ochrony danych osobowych', source:'GDPR', verify:'Osobna ocena ryzyka dla praw/wolności i zgłoszenie w odpowiednich terminach; nie mylić z KSC.', evidence:'Procedura naruszeń, rejestr, ćwiczenie.'},
    {id:'RODO-35', type:'Rozporządzenie UE', title:'RODO art. 35: DPIA', apply:'Gdy przetwarzanie prawdopodobnie powoduje wysokie ryzyko', source:'GDPR', verify:'Kryteria DPIA, zatwierdzone oceny skutków i plan redukcji ryzyka.', evidence:'DPIA i decyzje IOD.'},
    {id:'DORA-01', type:'Rozporządzenie UE', title:'DORA, cyfrowa odporność operacyjna', apply:'Właściwe podmioty sektora finansowego i wymogi sektorowe', source:'DORA', verify:'ICT risk, zgłaszanie incydentów, testowanie odporności, dostawcy i rejestry ICT; sektorowy zakres prawny.', evidence:'Dokumentacja DORA, rejestr dostawców, testy i raporty.'},
    {id:'CRA-01', type:'Rozporządzenie UE', title:'CRA, produkty z elementami cyfrowymi', apply:'Producent/importer/dystrybutor wg roli i etapów stosowania', source:'CRA', verify:'W 2026 raportowanie art. 14 od 11.09.2026, inne terminy zgodnie z art. 71; zbadaj produkt i rolę.', evidence:'Macierz odpowiedzialności produktu, podatności, raporty.'},
    {id:'ISO27001', type:'Norma (dobrowolna/umowna)', title:'ISO/IEC 27001:2022 + Amd 1:2024', apply:'Gdy zadeklarowano zgodność, cel certyfikacyjny lub wymóg umowny', source:'ISO27001', verify:'Pełne wymagania systemu zarządzania + SoA; używaj legalnej kopii normy.', evidence:'SZBI, SoA, polityki, wskaźniki, audyty i przegląd.'},
    {id:'ISO19011', type:'Wytyczne audytu', title:'ISO 19011:2026', apply:'Metodyka audytu systemów zarządzania', source:'ISO19011', verify:'Program, niezależność, kompetencje, próbki, dowody, komunikacja i raport.', evidence:'Program audytu, kompetencje, audit trail.'},
    {id:'ISO27005', type:'Wytyczne ryzyka', title:'ISO/IEC 27005:2022', apply:'Metodyka analizy ryzyka w organizacji', source:'ISO27005', verify:'Kontekst, identyfikacja, analiza, decyzje, leczenie, monitoring.', evidence:'Rejestr ryzyka i zatwierdzona metoda.'},
    {id:'NISTCSF', type:'Dobre praktyki', title:'NIST CSF 2.0', apply:'Uniwersalny model organizacyjny', source:'NISTCSF', verify:'Govern, Identify, Protect, Detect, Respond, Recover; profil obecny/docelowy.', evidence:'Profile, cele, plan luk i metryki.'},
    {id:'CIS81', type:'Dobre praktyki', title:'CIS Controls v8.1', apply:'Priorytety techniczne i organizacyjne; dobierz IG1/IG2/IG3', source:'CIS81', verify:'Zmapuj odpowiednie safeguardy do zasobów i dojrzałości; to nie domniemanie spełnienia prawa.', evidence:'Macierz safeguardów, próbki i wyniki.'},
    {id:'OWASPASVS', type:'Dobre praktyki', title:'OWASP ASVS 5.0.0', apply:'Aplikacje internetowe i API', source:'OWASPASVS', verify:'Dobierz poziom i wymagania do profilu ryzyka aplikacji.', evidence:'Arkusz testowy, wyniki appsec i retesty.'}
  ];

  const sources = [
    {id:'KSC26',title:'KSC, nowelizacja Dz.U. 2026 poz. 252 (ELI)',org:'Sejm / ELI',url:'https://eli.gov.pl/eli/DU/2026/252/ogl',type:'Prawo',verified:'04.11.2026',note:'Weszła w życie 03.04.2026; stosować wraz z aktualnym tekstem KSC i zmianami.'},
    {id:'KSC_TIMES',title:'Najważniejsze terminy nowelizacji KSC',org:'Ministerstwo Cyfryzacji',url:'https://www.gov.pl/web/cyfryzacja/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc--najwazniejsze-terminy',type:'Objaśnienie urzędowe',verified:'04.11.2026',note:'Wpis 03.10.2026; S46/SZBI 03.04.2027; formalny pierwszy audyt dla części podmiotów 03.04.2028.'},
    {id:'KSC_OBL',title:'Obowiązki podmiotów kluczowych i ważnych',org:'Ministerstwo Cyfryzacji',url:'https://www.gov.pl/web/cyfryzacja/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc---obowiazki-podmiotow-kluczowych-i-waznych',type:'Objaśnienie urzędowe',verified:'04.11.2026',note:'Ważne rozróżnienie audytu obowiązkowego u podmiotów kluczowych.'},
    {id:'KSC_MAP',title:'Zestawienie wymogów dokumentów normalizacyjnych do KSC',org:'Ministerstwo Cyfryzacji',url:'https://www.gov.pl/web/cyfryzacja/nowelizacja-ustawy-o-krajowym-systemie-cyberbezpieczenstwa-ksc---publikacja-zestawienia-wymogow-dokumentow-normalizacyjnych',type:'Urzędowe mapowanie pomocnicze',verified:'04.11.2026',note:'Publikacja 10.09.2026, charakter pomocniczy i informacyjny, nie stanowi samoistnego prawa.'},
    {id:'CERT26',title:'Zgłoszenie incydentu, aktualizacja 02.09.2026',org:'CERT Polska',url:'https://wiedza.cert.pl/obsluga-incydentow/zgloszenie/zgloszenie-incydentu/',type:'Wytyczne urzędowe',verified:'04.11.2026',note:'24/72 godzin, miesiąc; wyjątki części podmiotów publicznych, DORA i okres przejściowy.'},
    {id:'NIS2',title:'Dyrektywa (UE) 2022/2555, NIS2',org:'EUR-Lex',url:'https://eur-lex.europa.eu/eli/dir/2022/2555/oj?locale=pl',type:'Prawo UE (dyrektywa)',verified:'04.11.2026',note:'W szczególności art. 20, 21, 23, załączniki I/II; krajowa implementacja w Polsce.'},
    {id:'EU2690',title:'Rozporządzenie wykonawcze (UE) 2024/2690',org:'EUR-Lex',url:'https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32024R2690',type:'Prawo UE (rozporządzenie)',verified:'04.11.2026',note:'Szczegółowe wymogi wyłącznie wskazanych kategorii dostawców cyfrowych.'},
    {id:'ENISA25',title:'NIS2 Technical Implementation Guidance, 26.06.2025',org:'ENISA',url:'https://www.enisa.europa.eu/publications/nis2-technical-implementation-guidance',type:'Wytyczne',verified:'04.11.2026',note:'Przykłady dowodów i mapowania do rozporządzenia 2024/2690.'},
    {id:'GDPR',title:'RODO, rozporządzenie (UE) 2016/679',org:'EUR-Lex',url:'https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32016R0679',type:'Prawo UE',verified:'04.11.2026',note:'Art. 5, 24, 28, 30, 32-35; 72h art. 33 to osobna ścieżka od KSC.'},
    {id:'DORA',title:'DORA, przegląd przepisów i stosowania',org:'KNF',url:'https://www.knf.gov.pl/dla_rynku/DORA',type:'Prawo sektorowe',verified:'04.11.2026',note:'DORA stosuje się od 17.01.2025; uwzględnij szczególne przepisy nadzorcze.'},
    {id:'CRA',title:'Cyber Resilience Act (UE) 2024/2847',org:'EUR-Lex',url:'https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX:32024R2847',type:'Prawo UE',verified:'04.11.2026',note:'Art. 14 stosuje się od 11.09.2026, zasadniczo od 11.12.2027; sprawdzać rolę rynkową.'},
    {id:'ISO19011',title:'ISO 19011:2026, auditing management systems',org:'ISO',url:'https://www.iso.org/standard/19011',type:'Norma / wytyczne',verified:'04.11.2026',note:'Edycja 2026 zastępuje 2018; pełna treść licencjonowana.'},
    {id:'ISO27001',title:'ISO/IEC 27001:2022 (+ Amd 1:2024)',org:'ISO',url:'https://www.iso.org/standard/27001',type:'Norma',verified:'04.11.2026',note:'Wymagania SZBI; kopia pełnej normy jest płatna/licencjonowana.'},
    {id:'ISO27002',title:'ISO/IEC 27002:2022, information security controls',org:'ISO',url:'https://www.iso.org/standard/75652.html',type:'Norma',verified:'04.11.2026',note:'Wskazówki kontroli, nie stanowi samodzielnej certyfikacji.'},
    {id:'ISO27005',title:'ISO/IEC 27005:2022, risk management',org:'ISO',url:'https://www.iso.org/standard/80585.html',type:'Norma / wytyczne',verified:'04.11.2026',note:'Analiza i postępowanie z ryzykiem bezpieczeństwa informacji.'},
    {id:'NISTCSF',title:'NIST Cybersecurity Framework 2.0',org:'NIST',url:'https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20',type:'Framework',verified:'04.11.2026',note:'Sześć funkcji: GV, ID, PR, DE, RS, RC; orientacja na wyniki.'},
    {id:'NIST115',title:'NIST SP 800-115, Technical Guide to Security Testing',org:'NIST',url:'https://csrc.nist.gov/pubs/sp/800/115/final',type:'Metodyka testów',verified:'04.11.2026',note:'Planowanie testów, dowody, ograniczenia i analiza wyników.'},
    {id:'CIS81',title:'CIS Critical Security Controls v8.1',org:'CIS',url:'https://www.cisecurity.org/controls/v8-1',type:'Framework',verified:'04.11.2026',note:'Priorytety kontrolne, Implementation Groups zależnie od ryzyka/zasobów.'},
    {id:'OWASPASVS',title:'OWASP ASVS 5.0.0',org:'OWASP',url:'https://asvs.owasp.org/',type:'Standard aplikacyjny',verified:'04.11.2026',note:'Stabilna wersja 5.0.0 od 30.05.2025.'},
    {id:'OWASPWSTG',title:'OWASP Web Security Testing Guide 4.2 stable',org:'OWASP',url:'https://owasp.org/projects/web-security-testing-guide',type:'Metodyka testów',verified:'04.11.2026',note:'WSTG 4.2 stabilne; 5.0 w rozwoju.'}
  ];

  const examples = [
    {id:'EX-01', title:'Panel administracyjny z WAN', area:'Sieć / ekspozycja', risk:'4 × 4 = 16 (wysokie)',
     observation:'Przykład fikcyjny: serwer administracyjny dostępny publicznie przez niepotrzebny port-forward.',
     criterion:'Wewnętrzna polityka dostępu zdalnego + analiza ryzyka; referencja CIS Controls v8.1.',
     evidence:'E-012: zatwierdzony, zanonimizowany eksport reguły firewall; potwierdzenie właściciela usługi.',
     action:'Wycofaj zbędny NAT po sprawdzeniu zależności; administrację przenieś do VPN/ZTNA z MFA; po zmianie retest.',
     caution:'Nie usuwać reguły samodzielnie podczas audytu i nie skanować bez RoE.'},
    {id:'EX-02', title:'Kopie działają, brak testu odtworzenia', area:'Backup / ciągłość', risk:'3 × 5 = 15 (wysokie)',
     observation:'Przykład fikcyjny: harmonogram kopii jest regularny, lecz brak dowodu restore krytycznego systemu w ostatnim cyklu.',
     criterion:'Wewnętrzne RTO/RPO, plan BCP/DRP; dla danych osobowych rozważyć RODO art. 32.',
     evidence:'E-017: zagregowane logi backupów; brak protokołu testu; wywiad z właścicielem.',
     action:'Uzgodnij bezpieczny restore w izolowanym środowisku i podpisany protokół RTO/RPO.',
     caution:'Nie testować odtwarzania na produkcji bez osobnego planu i akceptacji.'}
  ];

  return {stages, criteria, sources, examples};
})();
