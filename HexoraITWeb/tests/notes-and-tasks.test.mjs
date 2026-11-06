import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
import vm from 'node:vm'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const source = name => fs.readFileSync(new URL('../src/' + name, import.meta.url), 'utf8')
const compile = value => ts.transpileModule(value, { compilerOptions: { target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } }).outputText
const moduleOf = value => import('data:text/javascript;base64,' + Buffer.from(compile(value)).toString('base64'))
const { markdownEdit } = await moduleOf(source('lib/markdownEdit.ts'))

test('formatting preserves surrounding text and handles multiline selections', () => {
  assert.deepEqual(markdownEdit('A value B', 2, 7, 'bold'), { value: 'A **value** B', start: 4, end: 9 })
  assert.deepEqual(markdownEdit('First\nSecond', 0, 12, 'checklist'), { value: '- [ ] First\n- [ ] Second', start: 6, end: 24 })
  assert.equal(markdownEdit('Title\nline', 7, 10, 'heading').value, 'Title\n## line')
  assert.deepEqual(markdownEdit('', 0, 0, 'code'), { value: '``', start: 1, end: 1 })
})

test('note formatting supports newlines, headings and bold while escaping executable HTML', () => {
  const context = vm.createContext({ React })
  vm.runInContext(compile(source('lib/markdown.tsx')).replaceAll('export ', ''), context)
  const text = '# Heading\r\n**Bold**\r\nSecond line\r\n<script>alert(1)</script>\n<img src=x onerror=alert(1)>'
  const markup = renderToStaticMarkup(React.createElement('div', null, context.renderMarkdown(text)))
  assert.match(markup, /<h1[^>]*>Heading<\/h1>/)
  assert.match(markup, /<strong[^>]*>Bold<\/strong>/)
  assert.match(markup, /Second line/)
  assert.ok(!markup.includes('<script>'))
  assert.ok(!markup.includes('<img'))
  assert.ok(markup.includes('&lt;script&gt;'))
  const compact = renderToStaticMarkup(React.createElement('div', null, context.renderMarkdownCompact('**Bold**\nOther', 1)))
  assert.match(compact, /<strong/)
  assert.ok(!compact.includes('Other'))
})

function gesture() {
  const drops = [], states = [], effects = []
  let target = 'done'
  const context = vm.createContext({
    useRef: value => ({ current: value }), useState: value => [value, next => states.push(next)], useEffect: callback => effects.push(callback),
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    document: { elementFromPoint: () => ({ closest: () => ({ dataset: { taskStatus: target } }) }) },
  })
  vm.runInContext(compile(source('lib/useTaskDrag.ts')).replace(/^import .*$/gm, '').replaceAll('export ', ''), context)
  const hook = context.useTaskDrag((id, status) => drops.push({ id, status }))
  const events = hook.bindings('task')
  const event = (x, y) => ({ button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y, currentTarget: { setPointerCapture() {} } })
  return { drops, states, events, event, setTarget: value => { target = value } }
}

test('pointer drag moves a task only after the movement threshold and a valid drop', () => {
  const g = gesture()
  g.events.onPointerDown(g.event(0, 0)); g.events.onPointerMove(g.event(20, 20)); g.events.onPointerUp(g.event(20, 20))
  assert.deepEqual(g.drops, [{ id: 'task', status: 'done' }])
  assert.equal(g.states.at(-1), null)
})

test('clicking, cancelling and dropping outside a column never change status', () => {
  for (const mode of ['click', 'cancel', 'outside']) {
    const g = gesture(); g.events.onPointerDown(g.event(0, 0))
    if (mode !== 'click') g.events.onPointerMove(g.event(20, 20))
    if (mode === 'cancel') g.events.onPointerCancel()
    if (mode === 'outside') g.setTarget('invalid')
    g.events.onPointerUp(g.event(20, 20))
    assert.deepEqual(g.drops, [], mode)
  }
})
