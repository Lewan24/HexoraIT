import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function harness(file, component, app, slice = false) {
  let source = fs.readFileSync(new URL(`../src/components/${file}`, import.meta.url), 'utf8')
  if (slice) source = source.slice(source.indexOf(`function ${component}`), source.indexOf('export default function'))
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const node of [...parsed.statements].reverse()) if (ts.isImportDeclaration(node)) source = source.slice(0, node.pos) + source.slice(node.end)
  source = source.replace('export default function', 'function')
  const states = []
  let slot = 0
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useLocale() {}, tr: value => value, locale: () => 'pl',
    useState(initial) {
      const index = slot++
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value }]
    },
    useEffect() {}, useCallback: fn => fn, useRef: current => ({ current }), useApp: () => app,
    STRENGTH_STYLES: {}, STRENGTH_BAR: {}, navigator: { clipboard: { writeText: async () => {} } },
    console, setTimeout: () => 0, clearTimeout() {},
  }
  for (const [, name] of source.matchAll(/<([A-Z]\w*)(?=[\s/>])/g)) context[name] ??= () => null
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(source, { fileName: file, compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 } }).outputText, context)
  return { context, states, render: props => { slot = 0; return context[component](props) } }
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...nodes(tree.props?.children)]
}
const selected = { id: 'secret', name: 'Entry', username: 'user', category: 'Other', strength: 'strong', tags: [], updatedAt: '' }

test('copy preserves literal quotes without revealing; reveal requires a separate click', async () => {
  const secret = '"literal quotes"\\with/slashes'
  const copied = []
  const h = harness('PasswordVault.tsx', 'PasswordDetail', { canWrite: () => true, revealPassword: async () => secret }, true)
  h.context.navigator.clipboard.writeText = async value => copied.push(value)
  await nodes(h.render({ selected })).find(n => n.props?.title === 'Copy password').props.onClick()
  assert.deepEqual(copied, [secret])
  assert.equal(h.states[0], null)
  const tree = h.render({ selected })
  assert.ok(!JSON.stringify(tree).includes(secret))
  await nodes(tree).find(n => n.props?.title === 'Reveal').props.onClick()
  assert.equal(h.states[0].value, secret)
})

test('clipboard failure reports error without success or password reveal', async () => {
  const errors = []
  const h = harness('PasswordVault.tsx', 'PasswordDetail', { canWrite: () => true, revealPassword: async () => 'secret', toast: (...args) => errors.push(args) }, true)
  h.context.navigator.clipboard.writeText = async () => { throw Error('denied') }
  await nodes(h.render({ selected })).find(n => n.props?.title === 'Copy password').props.onClick()
  assert.equal(h.states[0], null)
  assert.equal(h.states[2], null)
  assert.equal(errors[0][1], 'error')
})

const dashboardData = hiddenModules => ({
  ...Object.fromEntries(['assets', 'licenses', 'knowledgeArticles', 'passwords', 'tasks', 'contracts', 'plans', 'incidents', 'warrantyItems', 'projects'].map(key => [key, []])),
  contacts: Array.from({ length: 100 }, (_, i) => ({ id: String(i), name: `Contact ${i}`, company: '', role: '' })),
  hiddenModules, canRead: resource => !hiddenModules.includes(resource), isLoading: false,
})

test('dashboard caps a hundred contacts at the personal card limit', () => {
  const h = harness('Dashboard.tsx', 'Dashboard', dashboardData([]))
  h.states[1] = 3
  const all = nodes(h.render({ navigate() {} }))
  assert.equal(all.filter(n => n.type === 'p' && /^Contact \d+$/.test(String(n.props.children[0]))).length, 3)
  assert.ok(all.some(n => n.props?.title === 'Important Contacts'))
})

test('hidden modules disappear from cards, quick actions, attention and statistics', () => {
  const hidden = ['contacts', 'licenses', 'warranty', 'assets', 'passwords', 'knowledge']
  const h = harness('Dashboard.tsx', 'Dashboard', dashboardData(hidden))
  const targets = []
  const all = nodes(h.render({ navigate: target => targets.push(target) }))
  for (const title of ['Important Contacts', 'Upcoming License Renewals', 'Expiring Warranties', 'Favorite Assets', 'Recent Documents']) assert.ok(!all.some(n => n.props?.title === title), title)
  for (const node of all.filter(n => n.type === 'button' && n.props.onClick)) node.props.onClick()
  assert.ok(targets.every(target => !hidden.includes(target)))
})

test('license key stays masked in the rendered content while copying its exact value', async () => {
  const copied = []
  const h = harness('Licenses.tsx', 'LicenseDetail', { toast() {} })
  h.context.navigator.clipboard.writeText = async value => copied.push(value)
  const license = { id: 'license', name: 'License', category: 'Software', status: 'active', type: 'Perpetual', seats: 0, cost: 0, expiryDate: '2030-01-01', licenseKey: '"actual-key"' }
  const tree = h.render({ license })
  assert.ok(!JSON.stringify(tree).includes(license.licenseKey))
  await nodes(tree).find(n => n.type === 'button' && n.props.children[0] === 'Copy').props.onClick()
  assert.deepEqual(copied, [license.licenseKey])
  assert.equal(h.states[0], false)
})
