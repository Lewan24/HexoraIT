import fs from 'node:fs'
import ts from 'typescript'
const translations = {
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
for (const name of ['Operations.tsx', 'OperationForm.tsx']) {
  const source = fs.readFileSync(new URL(`../src/components/${name}`, import.meta.url), 'utf8')
  const ast = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(ast) === 'tr' && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && !(node.arguments[0].text in catalog)) console.log('Missing:', node.arguments[0].text)
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
