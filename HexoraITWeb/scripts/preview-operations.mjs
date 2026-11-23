// Offline visual QA of real components. Run the backend fixture test first.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const root = new URL('../../', import.meta.url)
const output = new URL('output/', root)
const fixtures = JSON.parse(fs.readFileSync(new URL('operations-fixtures.json', output), 'utf8'))
const compile = (source, fileName) => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { fileName, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText.replaceAll('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime'))).replaceAll('"react"', JSON.stringify(import.meta.resolve('react')))).toString('base64')
const catalog = JSON.parse(fs.readFileSync(new URL('../src/i18n/pl.json', import.meta.url), 'utf8'))
const i18n = `const tr = s => (${JSON.stringify(catalog)})[s] ?? s; const useLocale = () => ({ i18n: { language: 'pl' } });`
const formSource = fs.readFileSync(new URL('../src/components/OperationForm.tsx', import.meta.url), 'utf8').replace(/import \{ tr, useLocale \} from ['"]\.\.\/i18n['"];?/, i18n).replace(/(['"])\.\.\/lib\/operationForm\1/g, JSON.stringify(compile(fs.readFileSync(new URL('../src/lib/operationForm.ts', import.meta.url), 'utf8'), 'operationForm.ts')))
const formModule = compile(formSource, 'OperationForm.tsx')
const { default: Form } = await import(formModule)
const librarySource = fs.readFileSync(new URL('../src/components/OperationAdministration.tsx', import.meta.url), 'utf8')
  .replace(/import \{ tr, useLocale \} from ['"]\.\.\/i18n['"];?/, i18n)
  .replace(/(['"])\.\/OperationForm\1/g, JSON.stringify(formModule))
  .replace(/(['"])\.\.\/lib\/operationForm\1/g, JSON.stringify(compile(fs.readFileSync(new URL('../src/lib/operationForm.ts', import.meta.url), 'utf8'), 'operationForm.ts')))
  .replace(/(['"])\.\.\/api\/operations\1/g, JSON.stringify(compile('export const operationsApi = {}', 'operations-api-stub.ts')))
const { default: Policy, OperationTemplateLibrary: Library } = await import(compile(librarySource, 'OperationAdministration.tsx'))
const editorSource = fs.readFileSync(new URL('../src/components/Operations.tsx', import.meta.url), 'utf8')
  .replace(/import \{ tr, useLocale, locale \} from ['"]\.\.\/i18n['"];?/, i18n + ' const locale = () => "pl";')
  .replace(/import \{ useApp \} from ['"]\.\.\/context\/useApp['"];?/, 'const useApp = () => ({ assets: [], canWrite: () => true });')
  .replace(/import \{ useAuth \} from ['"]\.\.\/context\/useAuth['"];?/, 'const useAuth = () => ({ user: null });')
  .replace(/(['"])\.\/OperationForm\1/g, JSON.stringify(formModule))
  .replace(/(['"])\.\/OperationAdministration\1/g, JSON.stringify(compile(librarySource, 'OperationAdministration.tsx')))
  .replace(/(['"])\.\.\/lib\/operationForm\1/g, JSON.stringify(compile(fs.readFileSync(new URL('../src/lib/operationForm.ts', import.meta.url), 'utf8'), 'operationForm.ts')))
  .replace(/(['"])\.\.\/api\/operations\1/g, JSON.stringify(compile('export const operationsApi = {}', 'operations-api-stub.ts')))
  .replace(/from "lucide-react"/g, 'from ' + JSON.stringify(import.meta.resolve('lucide-react')))
  .replace('function OperationEditor(', 'export function OperationEditor(')
const { OperationEditor: Editor } = await import(compile(editorSource, 'Operations.tsx'))
let licenseSource = fs.readFileSync(new URL('../src/components/Licenses.tsx', import.meta.url), 'utf8')
licenseSource = licenseSource.slice(licenseSource.indexOf('function LicenseModal'), licenseSource.indexOf('function LicenseDetail'))
licenseSource = `import { useState } from "react"; import { X, Star, Loader2 } from ${JSON.stringify(import.meta.resolve('lucide-react'))}; ${i18n}
const CATEGORIES = ['Software']; const LICENSE_TYPES = ['Subscription', 'Perpetual']; const inp = () => 'w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-xs disabled:opacity-50';
${licenseSource}
export default LicenseModal;`
const { default: License } = await import(compile(licenseSource, 'LicenseModal.tsx'))
const assetsDir = new URL('../dist/assets/', import.meta.url)
const cssName = fs.readdirSync(assetsDir).find(n => /^index-.*\.css$/.test(n))
const css = fs.readFileSync(new URL(cssName, assetsDir), 'utf8').replace(/@import\s+(?:"[^"]*"|'[^']*'|url\([^)]*\))\s*;/g, '')
function write(name, markup, theme) {
  const html = `<!doctype html><html lang="pl" data-theme="${theme}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>${css}</style><body class="bg-navy-950 text-ink-primary">${markup}</body></html>`
  fs.writeFileSync(new URL(name + '.html', output), html)
}
for (const theme of ['light', 'dark']) {
  const basic = fixtures.find(f => f.schema.key === 'BASIC').schema
  write(`operations-basic-${theme}`, renderToStaticMarkup(createElement(Editor, { org: 'synthetic', template: { id: 'synthetic-basic', version: 1, schemaJson: JSON.stringify(basic) }, onBack() {}, onCreated() {} })), theme)
  const { schema, values } = fixtures.find(fixture => fixture.schema.key === 'A02')
  const form = createElement('main', { className: 'mx-auto max-w-5xl p-6 space-y-5' }, createElement('h1', { className: 'text-xl font-semibold' }, 'Operacje i zmiany IT — A02'), createElement('p', { className: 'text-sm text-ink-secondary' }, schema.description.pl), createElement('section', { className: 'rounded-xl border border-edge-subtle bg-navy-800 p-6' }, createElement(Form, { fields: schema.fields, values, onChange() {}, errors: {} })))
  write(`operations-gpo-${theme}`, renderToStaticMarkup(form), theme)
  const templates = fixtures.map(({schema}) => ({id: `SYNTHETIC-${schema.key}`, key: schema.key, version: 1, schemaJson: JSON.stringify(schema), contentHash: 'SYNTHETIC-CONTENT-HASH', active: true, organizationId: null, settingToken: '00000000-0000-0000-0000-000000000000'}))
  const library = createElement('main', {className: 'mx-auto max-w-7xl p-6 space-y-5'}, createElement('h1', {className:'text-xl font-semibold'}, 'Szablony dokumentów'), createElement(Library, {org:'synthetic', templates, canManage:true, onChanged(){}, onCreate(){}}))
  write(`operations-library-${theme}`, renderToStaticMarkup(library), theme)
  const policy = createElement('main', {className:'mx-auto max-w-5xl p-6'}, createElement(Policy, {org:'synthetic', initial:{revisionToken:'00000000-0000-0000-0000-000000000000',standardPreApproved:false,requireLowRiskApproval:true,requireNormalApproval:true,separateHighRiskDuties:true,allowLowRiskSelfApproval:false,allowDocumentedExceptions:false,retentionDays:2555,reportingRulesJson:'{"reference":"SYNTHETIC-POLICY"}'}, onSaved(){}}))
  write(`operations-policy-${theme}`, renderToStaticMarkup(policy), theme)
  for (const type of ['Perpetual', 'Subscription']) write(`license-${type.toLowerCase()}-${theme}`, renderToStaticMarkup(createElement(License, { initial: { id: 'synthetic', name: 'SYNTHETIC License', vendor: 'Synthetic vendor', type, expiryDate: '2027-01-01', category: 'Software' }, onClose() {}, onSave() {} })), theme)
}
console.log('Generated twelve offline component previews in', fileURLToPath(output))
