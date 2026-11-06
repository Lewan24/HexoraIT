import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function editor({ sensitive = false } = {}) {
  let source = fs.readFileSync(new URL('../src/components/OrganizationDocumentation.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('OrganizationDocumentation.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  for (const node of [...ast.statements].reverse()) if (ts.isImportDeclaration(node)) source = source.slice(0, node.pos) + source.slice(node.end)
  source = source.replace('export default function', 'function')
  const states = [
    [{ key: 'contacts', count: 2 }, { key: 'tasks', count: 1 }, { key: 'passwords', count: 1 }, { key: 'private-notes', count: 1 }],
    { contacts: ['selected-contact'], ...(sensitive ? { passwords: null } : {}) }, false,
  ]
  const requests = [], downloads = []
  let slot = 0
  const context = {
    React: { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) },
    useLocale() {}, locale: () => 'pl', tr: key => key, useApp: () => ({ toast() {} }),
    useEffect() {}, useRef: current => ({ current }),
    useState(initial) { const i = slot++; if (!(i in states)) states[i] = typeof initial === 'function' ? initial() : initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
    documentationApi: { generate: async (...args) => { requests.push(args); return new Blob(['pdf']) } },
    AbortController, Blob, URL: { createObjectURL: () => 'blob:pdf', revokeObjectURL() {} },
    document: { createElement: () => ({ click() { downloads.push(this.download) } }) }, window: { setTimeout() {} },
  }
  for (const [, name] of source.matchAll(/<([A-Z]\w*)(?=[\s/>])/g)) context[name] ??= () => null
  vm.createContext(context)
  vm.runInContext(ts.transpileModule(source, { fileName: 'OrganizationDocumentation.tsx', compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ESNext } }).outputText, context)
  return { states, requests, downloads, render: () => { slot = 0; return context.DocumentationEditor({ orgId: 'organization', orgName: 'Client' }) } }
}
function nodes(node) { if (!node || typeof node !== 'object') return []; return Array.isArray(node) ? node.flatMap(nodes) : [node, ...nodes(node.props?.children)] }
const button = (tree, label) => nodes(tree).find(node => node.type === 'button' && node.props.children.includes(label))

test('PDF export requires scope approval and sends only the chosen records and fields', async () => {
  const e = editor()
  button(e.render(), 'Review scope').props.onClick()
  let tree = e.render()
  assert.equal(button(tree, 'Generate PDF').props.disabled, true)
  nodes(tree).find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  tree = e.render()
  assert.equal(button(tree, 'Generate PDF').props.disabled, false)
  button(tree, 'Generate PDF').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(e.requests[0][0], 'organization')
  assert.deepEqual(JSON.parse(JSON.stringify(e.requests[0][1].sections)), [{ key: 'contacts', itemIds: ['selected-contact'] }])
  assert.equal(e.requests[0][1].includeSecrets, false)
  assert.equal(e.requests[0][1].includeNotes, false)
  assert.equal(e.requests[0][1].includeFinancials, false)
  assert.equal(e.downloads.length, 1)
})

test('sensitive data requires the review step and confirmation before credentials are requested', async () => {
  const e = editor({ sensitive: true })
  e.render()
  e.states[8] = { ...e.states[8], includeSecrets: true }
  button(e.render(), 'Review scope').props.onClick()
  let tree = e.render()
  assert.ok(nodes(tree).some(node => node.props?.role === 'alert'))
  assert.equal(button(tree, 'Generate PDF').props.disabled, true)
  nodes(tree).find(node => node.type === 'input' && node.props.type === 'checkbox').props.onChange({ target: { checked: true } })
  tree = e.render(); button(tree, 'Generate PDF').props.onClick()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(e.requests[0][1].includeSecrets, true)
  assert.equal(e.requests[0][1].confirmSensitiveData, true)
})
