import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function provider({ loadOrganizationData = true, failLoading = false } = {}) {
  let source = fs.readFileSync(new URL('../src/context/AppProvider.tsx', import.meta.url), 'utf8')
  const parsed = ts.createSourceFile('AppProvider.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const node of [...parsed.statements].reverse()) if (ts.isImportDeclaration(node)) source = source.slice(0, node.pos) + source.slice(node.end)
  source = source.replace('export function AppProvider', 'function AppProvider')
  const org = { id: 'current', role: 'Owner', isArchived: false }
  const states = []; states[2] = [org, { id: 'other', role: 'Owner', isArchived: false }]
  if (failLoading) states[8] = { orgId: org.id, access: { permissions: [] } }
  const mutations = [], effects = []
  let slot = 0
  const context = vm.createContext({
    React: { createElement: (type, props) => ({ type, props }) }, AppContext: { Provider: 'Provider' },
    useLocale() {}, useAuth: () => ({ isAuthenticated: true, user: { id: 'user' } }),
    useMemo: fn => fn(), orderRecords: records => records, useEffect: callback => effects.push(callback), useCallback: fn => fn, useRef: current => ({ current }),
    useState(initial) { const index = slot++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => mutations.push({ index, value })] },
    localStorage: { getItem: () => 'current', setItem() {} }, tr: value => value,
    hasPermission: () => true, queueMicrotask: callback => callback(), setTimeout: () => 0, uuidv7: () => "toast-id",
    ...Object.fromEntries(["assetsApi", "passwordsApi", "subnetsApi", "licensesApi", "contactsApi", "contractsApi", "plansApi", "incidentsApi", "knowledgeApi", "tasksApi", "projectsApi", "groupsApi", "warrantyApi", "diagramApi"].map(name => [name, { getAll: () => Promise.reject(Error("offline")), get: () => Promise.reject(Error("offline")) }])),
  })
  vm.runInContext(ts.transpileModule(source, { fileName: 'AppProvider.tsx', compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext } }).outputText, context)
  const value = context.AppProvider({ children: null, loadOrganizationData }).props.value
  return { value, mutations, effects }
}

test('reopening the current organization never clears permissions or waits for the polling interval', () => {
  const { value, mutations } = provider()
  value.switchOrg('current')
  assert.deepEqual(mutations, [])
})

test('switching to another organization clears the previous access before changing selection', () => {
  const { value, mutations } = provider()
  value.switchOrg('other')
  assert.ok(mutations.some(change => change.index === 8 && change.value === undefined))
  assert.ok(mutations.some(change => change.index === 3 && change.value === 'other'))
})

test('settings and export can load independently of the organization resource collections', () => {
  const { value } = provider({ loadOrganizationData: false })
  assert.equal(value.isLoading, false)
  assert.deepEqual(Array.from(value.assets), [])
})


test('a failed resource request clears loading and never exposes previous organization data', async () => {
  const { mutations, effects } = provider({ failLoading: true })
  effects.find(callback => callback.toString().includes('Promise.all'))()
  await new Promise(resolve => setImmediate(resolve))
  assert.ok(mutations.some(change => change.index === 9 && change.value?.permissions), 'the failed request completes the current permission revision')
  assert.ok(mutations.some(change => change.index === 6 && change.value === false), 'the spinner stops')
  const data = mutations.filter(change => change.index === 4).at(-1).value
  assert.ok(Object.values(data).every(collection => collection.length === 0))
})
