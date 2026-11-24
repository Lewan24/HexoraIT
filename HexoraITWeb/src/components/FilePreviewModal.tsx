import { buildSpreadsheetPreview, MAX_PREVIEW_CELLS, type SpreadsheetPreview } from '../lib/spreadsheetPreview'
import { tr, useLocale, locale } from '../i18n'
import { useEffect, useRef, useState } from 'react'
import { X, Download, Loader2, AlertTriangle, Edit2, Save } from 'lucide-react'
import { filesApi } from '../api/resources'
import { getPreviewKind } from '../lib/filePreview'
import { ApiError } from '../api/errors'
import { openTextEditor } from '../lib/textFileEditor'
import type { openWordEditor, openSpreadsheetEditor } from '../lib/officeFileEditor'
import type { StoredFile } from '../api/types'

interface Props {
  file: StoredFile
  onClose: () => void
  canEdit: boolean
  onSaved: (file: StoredFile) => void
}

const MAX_SPREADSHEET_PREVIEW_BYTES = 10 * 1024 * 1024
const MAX_DOCUMENT_PREVIEW_BYTES = 10 * 1024 * 1024
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024

type Editor =
  | { kind: 'text'; source: ReturnType<typeof openTextEditor> }
  | { kind: 'docx'; source: Awaited<ReturnType<typeof openWordEditor>> }
  | { kind: 'xlsx'; source: Awaited<ReturnType<typeof openSpreadsheetEditor>> }

export default function FilePreviewModal({ file, onClose, canEdit, onSaved }: Props) {
  useLocale()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [activeSheet, setActiveSheet] = useState(0)
  const [sheets, setSheets] = useState<SpreadsheetPreview[]>([])

  const [snapshot, setSnapshot] = useState<{ blob: Blob; revision: string | null } | null>(null)
  const [editor, setEditor] = useState<Editor | null>(null)
  const [openingEditor, setOpeningEditor] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [textDraft, setTextDraft] = useState('')
  const [wordChanges, setWordChanges] = useState(new Map<number, string>())
  const [sheetChanges, setSheetChanges] = useState(new Map<string, Map<string, string>>())
  const [cell, setCell] = useState<{ sheet: string; address: string; original: string } | null>(null)
  const cellRequest = useRef(0)
  const [reload, setReload] = useState(0)

  const docxFrameRef = useRef<HTMLIFrameElement>(null)
  const language = locale()
  const kind = getPreviewKind(file.name, file.mimeType)

  useEffect(() => {
    let cancelled = false
    let createdUrl: string | null = null

    async function load() {
      setLoading(true)
      setError(false)
      setSnapshot(null)
      try {
        const limit = kind === 'text' ? MAX_TEXT_PREVIEW_BYTES : kind === 'docx' ? MAX_DOCUMENT_PREVIEW_BYTES : kind === 'xlsx' ? MAX_SPREADSHEET_PREVIEW_BYTES : 100 * 1024 * 1024
        if (file.size > limit) throw new Error('File is too large to preview safely.')
        const content = await filesApi.getContent(file.id)
        const { blob } = content
        if (blob.size > limit) throw new Error('File is too large to preview safely.')
        if (cancelled) return
        if (kind === 'pdf' || kind === 'image') {
          createdUrl = URL.createObjectURL(blob)
          setObjectUrl(createdUrl)
        } else if (kind === 'docx') {

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
          const text = await blob.text()
          if (!cancelled) setTextContent(text)
        }
        if (!cancelled) setSnapshot(content)
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
  }, [file.size, file.id, file.mimeType, kind, language, reload])

  const dirty = editor?.kind === 'text' ? textDraft !== editor.source.value
    : editor?.kind === 'docx' ? wordChanges.size > 0
    : editor?.kind === 'xlsx' && sheetChanges.size > 0

  const discardEditor = () => {
    cellRequest.current++
    setEditor(null)
    setCell(null)
    setWordChanges(new Map())
    setSheetChanges(new Map())
    setEditError('')
  }

  const cancel = () => {
    if (saving || openingEditor) return
    if (dirty && !window.confirm(tr('Discard unsaved changes?'))) return
    if (editor) discardEditor()
    else onClose()
  }

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented) cancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = true
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const startEditing = async () => {
    if (!canEdit || !snapshot?.revision || openingEditor) return
    setOpeningEditor(true)
    setEditError('')
    try {
      const { blob } = snapshot
      if (kind === 'text') {
        const source = openTextEditor(await blob.arrayBuffer(), file.name, file.mimeType)
        setTextDraft(source.value)
        setEditor({ kind, source })
      } else if (kind === 'docx') {
        const { openWordEditor } = await import('../lib/officeFileEditor')
        const source = await openWordEditor(blob, file.mimeType)
        if (!source.paragraphs.length) throw new Error('No editable paragraphs.')
        setEditor({ kind, source })
      } else if (kind === 'xlsx') {
        const { openSpreadsheetEditor } = await import('../lib/officeFileEditor')
        setEditor({ kind, source: await openSpreadsheetEditor(blob, file.mimeType) })
      }
    } catch {
      setEditError(tr('This file cannot be edited in the browser.'))
    } finally {
      setOpeningEditor(false)
    }
  }

  const closeCell = () => {
    cellRequest.current++
    setCell(null)
  }

  const updateCell = (value: string) => {
    if (!cell) return
    setSheetChanges(changes => {
      const next = new Map(changes)
      const sheet = new Map(next.get(cell.sheet))
      if (value === cell.original) sheet.delete(cell.address)
      else sheet.set(cell.address, value)
      if (sheet.size) next.set(cell.sheet, sheet)
      else next.delete(cell.sheet)
      return next
    })
  }

  const selectCell = async (sheet: string, address: string) => {
    if (editor?.kind !== 'xlsx' || saving || (cell?.sheet === sheet && cell.address === address)) return
    closeCell()
    const request = cellRequest.current
    setEditError('')
    try {
      const original = await editor.source.valueAt(sheet, address)
      if (request !== cellRequest.current) return
      if (original === null) {
        setEditError(tr('This cell cannot be edited in the browser.'))
        return
      }
      setCell({ sheet, address, original })
    } catch {
      if (request === cellRequest.current) setEditError(tr('This cell cannot be edited in the browser.'))
    }
  }

  const save = async () => {
    if (!editor || !snapshot?.revision || !canEdit || !dirty || saving) return
    setEditError('')
    if (editor.kind === 'text') {
      try { editor.source.validate(textDraft) } catch {
        setEditError(tr('Enter valid JSON before saving.'))
        return
      }
    }
    setSaving(true)
    try {
      let content: Blob
      if (editor.kind === 'text') content = editor.source.save(textDraft)
      else if (editor.kind === 'docx') content = await editor.source.save(wordChanges)
      else content = await editor.source.save(sheetChanges)

      const limit = editor.kind === 'text' ? MAX_TEXT_PREVIEW_BYTES
        : editor.kind === 'docx' ? MAX_DOCUMENT_PREVIEW_BYTES : MAX_SPREADSHEET_PREVIEW_BYTES
      if (content.size > limit) {
        setEditError(tr('The edited file exceeds the size limit.'))
        return
      }
      const updated = await filesApi.replace(file.id, new File([content], file.name, { type: content.type }), snapshot.revision)
      discardEditor()
      setLoading(true)
      setReload(current => current + 1)
      onSaved(updated)
    } catch (error) {
      setEditError(error instanceof ApiError && error.status === 409
        ? tr('This file changed. Reopen it before editing again.')
        : tr('Failed to update file'))
    } finally {
      setSaving(false)
    }
  }

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
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={cancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 px-5 py-3 border-b border-edge-subtle flex-shrink-0">
          <p className="text-sm font-medium text-ink-primary truncate font-mono">{file.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {editor ? (
              <>
                <button type="button" onClick={cancel} disabled={saving} className="px-2 py-1.5 rounded-md text-xs text-ink-secondary hover:bg-navy-700 disabled:opacity-50">{tr('Cancel')}</button>
                <button type="button" onClick={() => void save()} disabled={saving || !dirty || !canEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {tr('Save')}
                </button>
              </>
            ) : (
              <>
                {canEdit && snapshot?.revision && !loading && !error && ['text', 'docx', 'xlsx'].includes(kind) && (
                  <button type="button" onClick={() => void startEditing()} disabled={openingEditor}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs text-ink-secondary hover:text-blue-400 hover:bg-navy-700 disabled:opacity-50">
                    {openingEditor ? <Loader2 size={14} className="animate-spin" /> : <Edit2 size={14} />} {tr('Edit')}
                  </button>
                )}
                <button onClick={download} className="p-1.5 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700 transition-colors" title={tr('Download')}>
                  <Download size={14} />
                </button>
                <button onClick={cancel} disabled={openingEditor} aria-label={tr('Close')}
                  className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><X size={16} /></button>
              </>
            )}
          </div>
        </div>

        {editError && <p role="alert" className="px-5 py-2 text-xs text-red-400 border-b border-edge-subtle">{editError}</p>}

        {kind === 'xlsx' && sheets.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-edge-subtle bg-navy-900/40 flex-shrink-0 overflow-x-auto">
            {sheets.map((sheet, i) => (
              <button key={sheet.name} disabled={saving} onClick={() => { closeCell(); setActiveSheet(i); setEditError('') }}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeSheet === i ? 'bg-blue-500 text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-navy-700'}`}>
                {sheet.name}
              </button>
            ))}
          </div>
        )}

        {editor?.kind === 'xlsx' && (
          <div className="px-3 py-2 border-b border-edge-subtle flex items-center gap-2 text-xs text-ink-muted">
            {cell ? <>
              <label htmlFor="spreadsheet-cell" className="font-mono">{cell.address}</label>
              <textarea key={cell.address} id="spreadsheet-cell" autoFocus rows={1} maxLength={32767} disabled={saving}
                value={sheetChanges.get(cell.sheet)?.get(cell.address) ?? cell.original}
                className="flex-1 min-w-0 px-2 py-1 rounded border border-edge-strong bg-navy-950 text-ink-primary font-mono"
                onChange={event => updateCell(event.target.value)}
                onKeyDown={event => {
                  if (event.key === 'Escape' || (event.key === 'Enter' && !event.shiftKey)) {
                    event.preventDefault()
                    closeCell()
                  }
                }} />
              <button type="button" onClick={closeCell} disabled={saving} className="px-2 py-1 rounded text-ink-secondary hover:bg-navy-700">{tr('Apply')}</button>
            </> : <span>{tr("Select a cell. Use = for a formula or ' for literal text.")}</span>}
          </div>
        )}

        <div className={`flex-1 min-h-0 bg-navy-950 overflow-auto relative ${editor?.kind === 'docx' ? 'grid grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1' : ''}`}>
          {kind === 'docx' && (
            <iframe ref={docxFrameRef} sandbox="allow-same-origin" referrerPolicy="no-referrer" title={file.name}
              className="docx-preview-host bg-white h-full w-full border-0" />
          )}

          {editor?.kind === 'docx' && (
            <div className="overflow-auto p-4 border-l border-edge-subtle">
              <p className="text-xs text-ink-muted mb-3">{tr('Edit text fragments in the document body. Formatting is retained.')}</p>
              {editor.source.paragraphs.map(paragraph => (
                <fieldset key={paragraph.number} className="mb-3 rounded-md border border-edge-subtle px-2 pb-2">
                  <legend className="px-1 text-xs text-ink-muted">{tr('Paragraph {{number}}', { number: paragraph.number })}</legend>
                  {paragraph.parts.map((part, index) => (
                    <textarea key={part.id} rows={1} disabled={saving} value={wordChanges.get(part.id) ?? part.value}
                      aria-label={tr('Text fragment {{number}}', { number: index + 1 })}
                      className="block w-full mt-1 px-2 py-1 rounded border border-edge-subtle bg-navy-900 text-sm text-ink-primary"
                      onChange={event => {
                        const value = event.target.value
                        setWordChanges(current => {
                          const next = new Map(current)
                          if (value === part.value) next.delete(part.id)
                          else next.set(part.id, value)
                          return next
                        })
                      }} />
                  ))}
                </fieldset>
              ))}
            </div>
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
              {activeSpreadsheet.rows.length === 0 ? <p className="spreadsheet-notice">
                {tr('No cells to preview')}
                {editor?.kind === 'xlsx' && activeSpreadsheet.empty &&
                  <button type="button" className="ml-2 text-blue-400 underline" onClick={() => void selectCell(activeSpreadsheet.name, 'A1')}>A1</button>}
              </p> : <table id="preview-sheet" aria-label={activeSpreadsheet.name}>
                <colgroup><col style={{ width: 48 }} />{activeSpreadsheet.columns.map(column => <col key={column.number} style={{ width: column.width }} />)}</colgroup>
                <thead><tr><th aria-label={tr('Row')} />{activeSpreadsheet.columns.map(column => <th key={column.number} scope="col">{column.label}</th>)}</tr></thead>
                <tbody>{activeSpreadsheet.rows.map(row => <tr key={row.number} style={{ height: row.height }}>
                  <th scope="row">{row.number}</th>
                  {row.cells.map((cellPreview, index) => {
                    if (cellPreview.hidden) return null
                    const address = cellPreview.address
                    const selected = cell?.sheet === activeSpreadsheet.name && cell.address === address
                    const value = sheetChanges.get(activeSpreadsheet.name)?.get(address)
                    return <td key={index} rowSpan={cellPreview.rowSpan} colSpan={cellPreview.colSpan} style={cellPreview.style}>
                      {editor?.kind === 'xlsx' ? <button type="button" disabled={saving} aria-label={address}
                        className={`block w-full min-h-4 text-inherit text-start hover:outline hover:outline-blue-400 ${selected ? 'outline outline-blue-400' : ''}`}
                        style={{ textAlign: 'inherit', whiteSpace: 'inherit' }}
                        onClick={() => void selectCell(activeSpreadsheet.name, address)}>
                        {value === undefined ? cellPreview.text : value.replace(/^'/, '')}
                      </button> : cellPreview.text}
                    </td>
                  })}
                </tr>)}</tbody>
              </table>}
            </div>
          )}

          {!loading && !error && kind === 'xlsx' && !activeSpreadsheet && <p className="p-5 text-sm text-ink-muted">{tr('No cells to preview')}</p>}

          {editor?.kind === 'text' && <textarea autoFocus aria-label={file.name} value={textDraft} disabled={saving}
            onChange={event => setTextDraft(event.target.value)} spellCheck={false}
            className="block w-full h-full resize-none bg-navy-950 p-5 text-xs text-ink-primary font-mono focus:outline-none" />}

          {!loading && !error && kind === 'text' && textContent !== null && !editor && (
            <pre className="p-5 text-xs text-ink-secondary whitespace-pre-wrap font-mono">
              {textContent}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
