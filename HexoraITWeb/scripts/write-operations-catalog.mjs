// Generate documentation from the real definitions exported by the opt-in backend fixture test.
import fs from 'node:fs'
const fixtures = JSON.parse(fs.readFileSync(new URL('../../output/operations-fixtures.json', import.meta.url), 'utf8'))
const lines = ['# Built-in operations template catalog', '',
  'The 72 detailed catalog definitions and the additional BASIC document below use the shared dynamic form, storage, workflow and export engine. BASIC provides a quick note/procedure with content and optional evidence references; advanced templates retain their detailed validation. There are no empty/schema-only placeholders. Automated testing creates, submits and closes every definition; PDF generation is additionally checked for all 21 required MVP templates. Module-wide remaining features are listed in [the continuation report](it-operations-continuation-report.md).', '',
  '| Key | English name | Polska nazwa | Lifecycle | Status |', '|---|---|---|---|---|']
for (const {schema} of fixtures) {
  const lifecycle = schema.kind === 'Record' || schema.key === 'D02' ? (schema.requiresApproval ? 'Document with approval' : 'Operational record') : 'Change workflow / organization policy'
  lines.push(`| ${schema.key} | ${schema.name.en} | ${schema.name.pl} | ${lifecycle} | Functional through shared engine |`)
}
lines.push('', 'Built-in publication is identified by key/content hash. Changed definitions append new immutable versions. Existing documents retain their exact version. Administrators customize by cloning to an organization-owned template, never by mutating a system version.', '')
fs.writeFileSync(new URL('../../docs/it-operations-catalog.md', import.meta.url), lines.join('\n'))
console.log(`Documented ${fixtures.length} actual template definitions.`)
