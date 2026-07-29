import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Folder, FolderPlus, Upload, MoreVertical, Trash2, Download, Eye,
  ChevronRight, Loader2, FileText, Image as ImageIcon, FileSpreadsheet,
  FileCode, File as FileIcon, X,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import { filesApi } from '../api/resources'
import { getPreviewKind, formatFileSize } from '../lib/filePreview'
import FilePreviewModal from './FilePreviewModal'
import type { FileFolder, StoredFile } from '../api/types'

function iconFor(file: StoredFile) {
  const kind = getPreviewKind(file.name, file.mimeType)
  if (kind === 'pdf') return <FileText size={18} className="text-red-400" />
  if (kind === 'image') return <ImageIcon size={18} className="text-blue-400" />
  if (kind === 'xlsx') return <FileSpreadsheet size={18} className="text-green-400" />
  if (kind === 'docx') return <FileText size={18} className="text-blue-400" />
  if (kind === 'text') return <FileCode size={18} className="text-cyan-400" />
  return <FileIcon size={18} className="text-ink-muted" />
}

interface Crumb { id?: string; name: string }

export default function FileExplorer() {
  const { currentOrg, toast } = useApp()
  const [breadcrumbs, setBreadcrumbs] = useState<Crumb[]>([{ id: undefined, name: 'Files' }])
  const [folders, setFolders] = useState<FileFolder[]>([])
  const [files, setFiles] = useState<StoredFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentFolderId = breadcrumbs[breadcrumbs.length - 1]?.id

  const load = useCallback(async () => {
    if (!currentOrg) return
    setLoading(true)
    try {
      const [f, fl] = await Promise.all([
        filesApi.getFolders(currentOrg.id, currentFolderId),
        filesApi.getFiles(currentOrg.id, currentFolderId),
      ])
      setFolders(f)
      setFiles(fl)
    } catch {
      toast('Failed to load files', 'error')
    } finally {
      setLoading(false)
    }
  }, [currentOrg, currentFolderId, toast])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  const openFolder = (folder: FileFolder) => setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }])
  const jumpTo = (index: number) => setBreadcrumbs(prev => prev.slice(0, index + 1))

  const handleUpload = useCallback(async (fileList: FileList | File[]) => {
    if (!currentOrg) 
        return

    if (previewFile)
        return

    const filesArr = Array.from(fileList)
    if (filesArr.length === 0)
        return

    setUploading(true)
    
    let failed = 0
    for (const f of filesArr) {
      try {
        await filesApi.upload(currentOrg.id, f, currentFolderId)
      } catch {
        failed++
      }
    }
    setUploading(false)

    if (failed > 0) 
        toast(`${failed} file(s) failed to upload`, 'error')
    else 
        toast(filesArr.length === 1 ? 'File uploaded' : `${filesArr.length} files uploaded`)

    await load()
  }, [currentOrg, previewFile, toast, load, currentFolderId])

  const handleCreateFolder = async () => {
    if (!currentOrg || !newFolderName.trim() || creatingFolder) return
    setCreatingFolder(true)
    try {
      await filesApi.createFolder(currentOrg.id, newFolderName.trim(), currentFolderId)
      setNewFolderName('')
      setNewFolderOpen(false)
      await load()
    } catch {
      toast('Failed to create folder', 'error')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'folder') await filesApi.deleteFolder(deleteTarget.id)
      else await filesApi.deleteFile(deleteTarget.id)
      setDeleteTarget(null)
      await load()
      toast(`${deleteTarget.type === 'folder' ? 'Folder' : 'File'} deleted`, 'info')
    } catch {
      toast('Failed to delete', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const download = async (file: StoredFile) => {
    const blob = await filesApi.downloadFile(file.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 max-w-[1200px]" onDragOver={e => { e.preventDefault(); if(previewFile === null) setDragOver(true) }} onDragLeave={() => setDragOver(false)}
      onDrop={e => { e.preventDefault(); setDragOver(false); void handleUpload(e.dataTransfer.files) }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">Files</h1>
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.id ?? 'root'} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={12} className="text-ink-muted" />}
                <button onClick={() => jumpTo(i)}
                  className={`text-xs font-mono transition-colors ${i === breadcrumbs.length - 1 ? 'text-ink-primary' : 'text-ink-muted hover:text-ink-secondary'}`}>
                  {crumb.name}
                </button>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setNewFolderOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-secondary text-xs hover:text-ink-primary hover:border-edge-strong transition-colors">
            <FolderPlus size={14} /> New Folder
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files) void handleUpload(e.target.files); e.target.value = '' }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-sm font-medium transition-all disabled:opacity-50"
            style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>

      {dragOver && (
        <div className="fixed inset-0 z-40 bg-blue-500/10 border-4 border-dashed border-blue-500 flex items-center justify-center pointer-events-none">
          <p className="text-blue-300 text-lg font-medium">Drop files to upload</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-ink-muted" /></div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 border-2 border-dashed border-edge-subtle rounded-xl">
          <Folder size={28} className="text-ink-muted opacity-40" />
          <p className="text-sm text-ink-muted">This folder is empty</p>
          <p className="text-xs text-ink-muted">Drag files here, or use the Upload button above</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {folders.map(folder => (
            <div key={folder.id} className="relative group">
              <button onClick={() => openFolder(folder)}
                className="w-full flex flex-col items-center gap-2 p-4 rounded-xl bg-navy-800 border border-edge-subtle hover:border-edge-strong hover:bg-navy-750 transition-colors">
                <Folder size={32} className="text-blue-400 fill-blue-400/20" />
                <p className="text-xs text-ink-primary truncate w-full text-center">{folder.name}</p>
              </button>
              <button onClick={() => setMenuOpenId(menuOpenId === folder.id ? null : folder.id)}
                className="absolute top-2 right-2 p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical size={13} />
              </button>
              {menuOpenId === folder.id && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                  <div className="absolute top-8 right-2 z-40 w-36 bg-navy-750 border border-edge-default rounded-lg shadow-2xl overflow-hidden">
                    <button onClick={() => { setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name }); setMenuOpenId(null) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-navy-700 transition-colors">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {files.map(file => {
            const previewable = getPreviewKind(file.name, file.mimeType) !== 'none'
            return (
              <div key={file.id} className="relative group">
                <button onClick={() => previewable && setPreviewFile(file)}
                  className={`w-full flex flex-col items-center gap-2 p-4 rounded-xl bg-navy-800 border border-edge-subtle transition-colors ${previewable ? 'hover:border-edge-strong hover:bg-navy-750 cursor-pointer' : 'cursor-default'}`}>
                  {iconFor(file)}
                  <p className="text-xs text-ink-primary truncate w-full text-center">{file.name}</p>
                  <p className="text-[10px] text-ink-muted">{formatFileSize(file.size)}</p>
                </button>
                <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {previewable && (
                    <button onClick={() => setPreviewFile(file)} title="Preview" className="p-1 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700">
                      <Eye size={13} />
                    </button>
                  )}
                  <button onClick={() => void download(file)} title="Download" className="p-1 rounded-md text-ink-muted hover:text-blue-400 hover:bg-navy-700">
                    <Download size={13} />
                  </button>
                  <button onClick={() => setDeleteTarget({ type: 'file', id: file.id, name: file.name })} title="Delete" className="p-1 rounded-md text-ink-muted hover:text-red-400 hover:bg-navy-700">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {newFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !creatingFolder && setNewFolderOpen(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-ink-primary">New Folder</h2>
              <button onClick={() => setNewFolderOpen(false)} disabled={creatingFolder} className="text-ink-muted hover:text-ink-primary disabled:opacity-40"><X size={14} /></button>
            </div>
            <input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name" autoFocus disabled={creatingFolder}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder() }}
              className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-sm placeholder:text-ink-muted focus:outline-none focus:border-blue-500 disabled:opacity-50 mb-4" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setNewFolderOpen(false)} disabled={creatingFolder} className="px-3.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">Cancel</button>
              <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5">
                {creatingFolder && <Loader2 size={11} className="animate-spin" />} Create
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-navy-800 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4"><Trash2 size={18} className="text-red-400" /></div>
            <h3 className="text-sm font-semibold text-ink-primary text-center mb-1">Delete {deleteTarget.type === 'folder' ? 'Folder' : 'File'}</h3>
            <p className="text-xs text-ink-muted text-center mb-5">
              Delete <span className="text-ink-primary font-mono">{deleteTarget.name}</span>?
              {deleteTarget.type === 'folder' && ' Everything inside it will be deleted too.'} This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting} className="flex-1 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs transition-colors border border-edge-default disabled:opacity-40">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                {deleting && <Loader2 size={12} className="animate-spin" />} {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {previewFile && <FilePreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}