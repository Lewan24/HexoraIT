import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const previewSource = await readFile(
  new URL('../src/components/FilePreviewModal.tsx', import.meta.url),
  'utf8',
)

test('spreadsheet preview renders bounded cell text without injecting generated HTML', () => {
  assert.doesNotMatch(previewSource, /dangerouslySetInnerHTML/)
  assert.doesNotMatch(previewSource, /from ['"]xlsx['"]|import\(['"]xlsx['"]\)/)
  assert.match(previewSource, /MAX_SPREADSHEET_PREVIEW_BYTES/)
  assert.match(previewSource, /MAX_PREVIEW_ROWS/)
  assert.match(previewSource, /MAX_PREVIEW_COLUMNS/)
  assert.match(previewSource, /getCell\(rowNumber, columnNumber\)\.text/)
})

test('document and text previews are bounded and DOCX renders without script capability', () => {
  assert.match(previewSource, /MAX_DOCUMENT_PREVIEW_BYTES/)
  assert.match(previewSource, /MAX_TEXT_PREVIEW_BYTES/)
  assert.match(previewSource, /sandbox="allow-same-origin"/)
  assert.doesNotMatch(previewSource, /sandbox="[^"]*allow-scripts/)
  assert.match(previewSource, /referrerPolicy="no-referrer"/)
})
