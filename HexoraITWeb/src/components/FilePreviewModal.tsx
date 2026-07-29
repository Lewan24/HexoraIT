import { useEffect, useState } from 'react'
import { X, Download, Loader2, AlertTriangle, FileWarning } from 'lucide-react'
import mammoth from 'mammoth'
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
  const [html, setHtml] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)

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
          const buffer = await blob.arrayBuffer()
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer })
          if (!cancelled) setHtml(result.value)
        } else if (kind === 'xlsx') {
          const blob = await filesApi.getContentBlob(file.id)
          const buffer = await blob.arrayBuffer()
          const workbook = XLSX.read(buffer, { type: 'array' })
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]!]
          const tableHtml = XLSX.utils.sheet_to_html(firstSheet!, { id: 'preview-table' })
          if (!cancelled) setHtml(tableHtml)
        } else if (kind === 'text') {
          const blob = await filesApi.getContentBlob(file.id)
          const text = await blob.text()
          if (!cancelled) setTextContent(text)
        }
      } catch {
        if (!cancelled) setError(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (createdUrl) URL.revokeObjectURL(createdUrl)
    }
  }, [file.id, kind])

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

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-edge-subtle flex-shrink-0">
          <p className="text-sm font-medium text-ink-primary truncate font-mono">{file.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={download} className="p-1.5 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700 transition-colors" title="Download">
              <Download size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-navy-950 overflow-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center"><Loader2 size={24} className="animate-spin text-ink-muted" /></div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
              <AlertTriangle size={22} className="text-red-400" />
              <p className="text-sm text-ink-secondary">Couldn't load a preview for this file.</p>
              <button onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors mt-1">
                <Download size={12} /> Download instead
              </button>
            </div>
          ) : kind === 'pdf' && objectUrl ? (
            <iframe src={objectUrl} title={file.name} className="w-full h-full border-0" />
          ) : kind === 'image' && objectUrl ? (
            <div className="h-full flex items-center justify-center p-4">
              <img src={objectUrl} alt={file.name} className="max-w-full max-h-full object-contain" />
            </div>
          ) : (kind === 'docx' || kind === 'xlsx') && html ? (
            <div className={`p-6 bg-white text-black ${kind === 'xlsx' ? 'overflow-auto' : 'prose prose-sm max-w-none'}`}
              dangerouslySetInnerHTML={{ __html: html }} />
          ) : kind === 'text' && textContent !== null ? (
            <pre className="p-5 text-xs text-ink-secondary whitespace-pre-wrap font-mono">{textContent}</pre>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileWarning size={22} className="text-ink-muted" />
              <p className="text-sm text-ink-secondary">Preview isn't available for this file type.</p>
              <button onClick={download} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors">
                <Download size={12} /> Download instead
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}