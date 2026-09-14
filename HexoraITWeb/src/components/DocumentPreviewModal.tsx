import { tr, useLocale } from '../i18n'
import { useState, useEffect } from 'react'
import { X, Download, Loader2, AlertTriangle } from 'lucide-react'
import type { WarrantyDocument } from '../api/types'

interface Props {
  doc: WarrantyDocument
  entityId: string
  downloadFn: (id: string) => Promise<Blob>
  onClose: () => void
}

export default function DocumentPreviewModal({ doc, entityId, downloadFn, onClose }: Props) {
  useLocale()
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let objectUrl: string | null = null
    downloadFn(entityId)
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))

    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [entityId, downloadFn])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const isPdf = doc.mimeType === 'application/pdf'
  const isImage = doc.mimeType.startsWith('image/')

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-edge-subtle flex-shrink-0">
          <p className="text-sm font-medium text-ink-primary truncate font-mono">{doc.name}</p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {url && (
                <a href={url}
                download={doc.name}
                className="p-1.5 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700 transition-colors"
                title={tr("Download")}
                >
                <Download size={14} />
              </a>
            )}
            <button onClick={onClose} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-navy-950 flex items-center justify-center overflow-auto">
          {loading ? (
            <Loader2 size={24} className="animate-spin text-ink-muted" />
          ) : error || !url ? (
            <div className="flex flex-col items-center gap-2 text-center px-6">
              <AlertTriangle size={22} className="text-red-400" />
              <p className="text-sm text-ink-secondary">{tr("Couldn't load this document.")}</p>
            </div>
          ) : isPdf ? (
            <iframe src={url} title={doc.name} className="w-full h-full border-0" />
          ) : isImage ? (
            <img src={url} alt={doc.name} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <p className="text-sm text-ink-secondary">{tr("Preview isn't available for this file type.")}</p>
              <a href={url} download={doc.name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors">
                <Download size={12} />  {tr("Download instead")} </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}