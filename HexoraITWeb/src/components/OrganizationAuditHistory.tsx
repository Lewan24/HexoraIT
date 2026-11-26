import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Download, History, Plus } from 'lucide-react'
import { v4 as uuid } from 'uuid'
import { locale, tr, useLocale } from '../i18n'
import { useApp } from '../context/useApp'
import { organizationAuditsApi, type AuditAttachment, type AuditStatus, type AuditUpdate, type OrganizationAudit } from '../api/organizationAudits'

const statuses: Record<AuditStatus, string> = { planned: 'Audit planned', 'in-progress': 'Audit in progress', completed: 'Audit completed' }
const button = 'inline-flex items-center justify-center gap-2 rounded-lg border border-edge-default px-3 py-2 text-sm text-ink-primary hover:bg-navy-700 disabled:opacity-50'
const input = 'mt-1 block w-full rounded-lg border border-edge-default bg-navy-900 px-3 py-2 text-sm text-ink-primary'
const card = 'rounded-xl border border-edge-subtle bg-navy-800 p-4'
const errorMessage = (error: unknown) => error instanceof Error ? error.message : tr('Request failed')

export default function OrganizationAuditHistory({ onStudio }: { onStudio: () => void }) {
  const { currentOrg, canWrite } = useApp()
  if (!currentOrg) return null
  return <AuditHistory key={currentOrg.id} orgId={currentOrg.id} orgName={currentOrg.name} writable={canWrite('audit-history')} onStudio={onStudio} />
}

function AuditHistory({ orgId, orgName, writable, onStudio }: { orgId: string; orgName: string; writable: boolean; onStudio: () => void }) {
  useLocale()
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [selected, setSelected] = useState<OrganizationAudit>()
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<{ page: number; revision: number; items?: OrganizationAudit[]; more?: boolean; error?: string }>()
  useEffect(() => {
    let active = true
    organizationAuditsApi.list(orgId, page).then(data => {
      if (active) setResult({ ...data, page, revision })
    }).catch(error => {
      if (active) setResult({ page, revision, error: errorMessage(error) })
    })
    return () => { active = false }
  }, [orgId, page, revision])

  const current = result?.page === page && (result.revision === revision || result.items) ? result : undefined
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <History size={24} className="text-blue-400" />
        <div><h1 className="text-xl font-semibold text-ink-primary">{tr('Audit history')}</h1><p className="text-sm text-ink-muted">{orgName}</p></div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={button} onClick={onStudio}>{tr('Conduct an audit')}</button>
        {writable && <button className={button} onClick={() => setCreating(true)} disabled={creating}><Plus size={16} />{tr('Add audit')}</button>}
      </div>
    </header>

    {creating && writable && <AuditForm orgId={orgId} onCancel={() => setCreating(false)} onSaved={() => {
      setCreating(false)
      setPage(1)
      setSelected(undefined)
      setRevision(value => value + 1)
    }} />}
    {current?.error && <p role="alert" className="text-sm text-red-400">{current.error} <button className={button} onClick={() => setRevision(value => value + 1)}>{tr('Retry')}</button></p>}
    {!current && <p role="status" className="text-sm text-ink-muted">{tr('loading...')}</p>}
    {current?.items?.length === 0 && <p className={`${card} text-sm text-ink-muted`}>{tr('No audits recorded for this organization.')}</p>}
    <ul className="space-y-2">
      {current?.items?.map(audit => <li key={audit.id}>
        <button className={`${card} flex w-full flex-wrap items-center justify-between gap-2 text-left hover:border-blue-500/50`}
          aria-expanded={selected?.id === audit.id} onClick={() => setSelected(selected?.id === audit.id ? undefined : audit)}>
          <span className="min-w-0 break-words font-medium text-ink-primary">{audit.title}</span>
          <span className="text-sm text-ink-muted"><time dateTime={audit.auditDate}>{new Date(`${audit.auditDate}T00:00:00`).toLocaleDateString(locale())}</time> · {tr(statuses[audit.status])}</span>
        </button>
        {selected?.id === audit.id && <AuditTimeline orgId={orgId} audit={audit} writable={writable} onSaved={() => setRevision(value => value + 1)} />}
      </li>)}
    </ul>
    {current && <Pager page={page} more={current.more} change={value => { setSelected(undefined); setPage(value) }} />}
  </div>
}

function Pager({ page, more, change }: { page: number; more?: boolean; change: (page: number) => void }) {
  if (page === 1 && !more) return null
  return <div className="flex gap-2">
    <button className={button} disabled={page === 1} onClick={() => change(page - 1)}>{tr('Previous')}</button>
    <button className={button} disabled={!more} onClick={() => change(page + 1)}>{tr('Next')}</button>
  </div>
}

function AuditTimeline({ orgId, audit, writable, onSaved }: { orgId: string; audit: OrganizationAudit; writable: boolean; onSaved: () => void }) {
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [result, setResult] = useState<{ page: number; retry: number; items?: AuditUpdate[]; more?: boolean; error?: string }>()
  const [editing, setEditing] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [downloading, setDownloading] = useState<string>()
  useEffect(() => {
    let active = true
    organizationAuditsApi.updates(orgId, audit.id, page).then(data => {
      if (active) setResult({ ...data, page, retry })
    }).catch(error => {
      if (active) setResult({ page, retry, error: errorMessage(error) })
    })
    return () => { active = false }
  }, [orgId, audit.id, page, retry])

  const download = async (attachment: AuditAttachment) => {
    setDownloadError('')
    setDownloading(attachment.id)
    try {
      const blob = await organizationAuditsApi.download(orgId, audit.id, attachment.id)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.fileName
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (error) { setDownloadError(errorMessage(error)) }
    finally { setDownloading(undefined) }
  }

  const current = result?.page === page && result.retry === retry ? result : undefined
  return <section aria-label={audit.title} className="space-y-3 p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-medium text-ink-primary">{tr('Audit updates')}</h2>
      {writable && !editing && <button className={button} onClick={() => setEditing(true)}><Plus size={16} />{tr('Add update')}</button>}
    </div>
    {writable && editing && <AuditForm orgId={orgId} audit={audit} onCancel={() => setEditing(false)} onSaved={() => {
      setEditing(false)
      setPage(1)
      setRetry(value => value + 1)
      onSaved()
    }} />}
    {!current && <p role="status" className="text-sm text-ink-muted">{tr('loading...')}</p>}
    {current?.error && <p role="alert" className="text-sm text-red-400">{current.error} <button className={button} onClick={() => setRetry(value => value + 1)}>{tr('Retry')}</button></p>}
    {downloadError && <p role="alert" className="text-sm text-red-400">{downloadError}</p>}
    <ol className="space-y-3">
      {current?.items?.map(update => <li key={update.id} className={card}>
        <p className="font-medium text-ink-primary">{tr(statuses[update.status])}</p>
        <p className="text-xs text-ink-muted">{update.author} · <time dateTime={update.createdAt}>{new Date(update.createdAt).toLocaleString(locale())}</time></p>
        {update.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm text-ink-primary">{update.note}</p>}
        {update.attachments.length > 0 && <ul className="mt-3 flex flex-wrap gap-2">
          {update.attachments.map(file => <li className="min-w-0" key={file.id}><button className={button} disabled={!!downloading} onClick={() => void download(file)}><Download size={15} className="shrink-0" /><span className="break-all">{file.fileName}</span></button></li>)}
        </ul>}
      </li>)}
    </ol>
    {current && <Pager page={page} more={current.more} change={setPage} />}
  </section>
}

function AuditForm({ orgId, audit, onSaved, onCancel }: { orgId: string; audit?: OrganizationAudit; onSaved: () => void; onCancel: () => void }) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const ids = useRef<{ auditId: string; updateId: string } | null>(null)

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    const data = new FormData(event.currentTarget)
    const files = data.getAll('files').filter((entry): entry is File => entry instanceof File && !!entry.name)
    data.delete('files')
    if (files.length > 2 || files.some(file => !/\.(pdf|json)$/i.test(file.name) || !file.size || file.size > 10 * 1024 * 1024)) {
      setError(tr('Attach up to two non-empty JSON or PDF files, up to 10 MB each.'))
      return
    }
    for (const file of files) data.append('files', file)
    ids.current ??= { auditId: audit?.id ?? uuid(), updateId: uuid() }
    setBusy(true)
    setError('')
    try {
      await organizationAuditsApi.append(orgId, ids.current.auditId, ids.current.updateId, data)
      onSaved()
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }

  return <form onSubmit={event => void save(event)} className={card}>
    <fieldset disabled={busy} className="space-y-3">
      <legend className="mb-3 font-semibold text-ink-primary">{tr(audit ? 'Add update' : 'Add audit')}</legend>
      {!audit && <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="text-sm text-ink-muted">{tr('Audit title')}<input className={input} name="title" maxLength={160} required /></label>
        <label className="text-sm text-ink-muted">{tr('Audit date')}<input className={input} name="auditDate" type="date" required /></label>
      </div>}
      <label className="block text-sm text-ink-muted">{tr('Status')}<select className={input} name="status" defaultValue={audit?.status ?? 'planned'}>
        {Object.entries(statuses).map(([status, label]) => <option key={status} value={status}>{tr(label)}</option>)}
      </select></label>
      <label className="block text-sm text-ink-muted">{tr('Notes')}<textarea className={input} name="note" maxLength={4000} rows={3} /></label>
      <label className="block text-sm text-ink-muted">{tr('Attachments')}<input className={input} name="files" type="file" accept=".json,.pdf" multiple />
        <span className="mt-1 block text-xs">{tr('Attach up to two non-empty JSON or PDF files, up to 10 MB each.')}</span>
      </label>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2"><button className={button} type="button" onClick={onCancel}>{tr('Cancel')}</button><button className={`${button} bg-blue-600 text-white`} type="submit">{tr(busy ? 'Saving…' : 'Save')}</button></div>
    </fieldset>
  </form>
}
