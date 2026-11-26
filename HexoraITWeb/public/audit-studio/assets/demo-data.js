/* Fikcyjne materiały do ćwiczenia. Odpowiedzi są zapisane osobno od materiałów. */
(() => {
  'use strict';
  const materials = [
    ['DM-01','Opis firmy i ewidencja','Firma Demo Sp. z o.o. jest fikcyjną hurtownią zatrudniającą 10 osób. Ma 10 laptopów (własność wpisana w spisie), jeden mały serwer magazynowy, pocztę i dokumenty w chmurze oraz program sprzedaży jako usługę. Lista sprzętu została uzgodniona z zakupami w tym miesiącu. Dla poczty, dokumentów i programu sprzedaży wskazano właścicieli i zastępców. Księgowość i IT uzgodniły listę subskrypcji w tym kwartale.'],
    ['DM-02','Wywiad z opiekunką IT i lista kont','K01–K08 to konta imienne pracowników z MFA. Pracownicy 09 i 10 używają jednego loginu do poczty i dokumentów bez MFA. A01 to odrębny administrator z MFA. A02 to uprzywilejowane konto dostawcy bez MFA. W próbie trzech ról dwie mają właściwy dostęp do dokumentów, a pracownik magazynu zachował odczyt dokumentów zarządu. IT nie ma ustalonego cyklu przeglądu kont.'],
    ['DM-03','Zasady haseł i zgłoszenia','W instrukcji wprost zakazano powtarzania haseł służbowych w prywatnych usługach. Wszyscy otrzymali dostęp do zatwierdzonego menedżera haseł. W dwóch zbadanych zgłoszeniach resetu wsparcie odnotowało sprawdzenie tożsamości przez ustalony kanał. Hasła i inne dane dostępowe pominięto.'],
    ['DM-04','Zestawienie aktualizacji','Osiem laptopów ma bieżące poprawki, a dwa oczekują od sześciu tygodni. Serwer magazynowy jest oznaczony w wykazie jako jedyny system po zakończeniu wsparcia. Nie ma planu wymiany, terminu ani opiekuna wyjątku. Raport obejmuje przeglądarkę, ale pomija program biurowy. Zaległe poprawki nie mają właścicieli ani terminów.'],
    ['DM-05','Opis kopii i ostatnia próba odtworzenia','Codzienna kopia obejmuje pliki i dokumenty, a dane programu sprzedaży dostawca obejmuje osobną kopią. Opiekunka kopii pokazała wykaz ról ograniczony do dwóch wyznaczonych osób. Powiadomienia o błędzie trafiają do jednej z nich, bez zastępstwa podczas urlopu. Jest protokół sprzed miesiąca potwierdzający odtworzenie folderu i odbiór przez użytkownika. Firma nie uzgodniła dopuszczalnej utraty danych ani czasu odtworzenia.'],
    ['DM-06','Raport ochrony laptopów','W raporcie ochrony wszystkie 10 laptopów zgłasza działanie ochrony. Szyfrowanie potwierdzono na ośmiu. Wspólna polityka blokady po pięciu minutach obejmuje wszystkie urządzenia. Zespół wskazał numer telefonu do zgłaszania zagubienia sprzętu, podany również w instrukcji.'],
    ['DM-07','Opis sieci i wywiad','Schemat obejmuje strefę biurową oraz oddzielną strefę gości, zgodnie z dwiema ostatnimi zmianami. Zasady zapory mają datowany protokół przeglądu i listę wyjątków. Jedyny dozwolony zdalny dostęp to firmowa usługa VPN. Dostęp pracowników ma MFA, zaś konto dostawcy A02 figuruje jako wyjątek bez MFA.'],
    ['DM-08','Raport poczty i rozmowa z księgowością','Raport potwierdza SPF i DKIM. DMARC jest skonfigurowany, ale nikt nie odbiera raportów i nie przegląda jego działania. Pracownicy wskazali ten sam kanał zgłaszania podejrzanej poczty, który podaje instrukcja. Księgowość potwierdza zmiany rachunku przez wcześniej znany numer i odnotowuje tę czynność. Stanu przekierowań poczty poza firmę nie przedstawiono.'],
    ['DM-09','Rozmowa z kadrami','Odbywa się szkolenie wstępne. W próbie dwóch nowych osób jedna ma potwierdzony udział, a dla drugiej brak zapisu. W sprawdzonym wniosku o dostęp przełożony zatwierdził rolę. W jedynym badanym odejściu zamknięto pocztę w terminie, ale nadal widać dostęp do programu sprzedaży.'],
    ['DM-10','Dokumentacja organizacji','Polityka bezpieczeństwa ma datę, wersję i właściciela. Instrukcja zgłaszania zdarzeń opisuje kontakt, zastępstwo i działania w razie utraty konta, laptopa lub danych. Plan poprawek ma zadania, ale połowa pozycji nie ma terminu lub właściciela. Dwie z czterech sprawdzonych instrukcji IT nie mają wersji ani wskazanego opiekuna.'],
    ['DM-11','Dokumentacja dostawców','Jest rejestr dwóch dostawców z rodzajem dostępu i opiekunem umowy. Konto A02 pozostaje aktywne po zakończeniu ostatniego zlecenia i nie ma daty sprawdzenia. Obie umowy zawierają aktualny kontakt zgłoszeniowy z zastępstwem w lokalnej instrukcji.'],
    ['DM-12','Ochrona biura','Szafa sieciowa z serwerem jest zamknięta, a klucze mają dwie wyznaczone osoby. Goście są odbierani przez gospodarza, zgodnie z zasadami odwiedzin. Brak danych o wcześniejszym wycofaniu nośników i procedurze przekazania.'],
    ['DM-13','Metadane miejsc przechowywania danych','Wykaz systemów obejmuje kadry, dokumenty klientów i system sprzedaży. Każdy ma właściciela i wykaz kategorii danych. W próbie ról jeden nadmiarowy dostęp do katalogu klientów pozostaje aktywny. Dla dokumentów kadrowych zapisano zasady retencji i właściciela, ale analogicznego zapisu brak dla dokumentów klientów.']
  ];

  // Kolejność ocen odpowiada identyfikatorom pytań w obrębie obszaru.
  const byArea = [
    ['INV','DM-01','Z Z Z Z'],
    ['ACC','DM-02','N C C C N'],
    ['PWD','DM-03','Z Z Z'],
    ['UPD','DM-04','C Z C N'],
    ['BAK','DM-05','Z Z Z C N'],
    ['END','DM-06','Z C Z Z'],
    ['NET','DM-07','Z Z C Z'],
    ['MAIL','DM-08','C Z Z ?'],
    ['HR','DM-09','C Z N'],
    ['PROC','DM-10','Z Z C C'],
    ['SUP','DM-11','Z N Z'],
    ['PHYS','DM-12','Z Z ?'],
    ['DATA','DM-13','Z C C']
  ];
  const states = {Z:'conform',C:'partial',N:'nonconform','?':'unassessed'};
  const answers = byArea.flatMap(([area, evidence, codes]) => codes.split(' ').map((code, index) => ({
    id:'BAZ-'+area+'-'+String(index+1).padStart(2,'0'), evidence, status:states[code]
  })));

  window.AUDIT_DEMO = { materials, answers };
})();
