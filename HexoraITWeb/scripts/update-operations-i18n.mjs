import fs from 'node:fs'
import ts from 'typescript'
const translations = {
  'Basic document': 'Dokument podstawowy', 'Advanced template': 'Szablon zaawansowany',
  'Includes saved basic and advanced records, including drafts with their status. Save edits before generating.': 'Obejmuje zapisane wpisy podstawowe i zaawansowane, w tym szkice z ich statusem. Zapisz zmiany przed generowaniem.',
  'Template updated.': 'Zaktualizowano szablon.',
  'Import organization template': 'Importuj szablon organizacji', 'Publish a new template version': 'Opublikuj nową wersję szablonu',
  'Published versions stay immutable. Existing documents keep their original schema.': 'Opublikowane wersje są niezmienne. Istniejące dokumenty zachowują swój pierwotny schemat.',
  'JSON file': 'Plik JSON', 'Template is too large.': 'Szablon jest za duży.', 'Validate schema': 'Sprawdź schemat',
  'Import template': 'Importuj szablon', 'Publish version': 'Opublikuj wersję', 'Schema is valid.': 'Schemat jest prawidłowy.',
  'Form preview': 'Podgląd formularza', 'Search templates': 'Szukaj szablonów', 'Template scope': 'Zakres szablonu',
  'System templates': 'Szablony systemowe', 'Organization templates': 'Szablony organizacji', 'Organization template': 'Szablon organizacji',
  'System template': 'Szablon systemowy', 'Template versions': 'Wersje szablonu', 'Export JSON': 'Eksportuj JSON',
  'Clone to organization': 'Klonuj do organizacji', 'Edit as new version': 'Edytuj jako nową wersję', 'Activate': 'Aktywuj', 'Deactivate': 'Dezaktywuj',
  'Organization operations policy': 'Polityka operacji organizacji', 'Approval rules': 'Zasady zatwierdzania',
  'High-risk changes always require approval. Exceptions record the authenticated administrator, reason and time.': 'Zmiany wysokiego ryzyka zawsze wymagają zgody. Wyjątki zapisują zalogowanego administratora, uzasadnienie i czas.',
  'Pre-approve standard changes': 'Wstępnie zatwierdzaj zmiany standardowe', 'Require approval for low-risk changes': 'Wymagaj zgody dla zmian niskiego ryzyka',
  'Require approval for normal changes': 'Wymagaj zgody dla zmian zwykłych', 'Separate requester and implementer for high-risk changes': 'Rozdziel wnioskodawcę i wykonawcę dla zmian wysokiego ryzyka',
  'Allow low-risk self-approval': 'Zezwalaj na samodzielne zatwierdzenie przy niskim ryzyku', 'Allow administrator policy exceptions with a reason': 'Zezwalaj administratorom na uzasadnione wyjątki od polityki',
  'Evidence retention (days)': 'Retencja dowodów (dni)', 'Retention is organization policy data. Archived records are never deleted automatically.': 'Retencja jest ustawieniem organizacji. Zarchiwizowane wpisy nigdy nie są usuwane automatycznie.',
  'Reporting criteria and deadlines (JSON data)': 'Kryteria i terminy zgłoszeń (dane JSON)',
  'Maintain current authority references, criteria and deadlines here. These values do not execute code or determine legal reportability.': 'Zapisuj tutaj aktualne organy, kryteria i terminy. Te dane nie wykonują kodu ani nie ustalają prawnego obowiązku zgłoszenia.',
  'Save policy': 'Zapisz politykę', 'Policy saved.': 'Zapisano politykę.', 'Implementer': 'Wykonawca', 'Responsible owner': 'Odpowiedzialny właściciel',
  'Requester (default)': 'Wnioskodawca (domyślnie)', 'Policy exception reason (optional)': 'Uzasadnienie wyjątku od polityki (opcjonalne)',
  'PolicyException': 'Wyjątek od polityki', 'Secrets must be stored in the credential vault.': 'Sekrety należy przechowywać w sejfie poświadczeń.',
  'Expected true or false.': 'Wymagana wartość prawda lub fałsz.', 'Invalid choices.': 'Nieprawidłowe wybrane wartości.', 'Invalid number.': 'Nieprawidłowa liczba.',
  'Number is outside the allowed range.': 'Liczba jest poza dozwolonym zakresem.', 'Value is too short.': 'Wartość jest za krótka.',
  'Value does not match the allowed format.': 'Wartość nie pasuje do dozwolonego formatu.',
  'Pass': 'Spełniono', 'Fail': 'Nie spełniono', 'Not applicable': 'Nie dotyczy', 'Open': 'Otwarte', 'Retain': 'Pozostaw', 'Revoke': 'Odbierz', 'Modify': 'Zmień',
  'Install': 'Zainstaluj', 'Upgrade': 'Zaktualizuj', 'Remove': 'Usuń', 'Add': 'Dodaj', 'Site-to-site': 'Między lokalizacjami', 'Remote access': 'Dostęp zdalny',
  'Undetermined': 'Nieustalone', 'Potentially reportable': 'Potencjalnie podlegające zgłoszeniu', 'Not reportable': 'Nie podlega zgłoszeniu',
  'Mitigate': 'Ogranicz', 'Avoid': 'Unikaj', 'Transfer': 'Przenieś', 'Accept': 'Zaakceptuj',
  'Select': 'Wybierz',
  'Search': 'Szukaj', 'All': 'Wszystkie', 'Number': 'Numer', 'Page': 'Strona', 'Records': 'Wpisy',
  'Sort by': 'Sortuj według', 'Previous': 'Poprzednia', 'Next': 'Następna', 'Back': 'Wstecz', 'Export PDF': 'Eksportuj PDF', 'None': 'Brak', 'Action': 'Akcja',
  'IT Operations & Changes': 'Operacje i zmiany IT', operations: 'Operacje i zmiany IT',
  'Related Changes': 'Powiązane zmiany', 'Changes, operational records and security evidence': 'Zmiany, dokumentacja operacyjna i dowody bezpieczeństwa',
  'New record': 'Nowy wpis', 'Select template': 'Wybierz szablon', 'Change Register': 'Rejestr zmian', 'My Documents': 'Moje dokumenty',
  'Pending Approvals': 'Oczekujące zatwierdzenia', 'Document Templates': 'Szablony dokumentów', 'Template schema': 'Schemat szablonu',
  'Change type': 'Typ zmiany', 'Risk': 'Ryzyko', 'Last modified': 'Ostatnia modyfikacja',
  'No records found.': 'Nie znaleziono wpisów.', 'Unable to load records.': 'Nie można wczytać wpisów.',
  'Do not enter secrets. Store them in Passwords and reference the record.': 'Nie wpisuj sekretów. Zapisz je w module Hasła i podaj odnośnik do wpisu.',
  'Control references support evidence collection; they do not certify compliance.': 'Odnośniki do kontroli pomagają gromadzić dowody; nie stanowią certyfikacji zgodności.',
  'Save draft': 'Zapisz szkic', 'Unsaved changes': 'Niezapisane zmiany', 'Saved': 'Zapisano', 'Back to register': 'Wróć do rejestru',
  'Discard unsaved changes?': 'Odrzucić niezapisane zmiany?', 'Workflow action': 'Akcja procesu', 'Apply action': 'Wykonaj akcję',
  'Decision / execution / verification notes': 'Uwagi do decyzji / wykonania / weryfikacji',
  'Save draft before applying a workflow action.': 'Zapisz szkic przed wykonaniem akcji procesu.',
  'Complete the required fields before submission.': 'Uzupełnij wymagane pola przed wysłaniem.',
  'Activity and revisions': 'Aktywność i wersje', 'Revision history': 'Historia wersji', 'Planned start': 'Planowany początek', 'Planned end': 'Planowany koniec',
  'Related asset': 'Powiązany zasób', 'Reload': 'Wczytaj ponownie', 'Add row': 'Dodaj wiersz', 'Remove row': 'Usuń wiersz', 'Row': 'Wiersz',
  'Submitted': 'Wysłany', 'Under Review': 'W trakcie przeglądu', 'Awaiting Approval': 'Oczekuje na zatwierdzenie',
  'Approved': 'Zatwierdzony', 'Scheduled': 'Zaplanowany', 'In Progress': 'W realizacji', 'Verification': 'Weryfikacja',
  'Completed': 'Ukończony', 'Closed': 'Zamknięty', 'Rejected': 'Odrzucony', 'Cancelled': 'Anulowany', 'Failed': 'Niepowodzenie', 'Rolled Back': 'Wycofany',
  'Archived': 'Zarchiwizowany', 'RetrospectiveReview': 'Przegląd po zmianie awaryjnej', 'Standard': 'Standardowa', 'Normal': 'Zwykła', 'Emergency': 'Awaryjna',
  'Created': 'Utworzono', 'DraftSaved': 'Zapisano szkic', 'Successful': 'Udany', 'Partial': 'Częściowy', 'Allow': 'Zezwól', 'Deny': 'Zablokuj', 'Reject': 'Odrzuć',
  'Expected 1–50 rows.': 'Wymagane 1–50 wierszy.', 'Expected text.': 'Wymagana wartość tekstowa.',
  'Unknown or duplicate field.': 'Nieznane lub powtórzone pole.', 'Value is too long.': 'Wartość jest za długa.',
  'Invalid option.': 'Nieprawidłowa opcja.', 'Invalid date.': 'Nieprawidłowa data.', 'Invalid date/time.': 'Nieprawidłowa data lub godzina.',
  'Only HTTP(S) URLs are allowed.': 'Dozwolone są tylko adresy HTTP(S).', 'Verification results are required for success.': 'Udany wynik wymaga zapisania wyników weryfikacji.',
}
for (const language of ['en', 'pl']) {
  const file = new URL(`../src/i18n/${language}.json`, import.meta.url)
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const [key, translation] of Object.entries(translations)) if (!(key in catalog)) catalog[key] = language === 'pl' ? translation : key
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n')
}
const catalog = JSON.parse(fs.readFileSync(new URL('../src/i18n/en.json', import.meta.url), 'utf8'))
for (const name of ['Operations.tsx', 'OperationForm.tsx', 'OperationAdministration.tsx']) {
  const source = fs.readFileSync(new URL(`../src/components/${name}`, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'tr' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && !(node.arguments[0].text in catalog)) console.log('Missing:', node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
