import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { openTextEditor } from '../src/lib/textFileEditor.ts'

const previewSource = await readFile(
  new URL('../src/components/FilePreviewModal.tsx', import.meta.url),
  'utf8',
)

const spreadsheetSource = await readFile(new URL('../src/lib/spreadsheetPreview.ts', import.meta.url), 'utf8')

test('spreadsheet preview renders bounded cell text without injecting generated HTML', () => {
  assert.doesNotMatch(previewSource, /dangerouslySetInnerHTML/)
  assert.doesNotMatch(previewSource, /from ['"]xlsx['"]|import\(['"]xlsx['"]\)/)
  assert.match(previewSource, /MAX_SPREADSHEET_PREVIEW_BYTES/)
  assert.match(spreadsheetSource, /MAX_PREVIEW_ROWS/)
  assert.match(spreadsheetSource, /MAX_PREVIEW_COLUMNS/)
  assert.match(previewSource, /<\/button>\s*:\s*cellPreview\.text\}/)
})

test('document and text previews are bounded and DOCX renders without script capability', () => {
  assert.match(previewSource, /MAX_DOCUMENT_PREVIEW_BYTES/)
  assert.match(previewSource, /MAX_TEXT_PREVIEW_BYTES/)
  assert.match(previewSource, /sandbox="allow-same-origin"/)
  assert.doesNotMatch(previewSource, /sandbox="[^"]*allow-scripts/)
  assert.match(previewSource, /referrerPolicy="no-referrer"/)
})

test('text editing preserves UTF-8 BOM and line endings and validates JSON', async () => {
  const bytes = new TextEncoder().encode('\uFEFF{\r\n  "old": true\r\n}').buffer
  const editor = openTextEditor(bytes, 'settings.json', 'text/plain')
  assert.equal(editor.value, '{\n  "old": true\n}')
  assert.throws(() => editor.validate('{'))
  const valid = '{\n  "new": "żółć"\n}'
  editor.validate(valid)
  const saved = await editor.save(valid).arrayBuffer()
  assert.deepEqual(new Uint8Array(saved), new TextEncoder().encode('\uFEFF{\r\n  "new": "żółć"\r\n}'))
  assert.throws(() => openTextEditor(Uint8Array.of(0xff).buffer, 'invalid.txt', 'text/plain'))
})
