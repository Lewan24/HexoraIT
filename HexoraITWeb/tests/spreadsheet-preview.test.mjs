import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { buildSpreadsheetPreview, cellText, columnLabel } from '../src/lib/spreadsheetPreview.ts'

test('sparse cells after blank rows and columns survive XLSX round-trip', async () => {
  const original = new ExcelJS.Workbook()
  const sheet = original.addWorksheet('Sparse')
  sheet.getCell('A1').value = 'first'
  sheet.getCell('F12').value = 'last'
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(await original.xlsx.writeBuffer())
  const preview = buildSpreadsheetPreview(workbook.worksheets[0], 'en-US')
  assert.equal(preview.rows.length, 12)
  assert.equal(preview.columns.length, 6)
  assert.equal(preview.rows[11].cells[5].text, 'last')
})

test('merged cells render once with spans and preserve basic styling', () => {
  const sheet = new ExcelJS.Workbook().addWorksheet('Report')
  sheet.mergeCells('B2:D3')
  sheet.getCell('B2').value = '<img src=x onerror=alert(1)>'
  sheet.getCell('B2').font = { bold: true, color: { argb: 'FF123456' } }
  sheet.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEECCAA' } }
  const preview = buildSpreadsheetPreview(sheet, 'en-US')
  const cell = preview.rows[1].cells[1]
  assert.equal(cell.colSpan, 3); assert.equal(cell.rowSpan, 2)
  assert.equal(cell.style.fontWeight, 700); assert.equal(cell.style.backgroundColor, '#EECCAA')
  assert.equal(preview.rows[2].cells[3].hidden, true)
  assert.equal(cell.text, '<img src=x onerror=alert(1)>')
})

test('cached formulas, percentages and dates display readable values without evaluation', () => {
  const sheet = new ExcelJS.Workbook().addWorksheet('Values')
  sheet.getCell('A1').value = { formula: '1/4', result: .25 }; sheet.getCell('A1').numFmt = '0.0%'
  sheet.getCell('A2').value = new Date('2026-09-28T00:00:00Z')
  sheet.getCell('A3').value = { formula: '1+1' }
  assert.equal(cellText(sheet.getCell('A1'), 'en-US'), '25.0%')
  assert.equal(cellText(sheet.getCell('A2'), 'en-US'), '9/28/2026')
  assert.equal(cellText(sheet.getCell('A3'), 'en-US'), '')
})

test('preview clips dimensions, reports truncation and skips hidden data', () => {
  const sheet = new ExcelJS.Workbook().addWorksheet('Bounded')
  sheet.getCell('A1').value = 'hello'; sheet.getCell('CZ1200').value = 'beyond preview'
  sheet.getRow(2).hidden = true; sheet.getColumn(2).hidden = true
  const preview = buildSpreadsheetPreview(sheet, 'en-US', 200)
  assert.equal(preview.truncated, true)
  assert.equal(preview.rows.length, 1)
  assert.equal(preview.columns.length, 99)
  assert.equal(buildSpreadsheetPreview(sheet, 'en-US', 0).rows.length, 0)
  assert.equal(columnLabel(27), 'AA')
})
