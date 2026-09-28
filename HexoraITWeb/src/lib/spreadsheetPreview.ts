import type { Cell, Color, Worksheet } from 'exceljs'
import type { CSSProperties } from 'react'

export const MAX_PREVIEW_ROWS = 1_000
export const MAX_PREVIEW_COLUMNS = 100
// Shared budget across worksheets avoids multiplying the cap by every sheet.
export const MAX_PREVIEW_CELLS = 100_000
export interface PreviewCell { text: string; rowSpan: number; colSpan: number; hidden: boolean; style: CSSProperties }
export interface SpreadsheetPreview {
  name: string
  rows: { number: number; height: number; cells: PreviewCell[] }[]
  columns: { number: number; label: string; width: number }[]
  truncated: boolean
}

export function columnLabel(number: number): string {
  let label = ''
  for (let n = number; n > 0; n = Math.floor((n - 1) / 26)) label = String.fromCharCode(65 + (n - 1) % 26) + label
  return label
}
function color(value?: Partial<Color>): string | undefined {
  const hex = value?.argb
  return hex && /^(?:[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex) ? '#' + hex.slice(-6) : undefined
}
export function cellText(cell: Cell, language: string): string {
  let value = cell.value
  if (value && typeof value === 'object' && 'formula' in value) value = value.result ?? ''
  if (value && typeof value === 'object' && 'sharedFormula' in value) value = value.result ?? ''
  if (value instanceof Date) return new Intl.DateTimeFormat(language, { timeZone: 'UTC' }).format(value)
  if (typeof value === 'number') {
    const format = cell.numFmt || 'General'
    if (format === 'General') return String(value)
    const pattern = format.split(';')[0]!.replace(/"[^"]*"|\[[^\]]*\]/g, '')
    const fraction = pattern.match(/\.([0#]+)/)?.[1] ?? ''
    const percent = pattern.includes('%')
    const number = new Intl.NumberFormat(language, {
      style: percent ? 'percent' : 'decimal',
      useGrouping: pattern.includes(','),
      minimumFractionDigits: Math.min(20, (fraction.match(/0/g) ?? []).length),
      maximumFractionDigits: Math.min(20, fraction.length),
    }).format(value)
    const currency = format.match(/[$€£¥]/)?.[0]
    return currency && !percent ? `${currency}${number}` : number
  }
  return cell.text
}
function cellStyle(cell: Cell): CSSProperties {
  const fill = cell.fill
  const background = fill?.type === 'pattern' && fill.pattern === 'solid' ? color(fill.fgColor) : undefined
  const align = cell.alignment
  const horizontal = align?.horizontal
  return {
    fontWeight: cell.font?.bold ? 700 : undefined,
    fontStyle: cell.font?.italic ? 'italic' : undefined,
    textDecoration: cell.font?.strike ? 'line-through' : cell.font?.underline ? 'underline' : undefined,
    fontSize: cell.font?.size ? Math.max(8, Math.min(32, cell.font.size)) * 4 / 3 : undefined,
    color: color(cell.font?.color), backgroundColor: background,
    textAlign: horizontal === 'left' || horizontal === 'center' || horizontal === 'right' || horizontal === 'justify' ? horizontal : typeof cell.value === 'number' ? 'right' : 'left',
    verticalAlign: align?.vertical === 'middle' ? 'middle' : align?.vertical === 'bottom' ? 'bottom' : 'top',
    whiteSpace: align?.wrapText ? 'pre-wrap' : 'pre',
  }
}
export function buildSpreadsheetPreview(worksheet: Worksheet, language: string, budget = MAX_PREVIEW_CELLS): SpreadsheetPreview {
  // rowCount/columnCount are extents; actual*Count counts populated rows/columns and loses sparse data.
  const columnCount = Math.min(worksheet.columnCount, MAX_PREVIEW_COLUMNS)
  const rowCount = Math.min(worksheet.rowCount, MAX_PREVIEW_ROWS, Math.floor(budget / Math.max(1, columnCount)))
  const columns = Array.from({ length: columnCount }, (_, i) => i + 1).filter(n => !worksheet.getColumn(n).hidden)
  const rows = Array.from({ length: rowCount }, (_, i) => i + 1).filter(n => !worksheet.getRow(n).hidden)
  const rowPositions = new Map(rows.map((n, i) => [n, i]))
  const columnPositions = new Map(columns.map((n, i) => [n, i]))
  const masters = new Map<string, { row: number; column: number; rowEnd: number; columnEnd: number }>()
  // Bounded scan uses ExcelJS's resolved master relationship, including merges clipped by the preview.
  for (const r of rows) for (const c of columns) {
    const cell = worksheet.getCell(r, c)
    if (!cell.isMerged) continue
    const key = cell.master.address
    const span = masters.get(key)
    if (span) { span.rowEnd = r; span.columnEnd = Math.max(span.columnEnd, c) }
    else masters.set(key, { row: r, column: c, rowEnd: r, columnEnd: c })
  }
  return {
    name: worksheet.name,
    truncated: worksheet.rowCount > rowCount || worksheet.columnCount > columnCount,
    columns: columns.map(n => ({ number: n, label: columnLabel(n), width: Math.max(48, Math.min(400, (worksheet.getColumn(n).width ?? 12) * 7 + 5)) })),
    rows: rows.map(r => ({ number: r, height: Math.max(24, Math.min(300, (worksheet.getRow(r).height ?? 18) * 4 / 3)),
      cells: columns.map(c => {
        const cell = worksheet.getCell(r, c)
        const master = cell.isMerged ? cell.master : cell
        const span = masters.get(master.address)
        return {
          text: cellText(master, language).slice(0, 10_000), style: cellStyle(master),
          hidden: !!span && (r !== span.row || c !== span.column),
          rowSpan: span ? (rowPositions.get(span.rowEnd)! - rowPositions.get(span.row)! + 1) : 1,
          colSpan: span ? (columnPositions.get(span.columnEnd)! - columnPositions.get(span.column)! + 1) : 1,
        }
      }),
    })),
  }
}
