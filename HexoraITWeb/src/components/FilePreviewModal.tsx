import { useEffect, useRef, useState } from 'react'
import { X, Download, Loader2, AlertTriangle } from 'lucide-react'
import { renderAsync } from 'docx-preview'
import * as XLSX from 'xlsx'
import { filesApi } from '../api/resources'
import { getPreviewKind } from '../lib/filePreview'
import type { StoredFile } from '../api/types'

interface Props {
  file: StoredFile
  onClose: () => void
}

export default function FilePreviewModal({ file, onClose }: Props) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)

  const docxContainerRef = useRef<HTMLDivElement>(null)
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

          if (cancelled) 
            return
          
          if (!docxContainerRef.current) {
              return;
          }

          docxContainerRef.current.innerHTML = '';
          await renderAsync(blob, docxContainerRef.current, undefined, {
            className: 'docx-preview',
            inWrapper: true,
            ignoreWidth: false,
            ignoreHeight: false,
          })
        } else if (kind === 'xlsx') {
          const blob = await filesApi.getContentBlob(file.id)
          const buffer = await blob.arrayBuffer()
          const wb = XLSX.read(buffer, { type: 'array', cellStyles: true })
          if (cancelled) return
          setWorkbook(wb)
          setSheetNames(wb.SheetNames)
          setActiveSheet(0)
        } else if (kind === 'text') {
          const blob = await filesApi.getContentBlob(file.id)
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
  }, [file.id, file.mimeType, kind])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const download = async () => {
    const blob = await filesApi.downloadFile(file.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  const sheetHtml = workbook
    ? XLSX.utils.sheet_to_html(workbook.Sheets[workbook.SheetNames[activeSheet]!]!, { id: 'preview-sheet', editable: false })
    : null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-edge-subtle flex-shrink-0">
          <p className="text-sm font-medium text-ink-primary truncate font-mono">{file.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={download} className="p-1.5 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700 transition-colors" title="Download">
              <Download size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><X size={16} /></button>
          </div>
        </div>

        {kind === 'xlsx' && sheetNames.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-1.5 border-b border-edge-subtle bg-navy-900/40 flex-shrink-0 overflow-x-auto">
            {sheetNames.map((name, i) => (
              <button key={name} onClick={() => setActiveSheet(i)}
                className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${activeSheet === i ? 'bg-blue-500 text-white' : 'text-ink-muted hover:text-ink-secondary hover:bg-navy-700'}`}>
                {name}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 min-h-0 bg-navy-950 overflow-auto relative">
          {kind === 'docx' && (
            <div ref={docxContainerRef} className="docx-preview-host bg-white p-4 h-full overflow-auto"/>
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
                Couldn't load a preview for this file.
              </p>

              <button onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium">
                <Download size={12} />
                Download instead
              </button>
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

          {!loading && !error && kind === 'xlsx' && sheetHtml && (
            <div className="p-4 bg-white overflow-auto h-full spreadsheet-preview" dangerouslySetInnerHTML={{ __html: sheetHtml }}/>
          )}

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