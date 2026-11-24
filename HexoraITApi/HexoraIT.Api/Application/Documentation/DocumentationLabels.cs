namespace HexoraITApi.Application.Documentation;

public static class DocumentationLabels
{
    public static string SectionDescription(string key, bool polish) => (key, polish) switch
    {
        ("networks", true) => "Konfiguracja podsieci oraz zapisane przypisania i rezerwacje adresów.",
        ("networks", false) => "Subnet configuration and saved address assignments and reservations.",
        ("files", true) => "Wykaz nazw plików i folderów. Zawartość plików jest dostępna w aplikacji.",
        ("files", false) => "Reference list of file and folder names. File contents are available in the application.",
        _ => ""
    };

    private static readonly Dictionary<string, string> Polish = new()
    {
        ["operations"] = "Operacje i zmiany IT", ["Number"] = "Numer", ["Template"] = "Szablon", ["Revision"] = "Wersja",
        ["Requester"] = "Wnioskodawca", ["Implementer"] = "Wykonawca", ["Risk"] = "Ryzyko", ["Related asset"] = "Powiązany zasób",
        ["Planned start"] = "Planowany początek", ["Planned end"] = "Planowany koniec", ["Actual start"] = "Rzeczywisty początek", ["Actual end"] = "Rzeczywisty koniec",
        ["Closed"] = "Zamknięty", ["Draft"] = "Szkic", ["Submitted"] = "Wysłany", ["Under Review"] = "W trakcie przeglądu",
        ["Awaiting Approval"] = "Oczekuje na zatwierdzenie", ["Approved"] = "Zatwierdzony", ["Scheduled"] = "Zaplanowany", ["In Progress"] = "W realizacji",
        ["Verification"] = "Weryfikacja", ["Completed"] = "Ukończony", ["Rejected"] = "Odrzucony", ["Cancelled"] = "Anulowany",
        ["Failed"] = "Niepowodzenie", ["Rolled Back"] = "Wycofany", ["Archived"] = "Zarchiwizowany",
        ["Low"] = "Niskie", ["Medium"] = "Średnie", ["High"] = "Wysokie",
        ["Organization documentation"] = "Dokumentacja organizacji", ["Contents"] = "Spis treści", ["Generated"] = "Wygenerowano",
        ["Prepared by"] = "Przygotował(a)", ["Recipient"] = "Odbiorca", ["Sections"] = "Sekcje", ["Records"] = "Liczba wpisów",
        ["assets"] = "Zasoby", ["networks"] = "Sieci i adresacja IP", ["passwords"] = "Konta i hasła", ["licenses"] = "Licencje",
        ["contacts"] = "Kontakty", ["contracts"] = "Umowy", ["knowledge"] = "Baza wiedzy", ["warranty"] = "Gwarancje",
        ["files"] = "Wykaz plików", ["diagram"] = "Diagram — urządzenia i połączenia", ["groups"] = "Grupy", ["projects"] = "Projekty",
        ["plans"] = "Plany", ["incidents"] = "Incydenty", ["tasks"] = "Zadania", ["private-notes"] = "Moje prywatne notatki",
        ["Type"] = "Typ", ["Status"] = "Status", ["Location"] = "Lokalizacja", ["Owner"] = "Opiekun", ["IP address"] = "Adres IP",
        ["Serial number"] = "Numer seryjny", ["Tags"] = "Tagi", ["Updated"] = "Aktualizacja", ["Notes"] = "Notatki",
        ["Username"] = "Nazwa użytkownika", ["Category"] = "Kategoria", ["Password"] = "Hasło", ["Vendor"] = "Dostawca",
        ["Seats"] = "Liczba stanowisk", ["Seats used"] = "Wykorzystane stanowiska", ["Purchase date"] = "Data zakupu",
        ["Expiry date"] = "Ważność do", ["License key"] = "Klucz licencji", ["Cost"] = "Koszt", ["Company"] = "Firma",
        ["Role"] = "Stanowisko", ["Phone"] = "Telefon", ["Email"] = "E-mail", ["Description"] = "Opis", ["Start date"] = "Data rozpoczęcia",
        ["End date"] = "Data zakończenia", ["Auto-renewal"] = "Automatyczne odnowienie", ["Attachment"] = "Załącznik", ["Value"] = "Wartość",
        ["Content"] = "Treść", ["Warranty end"] = "Koniec gwarancji", ["Contact"] = "Osoba kontaktowa", ["Priority"] = "Priorytet",
        ["Assignee"] = "Przypisano do", ["Due date"] = "Termin", ["Target date"] = "Planowany termin", ["Estimated cost"] = "Szacowany koszt",
        ["Severity"] = "Ważność", ["Occurred"] = "Wystąpienie", ["Resolved"] = "Rozwiązanie", ["Affected systems"] = "Dotknięte systemy",
        ["Resolution"] = "Sposób rozwiązania", ["Created"] = "Utworzono", ["Members"] = "Członkowie", ["Purpose"] = "Przeznaczenie",
        ["Folder"] = "Folder", ["File type"] = "Typ pliku", ["Size (bytes)"] = "Rozmiar (bajty)", ["Uploaded"] = "Przesłano",
        ["Linked network"] = "Powiązana sieć", ["Gateway"] = "Brama", ["DHCP range"] = "Zakres DHCP", ["IP entry"] = "Wpis IP", ["IP notes"] = "Notatki IP", ["IP details"] = "Szczegóły IP",
        ["Device type"] = "Typ urządzenia", ["Connection"] = "Połączenie", ["Yes"] = "Tak", ["No"] = "Nie",
        ["Name"] = "Nazwa", ["License model"] = "Model licencji", ["Seats used / total"] = "Stanowiska (użyte / razem)",
        ["Address assignments"] = "Przypisania adresów", ["Assignment"] = "Przypisanie",
        ["Used"] = "Używany", ["Reserved"] = "Zarezerwowany", ["Free"] = "Wolny",
        ["Server"] = "Serwer", ["Workstation"] = "Stacja robocza", ["Network"] = "Urządzenie sieciowe",
        ["Storage"] = "Pamięć masowa", ["AP"] = "Punkt dostępowy", ["Ap"] = "Punkt dostępowy",
        ["Printer"] = "Drukarka", ["Camera"] = "Kamera", ["Recorder"] = "Rejestrator",
        ["Firewall"] = "Zapora", ["Switch"] = "Przełącznik", ["Cloud"] = "Chmura", ["Custom"] = "Inne",
        ["Fiber"] = "Światłowód", ["Wireless"] = "Bezprzewodowe", ["Vpn"] = "VPN", ["Wan"] = "WAN",
        ["Subscription"] = "Subskrypcja", ["Perpetual"] = "Bezterminowa", ["Volume"] = "Grupowa", ["Trial"] = "Próbna", ["Inactive"] = "Nieaktywna",
        ["Service"] = "Usługi", ["Support"] = "Wsparcie", ["Maintenance"] = "Utrzymanie", ["Lease"] = "Dzierżawa",
        ["Software"] = "Oprogramowanie", ["Other"] = "Inne", ["Standard"] = "Standardowa", ["Extended"] = "Rozszerzona",
        ["OnSiteNbd"] = "Na miejscu (NBD)", ["CarryIn"] = "Dostarczenie do serwisu", ["MailIn"] = "Wysyłka do serwisu",
        ["Planned"] = "Zaplanowany", ["Critical"] = "Krytyczna", ["Open"] = "Otwarty",
        ["Investigating"] = "W analizie", ["Todo"] = "Do zrobienia", ["Done"] = "Gotowe",
        ["InProgress"] = "W realizacji", ["AdSecurity"] = "Grupa zabezpieczeń AD", ["AdDistribution"] = "Grupa dystrybucyjna AD",
        ["AdOu"] = "Jednostka organizacyjna AD", ["LocalGroup"] = "Grupa lokalna", ["VlanGroup"] = "Grupa VLAN", ["ProjectTeam"] = "Zespół projektowy",
        ["No records in the selected scope."] = "Brak wpisów w wybranym zakresie.",
        ["Sensitive data: this report includes passwords or license keys."] = "Dane poufne: raport zawiera hasła lub klucze licencji.",
        ["Personal notes: only notes belonging to the report author are included."] = "Notatki osobiste: uwzględniono wyłącznie notatki autora raportu."
    };
    public static string Get(string key, bool polish) => polish ? Polish.GetValueOrDefault(key, key) : key switch
    {
        "operations" => "IT Operations & Changes",
        "assets" => "Assets", "networks" => "Networks and IP addressing", "passwords" => "Accounts and passwords", "licenses" => "Licenses",
        "contacts" => "Contacts", "contracts" => "Contracts", "knowledge" => "Knowledge base", "warranty" => "Warranties", "files" => "File inventory",
        "diagram" => "Diagram — devices and connections", "groups" => "Groups", "projects" => "Projects", "plans" => "Plans", "incidents" => "Incidents",
        "tasks" => "Tasks", "private-notes" => "My private notes", _ => key
    };
}
