import { tr, useLocale } from '../i18n'
import { useState, useRef } from 'react'
import { Paperclip, FileText, Eye, AlertTriangle, Loader2 } from 'lucide-react'
import { useApp } from '../context/useApp'
import DocumentPreviewModal from './DocumentPreviewModal'
import type { WarrantyDocument } from '../api/types'

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.ceil(bytes / 1024)} KB`
}

interface Props {
  doc?: WarrantyDocument
  entityId?: string
  pendingFileName?: string
  onPendingFile?: (file: File) => void
  onUploaded?: (doc: WarrantyDocument) => void
  uploadFn: (id: string, file: File) => Promise<{ document?: WarrantyDocument }>
  downloadFn: (id: string) => Promise<Blob>
  accept?: string
}

export default function DocumentAttachment({
  doc, entityId, pendingFileName, onPendingFile, onUploaded, uploadFn, downloadFn,
  accept = '.pdf,.png,.jpg,.jpeg,.webp',
}: Props) {
  useLocale()
  const fileRef = useRef<HTMLInputElement>(null)
  const [warning, setWarning] = useState('')
  const [uploading, setUploading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const { toast } = useApp()

  const handleFile = async (file: File) => {
    setWarning('')
    if (file.size > 5 * 1024 * 1024) {
      setWarning(tr('File is large ({{size}}). Large files may affect performance.', { size: formatSize(file.size) }))
    }
    if (entityId) {
      setUploading(true)
      try {
        const updated = await uploadFn(entityId, file)
        if (updated.document) onUploaded?.(updated.document)
        toast(tr("Document uploaded"))
      } catch {
        toast(tr("Failed to upload document"), 'error')
      } finally {
        setUploading(false)
      }
    } else {
      onPendingFile?.(file)
    }
  }

  const isPdf = doc?.mimeType === 'application/pdf'

  return (
    <div>
      <input ref={fileRef} type="file" accept={accept} className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = '' }} />

      {uploading ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-navy-700 border border-edge-default">
          <Loader2 size={14} className="animate-spin text-ink-muted flex-shrink-0" />
          <span className="text-xs text-ink-muted">{tr("Uploading…")}</span>
        </div>
      ) : doc ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-navy-700 border border-edge-default">
          <div className="w-7 h-7 rounded-md bg-navy-600 border border-edge-subtle flex items-center justify-center flex-shrink-0">
            <FileText size={13} className={isPdf ? 'text-red-400' : 'text-blue-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-ink-primary truncate font-mono">{doc.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${isPdf ? 'text-red-400 bg-red-500/10 border-red-500/25' : 'text-blue-400 bg-blue-500/10 border-blue-500/25'}`}>{isPdf ? tr("PDF") : tr("Image")}</span>
              <span className="text-[10px] text-ink-muted">{formatSize(doc.size)}</span>
            </div>
          </div>
          {entityId && (
            <button onClick={() => setPreviewOpen(true)} className="p-1.5 rounded-md bg-navy-600 border border-edge-subtle text-ink-muted hover:text-blue-400 transition-colors" title={tr("View")}>
              <Eye size={12} />
            </button>
          )}
          <button onClick={() => fileRef.current?.click()} className="p-1.5 rounded-md bg-navy-600 border border-edge-subtle text-ink-muted hover:text-blue-400 transition-colors" title={tr("Replace")}><Paperclip size={12} /></button>
        </div>
      ) : pendingFileName ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-navy-700 border border-edge-default">
          <FileText size={13} className="text-blue-400 flex-shrink-0" />
          <p className="text-xs text-ink-primary truncate font-mono flex-1">{pendingFileName}</p>
          <span className="text-[9px] text-ink-muted flex-shrink-0">{tr("will upload on save")}</span>
        </div>
      ) : (
        <button onClick={() => fileRef.current?.click()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-secondary text-xs hover:bg-navy-600 hover:border-edge-strong transition-colors w-full">
          <Paperclip size={12} />  {tr("Attach PDF / Image")} </button>
      )}
      {warning && <p className="text-[10px] text-orange-400 mt-1.5 flex items-center gap-1"><AlertTriangle size={10} /> {warning}</p>}

      {previewOpen && doc && entityId && (
        <DocumentPreviewModal doc={doc} entityId={entityId} downloadFn={downloadFn} onClose={() => setPreviewOpen(false)} />
      )}
    </div>
  )
}