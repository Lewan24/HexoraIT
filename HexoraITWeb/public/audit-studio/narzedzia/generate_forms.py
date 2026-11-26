#!/usr/bin/env python3
"""Generowanie formularzy AcroForm PDF i edytowalnych wzorów Markdown.

Wymaga: pip install reportlab. Wszystkie dane formularzy poniżej można zmieniać.
W PDF pola są edytowalne w programach obsługujących standard AcroForm.
Edycja PDF nie jest tym samym co swobodna edycja układu. Do swobodnej przeróbki
użyj odpowiadającego pliku .md lub zmień ten skrypt i wygeneruj ponownie.
"""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import simpleSplit

ROOT=Path(__file__).resolve().parent.parent
OUTPDF=ROOT/'formularze_pdf'
OUTMD=ROOT/'szablony_edytowalne'
OUTPDF.mkdir(parents=True,exist_ok=True)
OUTMD.mkdir(parents=True,exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
if not Path(FONT).exists():
    raise SystemExit('Brak DejaVu Sans. Zmień FONT na czcionkę TTF z polskimi znakami.')
pdfmetrics.registerFont(TTFont('DV',FONT))
pdfmetrics.registerFont(TTFont('DV-Bold',BOLD))

# Krótkie typy pól: (id, etykieta, opis, wysokość pola)
# '60' oznacza większe pole wielowierszowe. Wszystkie pola są AcroForm.
DOCS = [
 dict(num='01',slug='mandat_i_roe',title='Mandat, zakres i Rules of Engagement',subtitle='Formularz upoważnienia do audytu oraz zasad prowadzenia testów',
 purpose='Zabezpiecza strony i produkcję przed nieuzgodnionymi czynnościami. Podpisy oraz własne zapisy kontraktowe należy dołączyć według obowiązującej procedury.',
 sections=[
 ('Tożsamość zlecenia',[
 ('projekt','ID audytu / numer umowy','Jednoznaczny identyfikator audytu.',32),('organ','Organizacja i osoba upoważniająca','Pełna nazwa oraz stanowisko osoby działającej w imieniu właściciela.',40),('audytor','Audytor / wykonawca / osoby','Zespół, kontakt i uprawnienia.',40),('cel','Cel i rodzaj audytu','Rozpoznawczy, zgodności, wewnętrzny, techniczny, inny.',48)]),
 ('Zakres i ograniczenia',[
 ('scope_in','IN: obiekty, adresy, domeny, urządzenia, chmury','Wymień systemy, lokalizacje, firmy; brak pozycji oznacza brak autoryzacji.',65),('scope_out','OUT: systemy wyłączone i ograniczenia','Zapisz wykluczenia, dostawców, OT i usługi krytyczne.',60),('czas','Termin, okna testów i zmiany','Strefa czasowa, numery zmian, harmonogram.',44),('metody','Dozwolone metody','Pasywne, read-only; osobno skan, test aplikacji lub penetracja.',56)]),
 ('Bezpieczne wykonanie',[
 ('zakazy','Zakazane techniki / limity','Np. DoS, stres, credential attacks, phishing, agresywne skanowanie, zmiany konfiguracji.',70),('stop','Stop-test: wyzwalacze i rollback','Jak przerwać pracę, kto może tego zażądać, gdzie zgłosić awarię.',65),('kontakt','Kontakty pilne i eskalacja','Kontakt właściciela systemu, SOC, kierownictwa, telefonu dyżurowego.',54),('dane','Poufność, retencja i usuwanie dowodów','Klasyfikacja, repozytorium, uprawnienia, szyfrowanie, terminy.',60)]),
 ('Akceptacja zakresu',[
 ('zgody','Zakres zatwierdzonych zgód i podpisy','Sponsor, właściciele zakresu, wykonawca; data, wersja, sposób akceptacji.',62),('ograniczenie','Warunki ważności dokumentu','Brak zgody na testy poza IN; zmiana zakresu wymaga nowego podpisu.',45)])]),
 dict(num='02',slug='kontekst_i_zakres',title='Karta kontekstu i kwalifikacji',subtitle='Profil organizacji, usługi krytyczne, obowiązki i kryteria',
 purpose='Wyznacza granice obowiązków prawnych. Kwalifikacja KSC/NIS2 musi uwzględnić sektor, wielkość, strukturę podmiotu, wyjątki i datę wejścia w obowiązek.',
 sections=[
 ('Organizacja i procesy',[
 ('organ','Nazwa, lokalizacja, forma i grupa kapitałowa','Ważne przy analizie kryteriów wielkościowych i powiązań.',52),('scope','Jednostki, lokalizacje, spółki i usługi IN/OUT','Co obejmuje ten konkretny audyt.',66),('procesy','Krytyczne usługi oraz właściciele biznesowi','Jakie usługi zostałyby zatrzymane przez awarię IT.',68),('dostawcy','Kluczowe zależności od ICT / chmury / OT','Usługi i miejsca przechowywania danych.',48)]),
 ('Kwalifikacja regulacyjna',[
 ('status_ksc','KSC: kluczowy / ważny / nie / nieustalone','Wskaż podstawę i uzasadnij wynik, nie oznaczaj automatycznie wszystkich firm.',55),('art_sektor','Sektory, kryteria wielkościowe, wyjątki','Przypis do ustawy, załączników i decyzji prawnej.',60),('historia','Czy wcześniej UOK? Kiedy spełniono kryteria?','Ma wpływ na datę obowiązkowego audytu.',40),('wpis','Wpis do Wykazu KSC: data / status / dowód','Potwierdzenie wpisu lub zaległości, jeżeli dotyczy.',46),('s46','S46 i właściwy CSIRT: stan / osoby','Obowiązki i terminy właściwe dla podmiotu.',50),('inne','RODO / DORA / 2024/2690 / CRA / sektor / umowy','Kwalifikacja poszczególnych reżimów oddzielnie.',67)]),
 ('Decyzja',[
 ('termin','Właściwe terminy i źródła (z datami)','Nie przenoś automatycznie dat przejściowych na nowe podmioty.',60),('decyzja','Weryfikował / zatwierdził / data','Audytor + prawnik/compliance + właściciel procesów.',46)])]),
 dict(num='03',slug='inwentarz_sieci',title='Inwentarz sieci i zasobów',subtitle='Punkt startowy CMDB, diagramów oraz analizy zależności',
 purpose='Rozpoznanie infrastruktury z odróżnieniem faktu od przypuszczenia. Właściciele oraz nieznane urządzenia powinny być jawnie zaznaczone.',
 sections=[
 ('Kontekst sieci',[
 ('lokalizacje','Lokalizacje, WAN, ISP, łącza zapasowe','Opisz miejsca i zależności zewnętrzne.',58),('strefy','VLAN / podsieci / strefy / VPN / Wi-Fi / OT','Wpisz lokalne i zdalne segmenty, strefę zarządzania.',72),('diagram','Dokument / lokalizacja diagramu AS-IS','Wskaż ścieżkę pliku i datę potwierdzenia.',45)]),
 ('Przykładowy spis zasobów - uzupełniaj w osobnej tabeli CSV',[
 ('a1','Zasób 1: ID / model / rola / IP / właściciel / wersja','Status utrzymania, krytyczność i stan potwierdzenia.',60),('a2','Zasób 2: ID / model / rola / IP / właściciel / wersja','',60),('a3','Zasób 3: ID / model / rola / IP / właściciel / wersja','',60),('a4','Zasób 4: ID / model / rola / IP / właściciel / wersja','',60),('a5','Zasób 5: ID / model / rola / IP / właściciel / wersja','',60)]),
 ('Luki w inwentaryzacji',[
 ('luki','Nieznani właściciele, NAT, EOL, VM, SaaS, IoT','Dla każdej luki zapisz właściciela działania i termin.',70),('zrodla','Źródła danych / data weryfikacji / metoda','CMDB, DHCP, firewall, switch, EDR, hypervisor itp.',55)])]),
 dict(num='04',slug='rejestr_dowodow',title='Rejestr dowodów i próbkowania',subtitle='Ścieżka dowodowa i spójność wniosków',
 purpose='Numeruj dowody i zapisuj pochodzenie, czas, próbę, integralność i dostęp. Nie przechowuj haseł ani pełnych danych osobowych, jeśli nie jest to konieczne.',
 sections=[
 ('Parametry pozyskania',[
 ('zadanie','ID testu / kryterium / audytor','Powiąż z checklistą i wymaganiem.',55),('populacja','Populacja i dobór próby','Ile obiektów, jak wybrano, jakie wyłączenia i ograniczenia.',62),('reguly','Retencja, klasyfikacja, dostęp','Zasady bezpiecznego przechowywania i redakcji.',60)]),
 ('Dowody - w razie potrzeby rozszerz arkusz',[
 ('e1','E-001: nazwa, źródło, data, opiekun, wynik','Wskaż hash (jeśli zasadny), lokalizację i dostęp.',60),('e2','E-002: nazwa, źródło, data, opiekun, wynik','',60),('e3','E-003: nazwa, źródło, data, opiekun, wynik','',60),('e4','E-004: nazwa, źródło, data, opiekun, wynik','',60),('e5','E-005: nazwa, źródło, data, opiekun, wynik','',60),('e6','E-006: nazwa, źródło, data, opiekun, wynik','',60)]),
 ('Wnioski',[
 ('luki','Brakujące / sprzeczne dowody i ograniczenia','Wniosek wymagający kontrdowodu lub dodatkowej próby.',63),('recenzja','Przejrzał/a, data, decyzja','Peer review lub zatwierdzenie audytora wiodącego.',42)])]),
 dict(num='05',slug='rejestr_ryzyka',title='Rejestr ryzyka i niezgodności',subtitle='Prowadzenie ustaleń, weryfikacji i postępowania z ryzykiem',
 purpose='Każda pozycja powinna wskazywać kryterium, stan, dowód, ryzyko, rekomendację, właściciela i retest. Skala 5x5 wymaga uzgodnienia z organizacją.',
 sections=[
 ('Ustalenie nr 1',[
 ('f1_id','ID, obszar, kryterium i rodzaj','Prawo / polityka / norma / dobra praktyka.',51),('f1_fact','Stan faktyczny i granice próby','Opisz obserwację bez nadinterpretacji.',68),('f1_ev','Dowód E-..., źródło, data i pewność','Powiązanie z rejestrem dowodów.',51),('f1_risk','Scenariusz, P (1-5), W (1-5), wynik, wpływ','Ocena przed/po kontroli i uzasadnienie.',70),('f1_action','Działanie, owner, termin, retest / akceptacja','Przy obowiązku prawnym nie zastępuj realizacji samą akceptacją ryzyka.',68)]),
 ('Ustalenie nr 2',[
 ('f2_id','ID, obszar, kryterium i rodzaj','',51),('f2_fact','Stan faktyczny i granice próby','',68),('f2_ev','Dowód E-..., źródło, data i pewność','',51),('f2_risk','Scenariusz, P (1-5), W (1-5), wynik, wpływ','',70),('f2_action','Działanie, owner, termin, retest / akceptacja','',68)]),
 ('Weryfikacja',[
 ('kontr','Kontrdowody / uwagi właściciela / status sporu','Nie usuwać uwag, nawet gdy audytor się z nimi nie zgadza.',65),('zatwierdzenie','Rejestr zatwierdził / data / wersja','Przekazanie do CAPA.',42)])]),
 dict(num='06',slug='raport_wstepny',title='Raport audytu wstępnego',subtitle='Wyniki rozpoznania i decyzja o kolejnym etapie',
 purpose='Raport służy do poznania środowiska, identyfikacji pilnych ryzyk i zaplanowania pełnego audytu. Nie zawiera domniemania zgodności z KSC lub ISO.',
 sections=[
 ('Strona tytułowa i metoda',[
 ('organ','Organizacja, ID, okres, wykonawca','Wersja raportu i odbiorcy.',55),('cel','Cele i badany zakres','Jednostki, usługi, technologie, lokalizacje.',68),('metoda','Metody: wywiad / dokumenty / read-only','Czego nie testowano, dlaczego i na jakim dowodzie oparto opis.',68)]),
 ('Obraz obecny',[
 ('uslugi','Usługi krytyczne i najważniejsze zależności','Ownerzy, dostawcy, wpływ na działalność.',68),('network','Topologia wysokiego poziomu i zidentyfikowane zasoby','Podsieci, segmenty, NAT, WAN, serwery, chmura, Wi-Fi, OT.',77),('pokrycie','Pokrycie i nieznane obszary','Brak dostępu, niepotwierdzone założenia, brak CMDB.',72)]),
 ('Ustalenia i plan',[
 ('redflags','Do 5 najpilniejszych ryzyk / czerwonych flag','ID ustalenia, dowód, wpływ, owner.',84),('quick','Quick wins i decyzje krytyczne','Działanie, właściciel, termin; nie zmieniaj produkcji bez zmiany zatwierdzonej.',71),('plan','Plan audytu właściwego: obszary, próba, zasoby','Wymagane dostępny / zgody / dokumenty / czas.',75),('wniosek','Wniosek i poziom pewności','Wyraźnie odróżnij fakt, przypuszczenie i brak dowodu.',65)]),
 ('Odbiór',[
 ('podpis','Data, audytor, sponsor, uwagi odbiorcy','Podpis lub elektroniczne potwierdzenie zgodnie z procedurą.',58)])]),
 dict(num='07',slug='raport_koncowy',title='Raport audytu zasadniczego',subtitle='Wzór raportu wyników kontroli i zgodności',
 purpose='Dokumentacja końcowa wymaga dostosowania do właściwych przepisów, kryteriów, zakresu i kompetencji audytora. Bez pełnych dowodów nie deklaruj formalnej zgodności.',
 sections=[
 ('Informacje formalne',[
 ('meta','Firma, okres badany, daty audytu, numer raportu','Audytor wiodący, skład zespołu, odbiorcy i klasyfikacja.',64),('mandat','Podstawa audytu i uprawnienia','Mandat, umowa, niezależność, kwalifikacje, zgody.',65),('scope','Zakres podmiotowy, technologiczny i czasowy','IN/OUT, krytyczne usługi, lokalizacje i wyłączenia.',78),('criteria','Stosowane kryteria i wersje','KSC, RODO, sektor, ISO, wewnętrzne polityki, umowy; rozdziel typy.',82)]),
 ('Metodyka i dowody',[
 ('method','Metoda audytu, próbki, testy, ograniczenia','Wywiady, wgląd, konfiguracja, testy po zgodzie, okres próby i odchylenia.',90),('coverage','Pokrycie obiektów i kontrolowanych wymagań','Licznik badanych zasobów, kont, usług, lokalizacji i kryteriów.',75),('exceptions','Niezweryfikowane wymagania i przyczyny','Stan N/O nie oznacza „zgodne”; ryzyko braku zapewnienia.',68)]),
 ('Wyniki i decyzje',[
 ('executive','Podsumowanie zarządcze','Najważniejsze ryzyka, wpływ, decyzje, skala pokrycia.',100),('conformity','Ocena zgodności w zakresie audytu','Dla każdego kryterium: Z / C / NZ / ND / NO z dowodami.',85),('issues','Wykaz niezgodności i ryzyk','ID, kryterium, stan, dowód, ważność, wpływ, owner.',110),('positives','Dobre praktyki i kontrole skuteczne','Dokumentacja sprawdzonego działania, bez nadmiernych ogólników.',63),('cap','Plan działań i retest','Właściciel, terminy, akceptacje ryzyk, dowód zamknięcia.',75)]),
 ('Wydanie raportu',[
 ('opinia','Zakres i ograniczenia opinii audytowej','Czy to audyt wewnętrzny, zewnętrzny, gap czy ustawowy; nie deklaruj bez podstawy.',80),('review','Uzgodnione kontrdowody i odpowiedzi kierownictwa','Wersja finalna po weryfikacji faktów.',66),('sign','Data, podpis audytora i zatwierdzenie odbioru','Potwierdzenie nie przesądza zgody na wszystkie ustalenia.',48)])]),
 dict(num='08',slug='plan_capa',title='Plan działań korygujących (CAPA)',subtitle='Śledzenie realizacji, akceptacja ryzyka i kontrola skuteczności',
 purpose='Zarządza sposobem usuwania ustaleń. Działanie musi mieć obiektywne kryterium zamknięcia oraz osobę uprawnioną do decyzji.',
 sections=[
 ('Uzgodnienia',[
 ('scope','Projekt / identyfikator raportu i zakres CAPA','Numer raportu, wersja, osoba koordynująca.',52),('sla','Progi pilności i cykl przeglądu','Przykładowe daty robocze w firmie; nie mylić z terminami ustawowymi.',61)]),
 ('Działania',[
 ('a1','A1: ID ustalenia / zadanie / owner / termin / dowód / retest','Plan, zasoby, zależności i status.',75),('a2','A2: ID ustalenia / zadanie / owner / termin / dowód / retest','',75),('a3','A3: ID ustalenia / zadanie / owner / termin / dowód / retest','',75),('a4','A4: ID ustalenia / zadanie / owner / termin / dowód / retest','',75),('a5','A5: ID ustalenia / zadanie / owner / termin / dowód / retest','',75),('a6','A6: ID ustalenia / zadanie / owner / termin / dowód / retest','',75)]),
 ('Zamknięcie i ryzyko rezydualne',[
 ('accept','Wyjątki / ryzyko rezydualne / akceptujący','Wskaż uzasadnienie, ważność decyzji i wymagane kontrole kompensujące.',72),('kpi','Kryteria efektywności / wynik retestu','Powiązanie z logami, testami i konkretnym wynikiem.',59),('sign','Zatwierdził / data kolejnego przeglądu','Kierownictwo + właściciele ryzyk.',45)])]),
 dict(num='09',slug='karta_incydentu',title='Karta incydentu i obowiązków zgłoszeń',subtitle='Kwalifikacja zdarzenia i osobne ścieżki KSC, RODO oraz DORA',
 purpose='Przykład wewnętrznej karty operacyjnej. NIE jest oficjalnym formularzem S46, CSIRT, UODO ani DORA. Zgłoszenia wykonuje się we właściwym kanale.',
 sections=[
 ('Fakty i wpływ',[
 ('inc_id','ID incydentu, data/czas wystąpienia i wykrycia','Strefa czasowa, źródło wiedzy, osoba prowadząca.',64),('system','Usługi / systemy / osoby i podmioty dotknięte','Wpływ na dostępność, poufność, integralność, geografia.',77),('ioc','Przebieg, wstępna przyczyna, IoC','Bez niepotrzebnych danych osobowych i sekretów.',79)]),
 ('Ścieżki prawne',[
 ('ksc','KSC: czy podmiot objęty, czy incydent poważny?','Progi sektorowe, właściwy CSIRT, S46, czy dotyczy wyjątek.',73),('ksc_dates','KSC: 24h / 72h / 1 miesiąc: daty i potwierdzenia','Odrębnie wyjątki sektora DORA i części podmiotów publicznych.',82),('gdpr','RODO: naruszenie ochrony danych? Ryzyko dla osób?','Art. 33-34; możliwe 72h; odrębne zgłoszenie gdy wymagane.',76),('dora','DORA / sektor / inne: decyzja i odbiorca','Nie stosuj ścieżki KSC automatycznie do finansów.',62)]),
 ('Obsługa i decyzje',[
 ('actions','Działania ograniczające skutki i przywrócenie','Osoby odpowiedzialne, chronologia, zabezpieczenie dowodów.',82),('comms','Powiadomienia użytkowników, kierownictwa, organów','Kanał, czas, osoba, identyfikator i potwierdzenie odbioru.',78),('closure','Zamknięcie, RCA, lekcje i CAPA','Kiedy zakończono obsługę, kiedy złożono raport końcowy.',76),('review','Zatwierdził kwalifikację prawną / data','CISO + IOD + compliance / właściciel incydentu.',55)])]),
 dict(num='10',slug='zamkniecie_i_retest',title='Protokół zamknięcia i retestu',subtitle='Przekazanie raportu, decyzje zarządcze i weryfikacja napraw',
 purpose='Zamknięcie wymaga dokumentowania odpowiedzi i decyzji kierownictwa. Samo otrzymanie raportu nie oznacza, że wszystkie ryzyka zostały usunięte.',
 sections=[
 ('Odbiór audytu',[
 ('meta','Firma / numer raportu / data wydania','Wersja i klasyfikacja raportu.',50),('attendees','Uczestnicy spotkania zamykającego','Sponsor, audytor, IT, IOD, compliance, ownerzy.',55),('scope','Potwierdzony zakres, ograniczenia i otwarte spory','Co pozostaje niezweryfikowane.',65),('feedback','Uwagi audytowanego / kontrdowody','Stanowiska i sposób rozpatrzenia rozbieżności.',70)]),
 ('Decyzje naprawcze',[
 ('actions','Lista CAPA, właściciele, terminy i budżet','Oddziel działania pilne od długoterminowych.',80),('residual','Ryzyko rezydualne i osoba podejmująca decyzję','Zakres akceptacji i data przeglądu.',65),('followup','Kiedy i jak będzie retest oraz kolejny audyt','Metoda, zakres, zadania do weryfikacji.',70)]),
 ('Retest',[
 ('checks','ID ustaleń, dowody retestu, wynik / data','Zamknięte, niezamknięte, wymaga dalszych działań.',85),('proof','Lokalizacja dowodów i wersja','ID pakietu dowodowego, repozytorium, retencja.',55),('signatures','Podpis audytora / odbiorcy / daty','Podpis elektroniczny lub ścieżka zatwierdzenia.',56)])])
]

DARK=HexColor('#17364D');BLUE=HexColor('#2D7795');INK=HexColor('#20374C');MUTED=HexColor('#61788C');LINE=HexColor('#D6E4EA');BG=HexColor('#F4F9FB')
W,H=A4;LEFT=45;RIGHT=45;BOTTOM=52;TOP=50

class Renderer:
    def __init__(self,doc):
        self.doc=doc;self.path=OUTPDF/f"{doc['num']}_{doc['slug']}.pdf"
        self.c=canvas.Canvas(str(self.path), pagesize=A4,pageCompression=1)
        self.c.setTitle(doc['title']+' - formularz do wypełnienia')
        self.c.setAuthor('CyberAudit Kit - szablon autorski')
        self.c.setSubject('Audyt bezpieczeństwa IT - formularz AcroForm')
        self.y=H-TOP;self.page=0
    def new_page(self):
        if self.page: self.c.showPage()
        self.page+=1
        self.y=H-TOP
        c=self.c
        c.setFillColor(DARK);c.rect(0,H-37,W,37,fill=1,stroke=0)
        c.setFont('DV-Bold',9);c.setFillColor(white);c.drawString(LEFT,H-24,'CYBERAUDIT KIT  /  WZÓR FORMULARZA')
        c.setFont('DV',8);c.drawRightString(W-RIGHT,H-24,'04.11.2026')
        c.setStrokeColor(LINE);c.line(LEFT,38,W-RIGHT,38)
        c.setFont('DV',7);c.setFillColor(MUTED)
        c.drawString(LEFT,25,'POUFNE PO WYPEŁNIENIU  |  Uzupełnij zakres, dane i podpisy w odpowiednim środowisku')
        c.drawRightString(W-RIGHT,25,f"Strona {self.page}")
        if self.page == 1:
            self.y-=5
            self.heading(self.doc['title'],17)
            self.paragraph(self.doc['subtitle'],9,BLUE)
            self.paragraph('ZASTOSOWANIE  '+self.doc['purpose'],8,MUTED)
            self.y-=6
        else:
            self.heading(self.doc['title']+'  /  ciąg dalszy',11)
            self.y-=7
    def ensure(self, needed):
        if self.y-needed<BOTTOM:self.new_page()
    def heading(self,txt,size=11):
        self.ensure(31)
        c=self.c;c.setFont('DV-Bold',size);c.setFillColor(DARK)
        for line in simpleSplit(txt,'DV-Bold',size,W-LEFT-RIGHT):
            c.drawString(LEFT,self.y,line);self.y-=size+5
    def paragraph(self,text,size=8,color=MUTED):
        lines=simpleSplit(text,'DV',size,W-LEFT-RIGHT)
        self.ensure(len(lines)*(size+4)+12)
        self.c.setFont('DV',size);self.c.setFillColor(color)
        for line in lines: self.c.drawString(LEFT,self.y,line);self.y-=size+4
        self.y-=10
    def section(self,title):
        self.ensure(45)
        self.y-=8
        c=self.c;c.setFillColor(BG);c.roundRect(LEFT,self.y-20,W-LEFT-RIGHT,27,6,stroke=0,fill=1)
        c.setFont('DV-Bold',10);c.setFillColor(BLUE);c.drawString(LEFT+9,self.y-11,title)
        self.y-=37
    def field(self,field_id,label,description,height):
        label_lines=simpleSplit(label,'DV-Bold',8,W-LEFT-RIGHT)
        info_lines=simpleSplit(description,'DV',7,W-LEFT-RIGHT) if description else []
        minH=len(label_lines)*11+len(info_lines)*9+height+14
        self.ensure(minH+9)
        c=self.c;c.setFont('DV-Bold',8);c.setFillColor(INK)
        for line in label_lines:c.drawString(LEFT,self.y,line);self.y-=11
        if description:
            c.setFont('DV',7);c.setFillColor(MUTED)
            for line in info_lines:c.drawString(LEFT,self.y,line);self.y-=9
        self.y-=height+4
        ismulti=height>=45
        c.acroForm.textfield(name=f"{self.doc['num']}_{field_id}",tooltip=label,
           x=LEFT,y=self.y,width=W-LEFT-RIGHT,height=height,
           value='',borderStyle='solid',borderWidth=.7,borderColor=LINE,
           fillColor=white,textColor=INK,fontName='Helvetica',fontSize=9,
           fieldFlags='multiline' if ismulti else '',maxlen=10000 if ismulti else 400)
        self.y-=10
    def done(self):
        self.c.save()

def generate(doc):
    r=Renderer(doc);r.new_page()
    slug=f"{doc['num']}_{doc['slug']}"
    md=[f"# {doc['title']}","",f"> {doc['subtitle']}","",f"**Cel:** {doc['purpose']}","",'**Status:** WZÓR. Przed użyciem dostosuj do firmy, prawa i zatwierdzonego zakresu audytu.',"",'**Wersja / data:** 1.0 / 2026-11-04',"",'---',""]
    for section, fields in doc['sections']:
        r.section(section);md += [f"## {section}",""]
        for field_id,label,help_text,height in fields:
            r.field(field_id,label,help_text,height)
            md += [f"### {label}",*( [f"*Wskazówka:* {help_text}"] if help_text else []),"",'[Uzupełnij: zakres, dowód, data, decyzja, osoba odpowiedzialna]','','']
    r.done()
    md += ['---','', '## Instrukcja użytkowania',
       '1. Nadaj dokumentowi identyfikator, wersję, datę i klasyfikację poufności.',
       '2. Każdy wniosek wymagający potwierdzenia połącz z ID dowodu z rejestru.',
       '3. Rozdziel stan potwierdzony, przypuszczenie, brak dowodu i brak zastosowania.',
       '4. Uzgodnij fakty z właścicielem i zapisz istotne kontrdowody.',
       '5. Zweryfikuj szczególne przepisy i oficjalne formularze branżowe.',
       '6. Zapewnij zatwierdzenie, wersjonowanie i ochronę danych w repozytorium firmy.',
       '', '## Źródła metodyki i prawa','',
       '- Ustawa o KSC z nowelizacją Dz.U. 2026 poz. 252: https://eli.gov.pl/eli/DU/2026/252/ogl',
       '- ISO 19011:2026: https://www.iso.org/standard/19011',
       '- NIST SP 800-115: https://csrc.nist.gov/pubs/sp/800/115/final',
       '- NIST CSF 2.0: https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20',
       '- CERT Polska, zgłaszanie incydentów: https://wiedza.cert.pl/obsluga-incydentow/zgloszenie/zgloszenie-incydentu/',
       '', '*Materiał autorski oparty na metodologii audytu; nie jest cytatem z licencjonowanego standardu.*','']
    (OUTMD/(slug+'.md')).write_text('\n'.join(md),encoding='utf-8')
    return r.path

if __name__=='__main__':
    for d in DOCS:
        p=generate(d)
        print(p.name,p.stat().st_size,'B')
