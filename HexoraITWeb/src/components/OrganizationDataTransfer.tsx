import { useEffect, useRef, useState } from 'react'
import { Archive, Download, Upload, ShieldCheck, Loader2 } from 'lucide-react'
import { tr, useLocale } from '../i18n'
import { useApp } from '../context/useApp'
import { dataTransferApi, type ArchiveCapabilities, type ArchivePreview, type ArchiveExportOptions } from '../api/dataTransfer'
import { config } from '../../config'

const input = 'w-full rounded-lg border border-edge-default bg-navy-700 px-3 py-2.5 text-sm text-ink-primary'
const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-edge-default px-4 py-2 text-sm font-medium text-ink-primary hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-40'

export default function OrganizationDataTransfer() {
  const { currentOrg, canRead } = useApp()
  useLocale()
  if (!currentOrg || currentOrg.isArchived || !canRead('data-transfer'))
    return <p role="alert">{tr('You do not have permission to transfer organization data.')}</p>
  if (config.appMode === 'mock') return <p className="p-5 text-sm text-ink-secondary">{tr('Data transfer requires a running API. It is unavailable in demo mode.')}</p>
  return <TransferEditor key={currentOrg.id} orgId={currentOrg.id} orgName={currentOrg.name} />
}

function TransferEditor({ orgId, orgName }: { orgId: string; orgName: string }) {
  useLocale()
  const { toast } = useApp()
  const [capabilities, setCapabilities] = useState<ArchiveCapabilities>()
  const [file, setFile] = useState<File>()
  const [preview, setPreview] = useState<ArchivePreview>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [approved, setApproved] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [operation, setOperation] = useState<'export' | 'import'>('export')
  const [archivePassword, setArchivePassword] = useState('')
  const [repeatArchivePassword, setRepeatArchivePassword] = useState('')
  const [importPassword, setImportPassword] = useState('')
  const [options, setOptions] = useState<ArchiveExportOptions>()
  const [sections, setSections] = useState<string[]>([])
  const [allFiles, setAllFiles] = useState(true)
  const [fileIds, setFileIds] = useState<string[]>([])
  const [includeAttachments, setIncludeAttachments] = useState(true)
  const hasExportSelection = sections.some(key => key !== 'files' || allFiles || fileIds.length > 0)
  const dialog = useRef<HTMLDialogElement>(null)
  const controller = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    Promise.all([dataTransferApi.capabilities(orgId), dataTransferApi.options(orgId)]).then(([value, available]) => {
      if (active) { setCapabilities(value); setOptions(available); setSections(available.sections.filter(s => s.count > 0).map(s => s.key)) }
    })
      .catch(err => { if (active) setError(err instanceof Error ? err.message : tr('Operation failed')) })
    return () => { active = false; controller.current?.abort() }
  }, [orgId])

  const review = async () => {
    if (!file || busy) return
    setBusy(true); setError(''); setPreview(undefined)
    controller.current = new AbortController()
    try { setPreview(await dataTransferApi.preview(orgId, file, importPassword, controller.current.signal)) }
    catch (err) { if (!controller.current.signal.aborted) setError(err instanceof Error ? err.message : tr('Operation failed')) }
    finally { setBusy(false) }
  }

  const openConfirmation = (next: 'export' | 'import') => {
    setOperation(next); setPassword(''); setConfirmation(''); setApproved(false); setError('')
    if (next === 'export') { setArchivePassword(''); setRepeatArchivePassword('') }
    setDialogOpen(true)
    dialog.current?.showModal()
  }

  const execute = async () => {
    if (busy || !approved || !password || (operation === 'import' && (confirmation !== orgName || !file || !preview))) return
    if (operation === 'export' && (!hasExportSelection || archivePassword.length < 16 || archivePassword !== repeatArchivePassword)) return
    setBusy(true); setError(''); controller.current = new AbortController()
    try {
      if (operation === 'export') {
        const url = await dataTransferApi.export(orgId, password, archivePassword,
          { sections, fileIds: sections.includes('files') && !allFiles ? fileIds : null, includeAttachments }, controller.current.signal)
        const link = document.createElement('a')
        link.href = url; link.download = `hexorait-${orgId}-${new Date().toISOString().slice(0, 10)}.zip`
        document.body.append(link); link.click(); link.remove()
        toast(tr('Organization archive exported'))
      } else if (file && preview) {
        await dataTransferApi.import(orgId, file, preview.reviewToken, password, confirmation, importPassword, controller.current.signal)
        setImportPassword('')
        setPreview(undefined); setFile(undefined)
        if (fileInput.current) fileInput.current.value = ''
        setCapabilities(previous => previous ? { ...previous, isEmpty: false } : previous)
        window.dispatchEvent(new Event('organization-access-changed'))
        toast(tr('Organization data imported'))
      }
      dialog.current?.close()
    } catch (err) {
      if (!controller.current.signal.aborted) setError(err instanceof Error ? err.message : tr('Operation failed'))
    } finally { setPassword(''); setArchivePassword(''); setRepeatArchivePassword(''); setBusy(false) }
  }

  return <div className="space-y-7 text-ink-primary">
    <header className="space-y-2">
      <h2 className="flex items-center gap-3 text-lg font-semibold"><Archive size={22} className="text-blue-400" />{tr('Export and import data')}</h2>
      <p className="text-sm leading-relaxed text-ink-secondary">{tr('Move shared documentation and files between organizations using a ZIP archive.')}</p>
    </header>
    <div className="flex gap-3 rounded-lg border border-edge-default bg-navy-800 p-4 text-sm leading-relaxed text-ink-secondary">
      <ShieldCheck size={21} className="mt-0.5 shrink-0 text-blue-400" />
      <p>{tr('Accounts, roles, permissions, audit history, personal settings and private notes are not transferred. Destination permissions remain unchanged.')}</p>
    </div>
    {error && !dialogOpen && <p role="alert" className="text-sm text-red-400">{tr(error)}</p>}
    {!capabilities && !error && <p role="status" className="text-sm text-ink-secondary">{tr('Loading…')}</p>}
    {capabilities?.canExport && <section className="space-y-3 border-b border-edge-subtle pb-7">
      <h3 className="text-base font-semibold">{tr('Export organization archive')}</h3>
      <p className="text-sm leading-relaxed text-ink-secondary">{tr('The ZIP encrypts JSON data and all included files with AES-256 using your archive password. You will need this password to restore it on any instance.')}</p>
      <p className="text-xs leading-relaxed text-ink-muted">{tr('Limits: 64 GiB ZIP and unpacked data, 8 GiB per file, 16 MiB JSON, 50,000 records and 5,000 files. Downloads stream directly to your browser.')}</p>
      {options && <fieldset disabled={busy} className="space-y-4 py-3">
        <legend className="text-sm font-semibold">{tr('Export scope')}</legend>
        <p className="text-sm leading-relaxed text-ink-secondary">{tr('Choose sections and files. Required related records are included automatically to preserve links during import.')}</p>
        <div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => setSections(options.sections.filter(s => s.count > 0).map(s => s.key))}>{tr('Select all')}</button><button type="button" className={button} onClick={() => setSections([])}>{tr('Deselect all')}</button></div>
        <div className="grid gap-2 sm:grid-cols-2">{options.sections.filter(s => s.count > 0).map(section => <label key={section.key} className="flex min-h-11 items-center gap-3 rounded-lg border border-edge-subtle px-3 py-2 text-sm"><input type="checkbox" checked={sections.includes(section.key)} onChange={e => setSections(current => e.target.checked ? [...current, section.key] : current.filter(key => key !== section.key))} className="accent-blue-500" /><span className="flex-1">{tr(section.key)}</span><span className="text-ink-secondary tabular-nums">{section.count}</span></label>)}</div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={includeAttachments} onChange={e => setIncludeAttachments(e.target.checked)} className="mt-1 accent-blue-500" />{tr('Include contract and warranty attachments')}</label>
        {sections.includes('files') && <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={allFiles} onChange={e => setAllFiles(e.target.checked)} className="accent-blue-500" />{tr('Include all stored files')}</label>
          {!allFiles && <div className="max-h-64 space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-edge-default p-2">{options.files.map(stored => <label key={stored.id} className="flex items-start gap-3 rounded px-2 py-2 text-sm hover:bg-navy-700"><input type="checkbox" className="mt-1 accent-blue-500" checked={fileIds.includes(stored.id)} onChange={e => setFileIds(ids => e.target.checked ? [...ids, stored.id] : ids.filter(id => id !== stored.id))} /><span className="min-w-0 flex-1 break-words">{stored.name}</span><span className="shrink-0 text-xs text-ink-secondary">{(stored.size / 1024 ** 3).toFixed(2)} GiB</span></label>)}</div>}
        </div>}
      </fieldset>}
      <button className={button} disabled={busy || capabilities.isEmpty || !options || !hasExportSelection} onClick={() => openConfirmation('export')}><Download size={17} />{tr('Export ZIP')}</button>
      {capabilities.isEmpty && <p className="text-sm text-ink-muted">{tr('There is no shared documentation to export.')}</p>}
    </section>}
    {capabilities?.canImport && <section className="space-y-4">
      <h3 className="text-base font-semibold">{tr('Import organization archive')}</h3>
      <p className="text-sm leading-relaxed text-ink-secondary">{tr('Import is allowed only into an empty organization. Existing data is never deleted or overwritten. Create a new organization first to restore a backup safely.')}</p>
      {!capabilities.isEmpty ? <p role="status" className="rounded-lg border border-edge-default p-4 text-sm text-ink-secondary">{tr('This organization already contains documentation. Choose or create an empty organization to import data.')}</p>
        : <>
          <label className="block space-y-2 text-sm font-medium">{tr('Organization ZIP archive')}
            <input ref={fileInput} type="file" accept=".zip,application/zip" disabled={busy} className={`${input} mt-2 cursor-pointer`}
              onChange={event => {
                const next = event.target.files?.[0]
                setPreview(undefined); setError(''); setFile(undefined); setImportPassword('')
                if (next && next.size > capabilities.maxArchiveBytes) { setError('Archive exceeds the 64 GiB size limit.'); event.target.value = ''; return }
                setFile(next)
              }} />
          </label>
          <label className="block space-y-2 text-sm">{tr('Archive password')}<input type="password" autoComplete="off" value={importPassword} maxLength={1024} disabled={busy} className={`${input} mt-2`} onChange={e => { setImportPassword(e.target.value); setPreview(undefined) }} /></label>
          <p className="text-xs text-ink-muted">{tr('Enter the password used when exporting this ZIP. Leave empty only for an older, unencrypted backup.')}</p>
          <button className={button} disabled={busy || !file} onClick={() => void review()}>{busy ? <Loader2 size={17} className="animate-spin" /> : <Upload size={17} />}{tr('Validate and review archive')}</button>
          {preview && <div className="space-y-4 rounded-lg border border-edge-default p-4">
            <div><h4 className="font-semibold">{tr('Import summary')}</h4><p className="mt-1 break-words text-sm text-ink-secondary">{tr('Source organization')}: {preview.organizationName}</p><p className="mt-1 text-sm text-ink-secondary">{tr('Destination organization')}: {orgName}</p></div>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">{Object.entries(preview.counts).filter(([, count]) => count > 0).map(([kind, count]) => <div key={kind} className="flex justify-between gap-4"><dt className="text-ink-secondary">{tr(kind)}</dt><dd className="font-medium tabular-nums">{count}</dd></div>)}</dl>
            <p className="text-sm text-ink-secondary">{tr('Files')}: {preview.fileCount} · {(preview.fileBytes / 1024 / 1024).toFixed(2)} MiB</p>
            <p className="text-xs text-ink-muted">{tr('This review expires after 10 minutes. The imported file must match the reviewed archive.')}</p>
            <button className={button} disabled={busy} onClick={() => openConfirmation('import')}>{tr('Confirm import')}</button>
          </div>}
        </>}
    </section>}
    <dialog ref={dialog} aria-labelledby="transfer-confirm-title" className="audit-dialog overflow-y-auto overscroll-contain rounded-xl border border-edge-default bg-navy-800 p-0 text-ink-primary shadow-xl"
      onCancel={event => { if (busy) event.preventDefault(); else setPassword('') }} onClose={() => { setDialogOpen(false); setPassword(''); setArchivePassword(''); setRepeatArchivePassword(''); setConfirmation(''); setApproved(false) }}>
      <form onSubmit={event => { event.preventDefault(); void execute() }} className="space-y-5 p-5 sm:p-6">
        <h3 id="transfer-confirm-title" className="text-lg font-semibold">{tr(operation === 'export' ? 'Confirm confidential data export' : 'Confirm organization import')}</h3>
        <p className="text-sm leading-relaxed text-ink-secondary">{tr(operation === 'export'
          ? 'The selected data may include vault passwords and license keys. All entries will be encrypted. Confirm that you are authorized to export this scope.'
          : 'Import can conflict with existing data. This application prevents overwriting: the destination must still be empty when the import is committed. Accounts and permissions will not be replaced.')}</p>
        {error && <p role="alert" className="text-sm text-red-400">{tr(error)}</p>}
        {operation === 'import' && <label className="block space-y-2 text-sm">{tr('Type the destination organization name')}: <strong className="break-words">{orgName}</strong><input className={`${input} mt-2`} required autoComplete="off" value={confirmation} disabled={busy} onChange={event => setConfirmation(event.target.value)} /></label>}
        {operation === 'export' && <>
          <label className="block space-y-2 text-sm">{tr('New archive password')}<input type="password" autoComplete="new-password" required minLength={16} maxLength={1024} className={`${input} mt-2`} value={archivePassword} disabled={busy} onChange={e => setArchivePassword(e.target.value)} /></label>
          <label className="block space-y-2 text-sm">{tr('Repeat archive password')}<input type="password" autoComplete="new-password" required minLength={16} maxLength={1024} className={`${input} mt-2`} value={repeatArchivePassword} disabled={busy} onChange={e => setRepeatArchivePassword(e.target.value)} /></label>
          <p className="text-xs leading-relaxed text-ink-secondary">{tr('Use at least 16 characters, preferably several random words. Save this password separately: it cannot be recovered and is required on every instance.')}</p>
        </>}
        <label className="block space-y-2 text-sm">{tr('Your account password')}<input type="password" autoComplete="current-password" required maxLength={1024} className={`${input} mt-2`} value={password} disabled={busy} onChange={event => setPassword(event.target.value)} /></label>
        <p className="text-xs text-ink-muted">{tr('Your password confirms this operation only. It is not stored in the archive.')}</p>
        <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" required checked={approved} disabled={busy} onChange={event => setApproved(event.target.checked)} className="mt-1 accent-blue-500" />{tr(operation === 'export' ? 'I approve exporting the selected documentation and credentials in an encrypted archive.' : 'I approve importing the reviewed data and files into this organization.')}</label>
        <div className="flex flex-wrap justify-end gap-3"><button type="button" className={button} disabled={busy} onClick={() => dialog.current?.close()}>{tr('Cancel')}</button><button className={`${button} bg-blue-600 text-white hover:bg-blue-500`} disabled={busy || !approved || !password || (operation === 'import' && confirmation !== orgName) || (operation === 'export' && (!hasExportSelection || archivePassword.length < 16 || archivePassword !== repeatArchivePassword))}>{busy && <Loader2 size={17} className="animate-spin" />}{tr(busy ? 'Processing…' : operation === 'export' ? 'Download archive' : 'Import data')}</button></div>
      </form>
    </dialog>
  </div>
}
