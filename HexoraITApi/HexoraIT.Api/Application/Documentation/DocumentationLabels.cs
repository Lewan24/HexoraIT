namespace HexoraITApi.Application.Documentation;

public static class DocumentationLabels
{
    private static readonly Dictionary<string, string> Polish = new()
    {
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
        ["Gateway"] = "Brama", ["IP entry"] = "Wpis IP", ["IP notes"] = "Notatki IP", ["IP details"] = "Szczegóły IP",
        ["Device type"] = "Typ urządzenia", ["Connection"] = "Połączenie", ["Yes"] = "Tak", ["No"] = "Nie",
        ["No records in the selected scope."] = "Brak wpisów w wybranym zakresie.",
        ["This document contains only the selected sections and fields. File attachments are listed, not embedded."] = "Dokument zawiera wyłącznie wybrane sekcje i pola. Załączniki są wymienione w wykazie, bez osadzania ich zawartości.",
        ["Sensitive data: this report includes passwords or license keys."] = "Dane poufne: raport zawiera hasła lub klucze licencji.",
        ["Personal notes: only notes belonging to the report author are included."] = "Notatki osobiste: uwzględniono wyłącznie notatki autora raportu."
    };
    public static string Get(string key, bool polish) => polish ? Polish.GetValueOrDefault(key, key) : key switch
    {
        "assets" => "Assets", "networks" => "Networks and IP addressing", "passwords" => "Accounts and passwords", "licenses" => "Licenses",
        "contacts" => "Contacts", "contracts" => "Contracts", "knowledge" => "Knowledge base", "warranty" => "Warranties", "files" => "File inventory",
        "diagram" => "Diagram — devices and connections", "groups" => "Groups", "projects" => "Projects", "plans" => "Plans", "incidents" => "Incidents",
        "tasks" => "Tasks", "private-notes" => "My private notes", _ => key
    };
}
