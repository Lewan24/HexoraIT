import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
const en = JSON.parse(read('../src/i18n/en.json'))
const pl = JSON.parse(read('../src/i18n/pl.json'))
const compile = (source, fileName = 'runtime.ts') => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, {
  fileName,
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.ReactJSX },
}).outputText.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))).toString('base64')

const storage = new Map()
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) }
globalThis.document = { documentElement: { lang: '' } }
const source = read('../src/i18n/index.ts')
  .replace("import en from './en.json'", `const en = ${JSON.stringify(en)}`)
  .replace("import pl from './pl.json'", `const pl = ${JSON.stringify(pl)}`)
  .replace("from 'i18next'", `from '${import.meta.resolve('i18next')}'`)
  .replace("from 'react-i18next'", `from '${import.meta.resolve('react-i18next')}'`)
const { default: i18n, tr, readLanguage, LANGUAGE_STORAGE_KEY } = await import(compile(source))

test('Polish is the default, switching updates document language and persists preference', async () => {
  storage.clear()
  assert.equal(readLanguage(), 'pl')
  assert.equal(i18n.language, 'pl')
  assert.equal(tr('Save'), 'Zapisz')
  await i18n.changeLanguage('en')
  assert.equal(tr('Save'), 'Save')
  assert.equal(document.documentElement.lang, 'en')
  assert.equal(readLanguage(), 'en')
  storage.set(LANGUAGE_STORAGE_KEY, 'de')
  assert.equal(readLanguage(), 'pl')
  await i18n.changeLanguage('pl')
  assert.equal(document.documentElement.lang, 'pl')
  const getItem = localStorage.getItem
  localStorage.getItem = () => { throw new Error('Storage disabled') }
  assert.equal(readLanguage(), 'pl')
  localStorage.getItem = getItem
})

test('catalogs cover the same keys and preserve interpolation parameters', () => {
  assert.deepEqual(Object.keys(pl).sort(), Object.keys(en).sort())
  const parameters = value => [...value.matchAll(/{{\s*(\w+)\s*}}/g)].map(m => m[1]).sort()
  for (const key of Object.keys(en)) {
    assert.deepEqual(parameters(pl[key]), parameters(en[key]), key)
    assert.ok(pl[key] || key === 's', `Empty Polish translation: ${key}`)
  }
})

test('language selector renders Polish and English with stable option values', async () => {
  const switcherSource = read('../src/components/LanguageSwitcher.tsx').replace("'../i18n'", JSON.stringify(compile(source)))
  const { default: LanguageSwitcher } = await import(compile(switcherSource, 'LanguageSwitcher.tsx'))
  for (const [language, label] of [['pl', 'Język'], ['en', 'Language']]) {
    await i18n.changeLanguage(language)
    const markup = renderToStaticMarkup(createElement(LanguageSwitcher))
    assert.ok(markup.includes(`aria-label="${label}"`))
    assert.match(markup, /value="pl"[^>]*>Polski<\/option>/)
    assert.match(markup, /value="en"[^>]*>English<\/option>/)
    assert.ok(markup.includes(`value="${language}" lang="${language}" selected=""`))
  }
  await i18n.changeLanguage('pl')
})

test('search translates enum descriptions while preserving names, IDs and user text', async () => {
  const { buildSearchResults } = await import(compile(read('../src/lib/search.ts')))
  const data = Object.fromEntries(['assets', 'passwords', 'contacts', 'licenses', 'contracts', 'plans', 'incidents', 'knowledgeArticles', 'tasks', 'groups', 'warrantyItems', 'subnets'].map(key => [key, []]))
  data.assets.push({ id: 'asset-1', name: 'Network', type: 'Server', location: 'Office', ip: '10.0.0.1' })
  const before = JSON.stringify(data)
  const [result] = buildSearchResults(data, 'Network', tr)
  assert.equal(result.label, 'Network')
  assert.equal(result.sub, 'Serwer · Office')
  assert.equal(result.targetId, 'asset-1')
  assert.equal(JSON.stringify(data), before)
})

test('literal UI keys are covered and translated options keep explicit wire values', () => {
  const root = new URL('../src/', import.meta.url)
  for (const file of fs.readdirSync(root, { recursive: true }).filter(f => /\.tsx?$/.test(f))) {
    const source = fs.readFileSync(new URL(file.replaceAll('\\', '/'), root), 'utf8')
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    function visit(node) {
      if (ts.isCallExpression(node) && ['tr', 't'].includes(node.expression.getText(ast)) && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
        assert.ok(node.arguments[0].text in pl, `${file}: missing ${node.arguments[0].text}`)
      }
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(ast) === 'option' && node.children.some(c => c.getText(ast).includes('tr('))) {
        const value = node.openingElement.attributes.properties.find(p => ts.isJsxAttribute(p) && p.name.text === 'value')
        assert.ok(value, `${file}: translated option must have a value`)
        assert.ok(!value.getText(ast).includes('tr('), `${file}: translated API value`)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    if (file.startsWith('api')) assert.ok(!source.includes('../i18n'), `${file}: API layer must stay locale independent`)
  }
})

test('changing locale preserves HTTP request bodies, query values and received data', async () => {
  const httpSource = read('../src/api/http.ts').replace('import { config } from "../../config"', 'const config = { apiBaseUrl: "https://api.example.test" }')
  const { http, qs } = await import(compile(httpSource))
  const payload = { name: 'Save', type: 'Server', status: 'maintenance', role: 'ReadOnly', notes: 'User text: English / polski', tags: ['Network'] }
  const originalFetch = globalThis.fetch
  const calls = []
  globalThis.fetch = async (url, options) => {
    calls.push({ url, body: options.body, headers: options.headers })
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    for (const language of ['pl', 'en']) {
      await i18n.changeLanguage(language)
      const result = await http.post('/assets' + qs({ status: payload.status }), payload)
      assert.deepEqual(result, payload)
      assert.equal(tr('Asset "{{value1}}" created', { value1: payload.name }).includes('Save'), true)
    }
    assert.deepEqual(calls[0], calls[1])
    assert.deepEqual(JSON.parse(calls[0].body), payload)
    assert.equal(calls[0].url, 'https://api.example.test/assets?status=maintenance')
  } finally {
    globalThis.fetch = originalFetch
    await i18n.changeLanguage('pl')
  }
})
