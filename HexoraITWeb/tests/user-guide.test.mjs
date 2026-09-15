import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import ts from 'typescript'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8')
async function renderGuide(role) {
  const source = read('../src/components/UserGuide.tsx')
    .replace("import manual from '../content/instrukcja-obslugi.md?raw'", `const manual = ${JSON.stringify(read('../src/content/instrukcja-obslugi.md'))}`)
    .replace("import { useAuth } from '../context/useAuth'", `const useAuth = () => ({ user: { systemRole: '${role}' } })`)
    .replace("import './UserGuide.css'", '')
    .replace("from 'react'", `from '${import.meta.resolve('react')}'`)
    .replace("from 'lucide-react'", `from '${import.meta.resolve('lucide-react')}'`)
  const output = ts.transpileModule(source, { fileName: 'UserGuide.tsx', compilerOptions: {
    module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText.replace('"react/jsx-runtime"', JSON.stringify(import.meta.resolve('react/jsx-runtime')))
  const { default: Guide } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'))
  return renderToStaticMarkup(createElement(Guide))
}

test('employee guide renders chapter navigation, semantic tables, lists and code examples', async () => {
  const html = await renderGuide('User')
  assert.match(html, /Administrator systemu/)
  assert.match(html, /Opiekun organizacji/)
  assert.match(html, /Najczęstsze pytania/)
  assert.match(html, /<table>/)
  assert.match(html, /<ol start="1">/)
  assert.match(html, /<pre><code>/)
  assert.doesNotMatch(html, /```markdown/)
})

test('client guide shows reporting and account help without administrative chapters', async () => {
  const html = await renderGuide('Client')
  assert.match(html, /Wyślij zgłoszenie/)
  assert.match(html, /Dostęp do dokumentacji/)
  assert.match(html, /Ustawienia → Bezpieczeństwo/)
  assert.doesNotMatch(html, /Utworzenie konta pracownika|Opiekun organizacji —|Rozdziały.*Administrator systemu/)
})
