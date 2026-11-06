import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function editor() {
  let source = fs.readFileSync(new URL('../src/components/OrganizationDataTransfer.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('transfer.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const node of [...ast.statements].reverse()) if (ts.isImportDeclaration(node)) source = source.slice(0, node.pos) + source.slice(node.end)
  source = source.replace('export default function', 'function')
  const states = [{ canExport: true, canImport: true, isEmpty: true, maxArchiveBytes: 256 * 1024 * 1024 }]
  // Use non-empty source data for export without storing account passwords anywhere outside React state.
  states[0].isEmpty = false
  const preview = { organizationName: 'Source', counts: { contacts: 1 }, fileCount: 0, fileBytes: 0, reviewToken: 'signed-review' }
  states[13] = { sections: [{ key: 'contacts', count: 1 }, { key: 'files', count: 2 }], files: [{ id: 'file-a', name: 'a.txt', size: 10 }, { id: 'file-b', name: 'b.zip', size: 4096 }] }
  states[14] = ['contacts']
  const exports = [], imports = [], reviews = [], notifications = []
  const dialog = { open: false, showModal() { this.open = true }, close() { this.open = false } }
  const refs = [{ current: dialog }, { current: null }, { current: { value: '' } }]
  let stateSlot = 0, refSlot = 0
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useLocale() {}, tr: key => key, useApp: () => ({ toast: (...args) => notifications.push(args) }),
    useEffect() {}, useRef: () => refs[refSlot++],
    useState(initial) { const i = stateSlot++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
    dataTransferApi: {
      export: async (...args) => { exports.push(args); return '/api/data-transfer/download?ticket=opaque' },
      preview: async (...args) => { reviews.push(args); return preview },
      import: async (...args) => { imports.push(args); return { importedRecords: 1, importedFiles: 0 } },
    },
    AbortController, Blob, URL: { createObjectURL: () => 'blob:zip', revokeObjectURL() {} },
    document: { createElement: () => ({ click() {}, remove() {} }), body: { append() {} } },
    window: { setTimeout() {}, dispatchEvent() {} }, Event,
  }
  for (const [, name] of source.matchAll(/<([A-Z]\w*)(?=[\s/>])/g)) context[name] ??= () => null
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(source, { fileName: 'transfer.tsx', compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext } }).outputText, context)
  return { states, exports, imports, reviews, notifications, preview,
    render: () => { stateSlot = 0; refSlot = 0; return context.TransferEditor({ orgId: 'destination', orgName: 'Destination' }) } }
}
function nodes(node) { if (!node || typeof node !== 'object') return []; return Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)] }
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && node.props.children.includes(label))
const submit = tree => nodes(tree).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} })
const field = (tree, type) => (type === 'checkbox' ? nodes(nodes(tree).find(n => n.type === 'form')) : nodes(tree)).find(node => node.type === 'input' && (type === 'password' ? node.props.autoComplete === 'current-password' : node.props.type === type))
const tick = () => new Promise(resolve => setImmediate(resolve))

test('ZIP export cannot run before account password and confidential scope approval; password clears after completion', async () => {
  const e = editor()
  button(e.render(), 'Export ZIP').props.onClick()
  submit(e.render()); await tick(); assert.equal(e.exports.length, 0)
  field(e.render(), 'password').props.onChange({ target: { value: 'account-secret' } })
  submit(e.render()); await tick(); assert.equal(e.exports.length, 0)
  field(e.render(), 'checkbox').props.onChange({ target: { checked: true } })
  const keys = nodes(e.render()).filter(n => n.type === 'input' && n.props.autoComplete === 'new-password')
  keys[0].props.onChange({ target: { value: 'Archive password 2026!' } })
  submit(e.render()); await tick(); assert.equal(e.exports.length, 0)
  keys[1].props.onChange({ target: { value: 'Archive password 2026!' } })
  submit(e.render()); await tick()
  assert.equal(e.exports.length, 1)
  assert.equal(e.exports[0][0], 'destination')
  assert.equal(e.exports[0][1], 'account-secret')
  assert.equal(e.exports[0][2], 'Archive password 2026!')
  assert.deepEqual(Array.from(e.exports[0][3].sections), ['contacts'])
  assert.equal(e.states[10], '')
  assert.equal(e.states[11], '')
  assert.equal(field(e.render(), 'password').props.value, '')
})

test('archive preview does not import; import requires the reviewed file, target name, password and explicit approval', async () => {
  const e = editor(); e.states[0].isEmpty = true
  const file = { name: 'backup.zip', size: 100 }
  field(e.render(), 'file').props.onChange({ target: { files: [file], value: 'backup.zip' } })
  button(e.render(), 'Validate and review archive').props.onClick(); await tick()
  assert.equal(e.reviews.length, 1); assert.equal(e.imports.length, 0)
  button(e.render(), 'Confirm import').props.onClick()
  field(e.render(), 'password').props.onChange({ target: { value: 'account-secret' } })
  field(e.render(), 'checkbox').props.onChange({ target: { checked: true } })
  submit(e.render()); await tick(); assert.equal(e.imports.length, 0)
  const confirmation = nodes(e.render()).find(node => node.type === 'input' && node.props.autoComplete === 'off' && node.props.type !== 'password')
  confirmation.props.onChange({ target: { value: 'Destination' } })
  submit(e.render()); await tick()
  assert.equal(e.imports.length, 1)
  assert.equal(e.imports[0][1], file)
  assert.equal(e.imports[0][2], 'signed-review')
  assert.equal(e.imports[0][4], 'Destination')
  assert.equal(e.states[0].isEmpty, false)
  assert.equal(field(e.render(), 'password').props.value, '')
})

test('changing the archive discards the review, and a nonempty destination never exposes an import action', async () => {
  const e = editor(); e.states[0].isEmpty = true
  field(e.render(), 'file').props.onChange({ target: { files: [{ name: 'first.zip', size: 100 }], value: 'first.zip' } })
  button(e.render(), 'Validate and review archive').props.onClick(); await tick()
  assert.ok(button(e.render(), 'Confirm import'))
  field(e.render(), 'file').props.onChange({ target: { files: [{ name: 'second.zip', size: 100 }], value: 'second.zip' } })
  assert.equal(button(e.render(), 'Confirm import'), undefined)
  e.states[0].isEmpty = false
  assert.equal(field(e.render(), 'file'), undefined)
  assert.equal(button(e.render(), 'Validate and review archive'), undefined)
})

test('custom file selection cannot export an empty scope and sends only checked file IDs', async () => {
  const e = editor(); e.states[14] = ['files']
  const all = nodes(e.render()).find(n => n.type === 'label' && n.props.children.includes('Include all stored files'))
  nodes(all).find(n => n.type === 'input').props.onChange({ target: { checked: false } })
  assert.equal(button(e.render(), 'Export ZIP').props.disabled, true)
  const one = nodes(e.render()).find(n => n.type === 'label' && nodes(n).some(child => child.type === 'span' && child.props.children.includes('b.zip')))
  nodes(one).find(n => n.type === 'input').props.onChange({ target: { checked: true } })
  assert.equal(button(e.render(), 'Export ZIP').props.disabled, false)
  button(e.render(), 'Export ZIP').props.onClick()
  field(e.render(), 'password').props.onChange({ target: { value: 'account-secret' } })
  field(e.render(), 'checkbox').props.onChange({ target: { checked: true } })
  for (const key of nodes(e.render()).filter(n => n.type === 'input' && n.props.autoComplete === 'new-password'))
    key.props.onChange({ target: { value: 'Strong separate archive key!' } })
  submit(e.render()); await tick()
  assert.deepEqual(Array.from(e.exports[0][3].fileIds), ['file-b'])
  assert.deepEqual(Array.from(e.exports[0][3].sections), ['files'])
})
