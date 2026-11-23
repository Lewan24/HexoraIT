using HexoraITApi.Domain.Entities;
using HexoraITApi.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace HexoraITApi.Application.Operations;

public static class OperationCatalog
{
    private static OperationLabel L(string en, string pl) => new(en, pl);
    private static OperationField F(string key, string en, string pl, bool required = true, string type = "text") => new(key, L(en, pl), type, required);
    private static OperationField Select(string key, string en, string pl, params string[] options) => new(key, L(en, pl), "select", true, Options: options);
    private static OperationField Table(string key, string en, string pl, params OperationField[] fields) => new(key, L(en, pl), "table", true, Fields: fields);
    private static OperationField[] Recovery => [F("rollback", "Rollback procedure", "Procedura wycofania", type: "multiline"),
        F("verification", "Verification method and results", "Metoda i wyniki weryfikacji", type: "multiline"),
        F("evidence", "Evidence references (no secrets)", "Odnośniki do dowodów (bez sekretów)", false, "multiline")];
    private static OperationField[] Execution => [F("implementation", "Implementation method / steps", "Metoda / kroki wdrożenia", type: "multiline"),
        F("impact", "Security and functional impact", "Wpływ na bezpieczeństwo i funkcjonalność", type: "multiline"),
        F("riskAssessment", "Risk assessment", "Ocena ryzyka", type: "multiline"),
        F("result", "Execution result", "Wynik wykonania", false, "multiline"),
        F("closureNotes", "Closure notes", "Uwagi przy zamknięciu", false, "multiline"),
        F("emergencyReason", "Emergency approval bypass reason", "Powód pominięcia zgody w trybie awaryjnym", false, "multiline"),
        F("reviewNotes", "Retrospective review / approval comments", "Przegląd po zmianie / uwagi zatwierdzającego", false, "multiline")];

    public static IReadOnlyList<OperationSchema> All { get; } =
    [
        new(1, "A02", L("Active Directory Group Policy Change", "Zmiana zasad grupy Active Directory"),
            L("Record every changed policy setting, its previous value, verification evidence and rollback.", "Zapisz każde zmienione ustawienie, poprzednią wartość, dowody weryfikacji i plan wycofania."),
            ["ISO/IEC 27001:2022 A.8.9", "ISO/IEC 27001:2022 A.8.32", "NIST SP 800-128"],
            [F("domain", "Domain name", "Nazwa domeny"), F("controller", "Domain controller / asset reference", "Kontroler domeny / odnośnik do zasobu"),
                F("gpoName", "GPO name", "Nazwa GPO"), F("gpoGuid", "GPO GUID", "GUID GPO", false),
                F("scope", "GPO scope", "Zakres GPO"), F("target", "Linked OU / target", "Powiązana OU / cel"),
                F("securityFiltering", "Security filtering", "Filtrowanie zabezpieczeń"), F("wmiFilter", "WMI filter", "Filtr WMI", false),
                F("justification", "Business and technical justification", "Uzasadnienie biznesowe i techniczne", type: "multiline"),
                Table("settings", "Configuration changes", "Zmiany konfiguracji", F("path", "Policy path", "Ścieżka zasad"),
                    F("setting", "Setting name", "Nazwa ustawienia"), F("previous", "Previous value", "Poprzednia wartość"), F("next", "New value", "Nowa wartość"), F("reason", "Reason", "Powód")),
                F("gpresult", "gpupdate / gpresult evidence reference", "Odnośnik do dowodów gpupdate / gpresult"), ..Execution, ..Recovery]),
        new(1, "A06", L("Firewall Rule Change", "Zmiana reguł zapory"),
            L("Document multiple firewall rules and their validation.", "Udokumentuj wiele reguł zapory i ich weryfikację."),
            ["ISO/IEC 27001:2022 A.8.20", "ISO/IEC 27001:2022 A.8.32", "NIST SP 800-128"],
            [F("firewall", "Firewall / asset reference", "Zapora / odnośnik do zasobu"), F("platform", "Platform", "Platforma"),
                F("justification", "Business justification", "Uzasadnienie biznesowe", type: "multiline"), F("ruleOwner", "Rule owner", "Właściciel reguły"),
                Table("rules", "Rule changes", "Zmiany reguł", F("identifier", "Rule identifier", "Identyfikator reguły"),
                    F("source", "Source address / object", "Adres / obiekt źródłowy"), F("destination", "Destination address / object", "Adres / obiekt docelowy"),
                    F("sourceZone", "Source zone", "Strefa źródłowa"), F("destinationZone", "Destination zone", "Strefa docelowa"),
                    F("protocol", "Protocol", "Protokół"), F("sourcePorts", "Source ports", "Porty źródłowe"), F("destinationPorts", "Destination ports", "Porty docelowe"),
                    Select("action", "Action", "Akcja", "Allow", "Deny", "Reject"), F("direction", "Direction", "Kierunek"), F("logging", "Logging", "Logowanie"),
                    F("previous", "Previous configuration", "Poprzednia konfiguracja"), F("next", "New configuration", "Nowa konfiguracja"),
                    F("expires", "Temporary rule expiry", "Wygaśnięcie reguły tymczasowej", false, "date")), ..Execution, ..Recovery]),
        new(1, "D02", L("Backup Restore Test", "Test odtworzenia kopii zapasowej"),
            L("Record recovery measurements and integrity and application verification.", "Zapisz pomiary odtwarzania oraz weryfikację integralności i aplikacji."),
            ["ISO/IEC 27001:2022 A.8.13", "ISO/IEC 27001:2022 A.5.30"],
            [F("backupJob", "Backup job / system", "Zadanie kopii / system"), F("protectedAsset", "Protected asset", "Chroniony zasób"),
                F("backupDate", "Backup date", "Data kopii", type: "date"), F("backupVersion", "Backup version", "Wersja kopii"),
                F("restoreTarget", "Restore target", "Cel odtworzenia"), F("environment", "Test environment", "Środowisko testowe"),
                F("executor", "Person executing", "Osoba wykonująca"), F("testDate", "Test date", "Data testu", type: "date"),
                F("expectedRpo", "Expected RPO", "Oczekiwane RPO"), F("expectedRto", "Expected RTO", "Oczekiwane RTO"),
                F("measuredRpo", "Measured recovery point", "Zmierzony punkt odtworzenia"), F("measuredRto", "Measured recovery time", "Zmierzony czas odtworzenia"),
                F("integrity", "Data integrity verification", "Weryfikacja integralności danych", false, "multiline"),
                F("functionality", "Application functionality verification", "Weryfikacja działania aplikacji", false, "multiline"),
                Select("outcome", "Outcome", "Wynik", "Successful", "Failed", "Partial"),
                F("problems", "Discovered problems", "Wykryte problemy", false, "multiline"), F("correctiveActions", "Corrective actions", "Działania korygujące", false, "multiline"),
                F("evidence", "Evidence references", "Odnośniki do dowodów", type: "multiline"), F("closureNotes", "Closure notes", "Uwagi przy zamknięciu", false, "multiline")])
    ];

    public static async Task SeedAsync(AppDbContext db, CancellationToken token = default)
    {
        foreach (var schema in All)
        {
            var json = OperationSchemas.Serialize(schema);
            OperationSchemas.Parse(json);
            var hash = OperationSchemas.Hash(json);
            if (await db.OperationTemplates.AnyAsync(t => t.Key == schema.Key && t.ContentHash == hash, token)) continue;
            var last = await db.OperationTemplates.Where(t => t.Key == schema.Key).MaxAsync(t => (int?)t.Version, token) ?? 0;
            db.OperationTemplates.Add(new() { Key = schema.Key, Version = last + 1, ContentHash = hash, SchemaJson = json });
        }
        await db.SaveChangesAsync(token);
    }
}
