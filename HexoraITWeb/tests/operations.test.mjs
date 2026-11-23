import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const compile = (source, filename = 'source.ts') => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { fileName: filename, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))).toString('base64')
const { validateOperationForm, operationVisible, operationDefaults } = await import(compile(read('../src/lib/operationForm.ts')))
const labels = { en: 'Setting <script>', pl: 'Ustawienie' }
const fields = [{ key: 'name', label: labels, type: 'text', required: true, maxLength: 20 }, { key: 'changes', label: labels, type: 'table', required: true, maxLength: 4000, fields: [{ key: 'previous', label: labels, type: 'text', required: true, maxLength: 20 }, { key: 'next', label: labels, type: 'text', required: true, maxLength: 20 }] }]
const schema = { schemaVersion: 1, key: 'A02', fields }

test('drafts allow missing fields; submission validates each repeated row', () => {
  assert.deepEqual(validateOperationForm(schema, {}, false), {})
  assert.deepEqual(Object.keys(validateOperationForm(schema, {}, true)).sort(), ['changes', 'name'])
  const values = { name: 'GPO', changes: [{ previous: 'off', next: 'on' }, { previous: 'old', next: '' }] }
  assert.equal(validateOperationForm(schema, values, true)['changes.1.next'], 'Required')
  values.changes[1].next = 'new'
  assert.deepEqual(validateOperationForm(schema, values, true), {})
  assert.ok(validateOperationForm(schema, { ...values, changes: Array(51).fill({}) }, false).changes)
})

test('conditional required fields, typed values, defaults and secret instructions match backend semantics', () => {
  const conditional = { match: 'AND', rules: [{field: 'enabled', operator: 'equals', value: true}], groups: [{match: 'OR', rules: [{field: 'count', operator: 'greaterThan', value: 1}, {field: 'mode', operator: 'in', value: ['Emergency']}]}] }
  const typed = { key: 'ORG_TEST', fields: [
    {key: 'enabled', type: 'boolean', defaultValue: false, maxLength: 100},
    {key: 'count', type: 'integer', minimum: 0, maximum: 3, maxLength: 100},
    {key: 'mode', type: 'radio', options: ['Normal', 'Emergency'], maxLength: 100},
    {key: 'tags', type: 'multiselect', options: ['A', 'B'], maxItems: 2, maxLength: 100},
    {key: 'details', type: 'text', required: true, visibleWhen: conditional, maxLength: 50},
    {key: 'secret', type: 'text', sensitivity: 'Secret', maxLength: 100},
  ] }
  assert.deepEqual(operationDefaults(typed.fields), {enabled: false})
  assert.equal(operationVisible(conditional, {enabled: true, count: 2}), true)
  assert.equal(operationVisible(conditional, {enabled: false, count: 2}), false)
  assert.equal(operationVisible(conditional, {enabled: true, mode: 'Emergency'}), true)
  assert.deepEqual(validateOperationForm(typed, {enabled: false, count: 0}, true), {})
  assert.equal(validateOperationForm(typed, {enabled: true, count: 2}, true).details, 'Required')
  const errors = validateOperationForm(typed, {enabled: 'true', count: 1.5, tags: ['A', 'A'], secret: 'do not store'}, false)
  for (const key of ['enabled', 'count', 'tags', 'secret']) assert.ok(errors[key], key)
  assert.ok(validateOperationForm(typed, {count: 5}, false).count)
})

test('closed types reject invalid options, script URLs, dates, excess values and unverified restore success', () => {
  const checks = { key: 'D02', fields: [
    { key: 'outcome', type: 'select', options: ['Successful', 'Failed'], maxLength: 100 },
    { key: 'evidence', type: 'url', maxLength: 100 }, { key: 'testDate', type: 'date', maxLength: 100 },
    { key: 'integrity', type: 'text', maxLength: 100 }, { key: 'functionality', type: 'text', maxLength: 100 },
  ] }
  const errors = validateOperationForm(checks, { outcome: 'Successful', evidence: 'javascript:alert(1)', testDate: '2026-02-31', unknown: 'x' }, true)
  for (const key of ['evidence', 'testDate', 'unknown', 'integrity', 'functionality']) assert.ok(errors[key], key)
  assert.ok(validateOperationForm(checks, { outcome: 'unrecognized' }, false).outcome)
})

test('dynamic renderer labels controls, exposes row errors, escapes content and disables read-only records', async () => {
  let source = read('../src/components/OperationForm.tsx')
  source = source.replace(/import \{ tr, useLocale \} from ['"]\.\.\/i18n['"];?/, "const tr = s => s; const useLocale = () => ({ i18n: { language: 'en' } })")
  source = source.replace(/(['"])\.\.\/lib\/operationForm\1/g, JSON.stringify(compile(read('../src/lib/operationForm.ts'))))
  const { default: Form } = await import(compile(source, 'OperationForm.tsx'))
  const html = renderToStaticMarkup(createElement(Form, { fields, values: { name: '<script>evil</script>', changes: [{ previous: 'old', next: 'new' }] }, onChange() {}, errors: { 'changes.0.next': 'Required' }, disabled: true }))
  assert.match(html, /for="operation-changes.0.next"/)
  assert.match(html, /aria-invalid="true"/)
  assert.match(html, /aria-describedby="operation-changes.0.next-help"/)
  assert.match(html, /disabled=""/)
  assert.match(html, /&lt;script&gt;evil&lt;\/script&gt;/)
  assert.doesNotMatch(html, /<script>/)
})

test('lifetime license create and edit dialogs disable expiry and save without requiring a date', async () => {
  let source = read('../src/components/Licenses.tsx')
  source = source.slice(source.indexOf('function LicenseModal'), source.indexOf('function LicenseDetail'))
  const states = []; let slot = 0
  const context = { tr: x => x, useLocale() {}, inp: () => '', LICENSE_TYPES: ['Subscription', 'Perpetual'], CATEGORIES: ['Software'], React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) }, useState(initial) { const i = slot++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] } }
  for (const [, name] of source.matchAll(/<([A-Z]\w*)(?=[\s/>])/g)) context[name] = () => null
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(source, { fileName: 'Licenses.tsx', compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText, context)
  const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)]
  let saved
  const props = { onClose() {}, onSave: async data => { saved = data } }
  const render = () => { slot = 0; return nodes(context.LicenseModal(props)) }
  render()
  states[0] = { ...states[0], type: 'Perpetual', name: 'Lifetime', vendor: 'Synthetic', expiryDate: '' }
  let tree = render()
  assert.equal(tree.find(n => n.props?.id === 'license-expiry').props.disabled, true)
  const submit = tree.filter(n => n.type === 'button').find(n => n.props.onClick?.constructor.name === 'AsyncFunction')
  assert.ok(submit)
  await submit.props.onClick()
  assert.equal(saved.expiryDate, '9999-12-31')
  states[0] = { ...states[0], type: 'Subscription' }; states[2] = false
  tree = render()
  assert.equal(tree.find(n => n.props?.id === 'license-expiry').props.disabled, false)
})
