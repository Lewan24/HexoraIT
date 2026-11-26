// Generate documentation from the real definitions exported by the opt-in backend fixture test.
import fs from 'node:fs'
const fixtures = JSON.parse(fs.readFileSync(new URL('../../output/operations-fixtures.json', import.meta.url), 'utf8'))
const lines = ['# Built-in operations template catalog', '',
  'Katalog obejmuje 72 szablony zaawansowane i szablon BASIC. Dokument podstawowy służy do zapisu krótkiej notatki lub procedury. Szablony zaawansowane mają pola i etap zatwierdzania zależne od rodzaju operacji. [Przewodnik użytkownika](user-guide.md#operacje-it-i-dokumentacja-pdf)', '',
  '| Key | English name | Polska nazwa | Lifecycle | Status |', '|---|---|---|---|---|']
for (const {schema} of fixtures) {
  const lifecycle = schema.kind === 'Record' || schema.key === 'D02' ? (schema.requiresApproval ? 'Document with approval' : 'Operational record') : 'Change workflow / organization policy'
  lines.push(`| ${schema.key} | ${schema.name.en} | ${schema.name.pl} | ${lifecycle} | Functional through shared engine |`)
}
lines.push('', 'Built-in publication is identified by key/content hash. Changed definitions append new immutable versions. Existing documents retain their exact version. Administrators customize by cloning to an organization-owned template, never by mutating a system version.', '')
fs.writeFileSync(new URL('../../docs/it-operations-catalog.md', import.meta.url), lines.join('\n'))
console.log(`Documented ${fixtures.length} actual template definitions.`)
