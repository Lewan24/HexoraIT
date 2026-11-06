import { useEffect, useState } from 'react'
import { ListOrdered, Loader2, Search, X } from 'lucide-react'
import { useApp } from '../context/useApp'
import { tr, useLocale } from '../i18n'
import { recordOrderApi, type RecordOrderItem } from '../api/recordOrder'

export default function RecordOrderButton({ resources, parentId }: { resources: string[]; parentId?: string }) {
  useLocale()
  const { currentOrg, access } = useApp()
  const [open, setOpen] = useState(false)
  if (!currentOrg || currentOrg.isArchived || !resources.some(resource => resource === 'private-notes' || access?.permissions.some(rule => rule.resource === (resource === 'folders' ? 'files' : resource === 'ip-entries' ? 'networks' : resource) && rule.canRead && rule.canWrite))) return null
  return <>
    <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-edge-default bg-navy-800 px-3 py-1.5 text-xs text-ink-secondary hover:bg-navy-700"><ListOrdered size={14} />{tr('Set record order')}</button>
    {open && <OrderEditor orgId={currentOrg.id} resources={resources} parentId={parentId} onClose={() => setOpen(false)} />}
  </>
}

function OrderEditor({ orgId, resources, parentId, onClose }: { orgId: string; resources: string[]; parentId?: string; onClose: () => void }) {
  const { toast } = useApp()
  const [resource, setResource] = useState(resources[0]!)
  const [items, setItems] = useState<RecordOrderItem[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [version, setVersion] = useState(0)
  const [changes, setChanges] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      recordOrderApi.get(orgId, resource, page, query, parentId).then(batch => {
        if (!cancelled) { setItems(previous => page === 1 ? batch : [...previous, ...batch]); setMore(batch.length === 200); setError('') }
      }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : tr('Failed to load record order')) }).finally(() => { if (!cancelled) setLoading(false) })
    }, 200)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [orgId, resource, page, query, parentId, version])
  const invalid = Object.values(changes).some(value => value !== '' && (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 1_000_000))
  const save = async () => {
    if (busy || invalid || !Object.keys(changes).length || Object.keys(changes).length > 500) return
    setBusy(true); setError('')
    try {
      const result = await recordOrderApi.save(orgId, resource, Object.entries(changes).map(([id, value]) => ({ id, sortIndex: value === '' ? null : Number(value) })))
      window.dispatchEvent(new CustomEvent('organization-record-order-changed', { detail: { organizationId: orgId, resource, changes: result } }))
      setChanges({}); setPage(1); setItems([]); setLoading(true); setVersion(value => value + 1)
      toast(tr('Record order saved'))
    } catch (error) { setError(error instanceof Error ? error.message : tr('Failed to save record order')) }
    finally { setBusy(false) }
  }
  const close = () => { if (!busy && (!Object.keys(changes).length || window.confirm(tr('Discard unsaved order changes?')))) onClose() }
  return <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={close} onKeyDown={event => { if (event.key === 'Escape') close() }}>
    <div role="dialog" aria-modal="true" aria-labelledby="record-order-title" onClick={event => event.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-edge-default bg-navy-800 shadow-2xl">
      <header className="flex items-center justify-between border-b border-edge-subtle px-5 py-4"><h2 id="record-order-title" className="font-semibold text-ink-primary">{tr('Set record order')}</h2><button onClick={close} disabled={busy} aria-label={tr('Close')} className="p-2 text-ink-muted"><X size={16} /></button></header>
      <div className="space-y-3 p-4"><p className="text-xs leading-relaxed text-ink-muted">{tr('Lower indices appear first, also in the PDF. Use 10, 20, 30 to leave room for new records. Empty indices appear last; equal indices use a stable record ID order.')}</p>
        {resources.length > 1 && <select aria-label={tr('Record section')} value={resource} disabled={busy} onChange={event => { if (Object.keys(changes).length && !window.confirm(tr('Discard unsaved order changes?'))) return; setResource(event.target.value); setChanges({}); setItems([]); setPage(1); setLoading(true); setQuery('') }} className="w-full rounded-lg border border-edge-default bg-navy-700 p-2 text-sm text-ink-primary">{resources.map(value => <option key={value} value={value}>{tr(value)}</option>)}</select>}
        <label className="flex items-center gap-2 rounded-lg border border-edge-default px-3 py-2 text-ink-muted"><Search size={14} /><input autoFocus maxLength={200} disabled={busy} aria-label={tr('Search records')} placeholder={tr('Search records')} value={query} onChange={event => { setQuery(event.target.value); setPage(1); setItems([]); setLoading(true) }} className="w-full bg-transparent text-sm text-ink-primary outline-none" /></label>
      </div>
      <div className="min-h-0 overflow-y-auto px-4"><div className="flex justify-between border-b border-edge-default pb-2 text-xs text-ink-muted"><span>{tr('Record')}</span><span>{tr('Order index')}</span></div>
        {items.map(item => <label key={item.id} className="flex items-center justify-between gap-4 border-b border-edge-subtle py-3 text-sm text-ink-secondary"><span className="min-w-0 break-words">{item.name}</span><input type="number" min={1} max={1_000_000} step={1} disabled={busy || !item.canWrite} aria-label={tr('Order index for {{name}}', { name: item.name })} value={changes[item.id] ?? (item.sortIndex == null ? '' : String(item.sortIndex))} placeholder="—" onChange={event => setChanges(previous => ({ ...previous, [item.id]: event.target.value }))} className="w-28 shrink-0 rounded-lg border border-edge-default bg-navy-700 px-3 py-2 font-mono text-xs text-ink-primary disabled:opacity-40" /></label>)}
        {loading && <Loader2 size={18} className="mx-auto my-4 animate-spin text-ink-muted" />}{!loading && !items.length && <p className="py-6 text-center text-xs text-ink-muted">{tr('No matching records')}</p>}{more && !loading && <button disabled={busy} onClick={() => { setPage(value => value + 1); setLoading(true) }} className="py-3 text-sm text-blue-400">{tr('Load more')}</button>}
      </div>
      <footer className="space-y-3 border-t border-edge-subtle p-4">{error && <p role="alert" className="text-sm text-red-400">{error}</p>}{(invalid || Object.keys(changes).length > 500) && <p role="alert" className="text-xs text-red-400">{tr('Use indices from 1 to 1000000 and save at most 500 changed records at once.')}</p>}
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-ink-muted">{tr('Changed records: {{count}}', { count: Object.keys(changes).length })}</span><button disabled={busy || invalid || !Object.keys(changes).length || Object.keys(changes).length > 500} onClick={() => void save()} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white disabled:opacity-40">{busy && <Loader2 size={14} className="animate-spin" />}{tr('Save order')}</button></div>
      </footer>
    </div>
  </div>
}
