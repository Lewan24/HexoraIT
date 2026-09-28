import { buildSpreadsheetPreview, MAX_PREVIEW_CELLS, type SpreadsheetPreview } from '../lib/spreadsheetPreview'
import { tr, useLocale, locale } from '../i18n'
import { useEffect, useRef, useState } from 'react'
import { X, Download, Loader2, AlertTriangle } from 'lucide-react'
import { filesApi } from '../api/resources'
import { getPreviewKind } from '../lib/filePreview'
import type { StoredFile } from '../api/types'

interface Props {
  file: StoredFile
  onClose: () => void
}

const MAX_SPREADSHEET_PREVIEW_BYTES = 10 * 1024 * 1024
const MAX_DOCUMENT_PREVIEW_BYTES = 10 * 1024 * 1024
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024

export default function FilePreviewModal({ file, onClose }: Props) {
  useLocale()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState(0)
  const [sheets, setSheets] = useState<SpreadsheetPreview[]>([])

  const docxFrameRef = useRef<HTMLIFrameElement>(null)
  const language = locale()
  const kind = getPreviewKind(file.name, file.mimeType)

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null

    async function load() {
      setLoading(true)
      setError(false)
      try {
        if (kind === 'pdf' || kind === 'image') {
          const blob = await filesApi.getContentBlob(file.id)
          if (cancelled) return
          createdUrl = URL.createObjectURL(blob)
          setObjectUrl(createdUrl)
        } else if (kind === 'docx') {
          const blob = await filesApi.getContentBlob(file.id)
          if (blob.size > MAX_DOCUMENT_PREVIEW_BYTES) throw new Error('Document is too large to preview safely.')

          if (cancelled) return
          const frameDocument = docxFrameRef.current?.contentDocument
          if (!frameDocument) throw new Error('Document preview frame is unavailable.')
          frameDocument.open()
          frameDocument.write('<!doctype html><html><head></head><body></body></html>')
          frameDocument.close()
          const { renderAsync } = await import('docx-preview')
          if (cancelled) return
          await renderAsync(blob, frameDocument.body, frameDocument.head, {
            className: 'docx-preview',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
          })
        } else if (kind === 'xlsx') {
          const blob = await filesApi.getContentBlob(file.id)
          if (blob.size > MAX_SPREADSHEET_PREVIEW_BYTES) throw new Error('Spreadsheet is too large to preview safely.')
          const buffer = await blob.arrayBuffer()
          const { default: ExcelJS } = await import('exceljs')
          const { Workbook } = ExcelJS
          const workbook = new Workbook()
          await workbook.xlsx.load(buffer)
          if (cancelled) return
          let remaining = MAX_PREVIEW_CELLS
          setSheets(workbook.worksheets.filter(sheet => sheet.state === 'visible').map(worksheet => {
            const preview = buildSpreadsheetPreview(worksheet, language, remaining)
            remaining -= preview.rows.length * preview.columns.length
            return preview
          }))
          setActiveSheet(0)
        } else if (kind === 'text') {
          const blob = await filesApi.getContentBlob(file.id)
          if (blob.size > MAX_TEXT_PREVIEW_BYTES) throw new Error('Text file is too large to preview safely.')
          const text = await blob.text()
          if (!cancelled) setTextContent(text)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()

    return () => {
      cancelled = true

      if (createdUrl) {
          URL.revokeObjectURL(createdUrl);
      }
    }
  }, [file.id, file.mimeType, kind, language])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const download = async () => {
    try {
      const blob = await filesApi.downloadFile(file.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch {
      setError(true)
    }
  }

  const activeSpreadsheet = sheets[activeSheet]

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-edge-subtle flex-shrink-0">
          <p className="text-sm font-medium text-ink-primary truncate font-mono">{file.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={download} className="p-1.5 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700 transition-colors" title={tr("Download")}>
              <Download size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><X size={16} /></button>
          </div>
        </div>

        {kind === 'xlsx' && sheets.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-edge-subtle bg-navy-900/40 flex-shrink-0 overflow-x-auto">
            {sheets.map((sheet, i) => (
              <button key={sheet.name} onClick={() => setActiveSheet(i)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeSheet === i ? 'bg-blue-500 text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-navy-700'}`}>
                {sheet.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 bg-navy-950 overflow-auto relative">
          {kind === 'docx' && (
            <iframe ref={docxFrameRef} sandbox="allow-same-origin" referrerPolicy="no-referrer" title={file.name}
              className="docx-preview-host bg-white h-full w-full border-0" />
          )}

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy-950/60">
              <Loader2 size={24} className="animate-spin text-ink-muted"/>
            </div>
          )}

          {!loading && error && (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
              <AlertTriangle size={22} className="text-red-400" />
              <p className="text-sm text-ink-secondary">
                 {tr("Couldn't load a preview for this file.")} </p>

              <button onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium">
                <Download size={12} />
                 {tr("Download instead")} </button>
            </div>
          )}

          {!loading && !error && kind === 'pdf' && objectUrl && (
            <iframe src={objectUrl} title={file.name} className="w-full h-full border-0"/>
          )}

          {!loading && !error && kind === 'image' && objectUrl && (
            <div className="h-full flex items-center justify-center p-4">
              <img src={objectUrl} alt={file.name} className="max-w-full max-h-full object-contain"/>
            </div>
          )}

          {!loading && !error && kind === 'xlsx' && activeSpreadsheet && (
            <div className="spreadsheet-preview h-full overflow-auto">
              {activeSpreadsheet.truncated && <p role="status" className="spreadsheet-notice">{tr('This sheet exceeds the preview limit. Download the file to view all cells.')}</p>}
              {activeSpreadsheet.rows.length === 0 ? <p className="spreadsheet-notice">{tr('No cells to preview')}</p> : <table id="preview-sheet" aria-label={activeSpreadsheet.name}>
                <colgroup><col style={{ width: 48 }} />{activeSpreadsheet.columns.map(column => <col key={column.number} style={{ width: column.width }} />)}</colgroup>
                <thead><tr><th aria-label={tr('Row')} />{activeSpreadsheet.columns.map(column => <th key={column.number} scope="col">{column.label}</th>)}</tr></thead>
                <tbody>{activeSpreadsheet.rows.map(row => <tr key={row.number} style={{ height: row.height }}>
                  <th scope="row">{row.number}</th>
                  {row.cells.map((cell, index) => cell.hidden ? null : <td key={index} rowSpan={cell.rowSpan} colSpan={cell.colSpan} style={cell.style}>{cell.text}</td>)}
                </tr>)}</tbody>
              </table>}
            </div>
          )}

          {!loading && !error && kind === 'xlsx' && !activeSpreadsheet && <p className="p-5 text-sm text-ink-muted">{tr('No cells to preview')}</p>}

          {!loading && !error && kind === 'text' && textContent !== null && (
            <pre className="p-5 text-xs text-ink-secondary whitespace-pre-wrap font-mono">
              {textContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
