import { useEffect, useRef, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowUpRight, Ban, ChevronLeft, ChevronRight, Fingerprint, Globe, Loader2, Search, ShieldAlert, ShieldCheck, SlidersHorizontal, TriangleAlert, X } from 'lucide-react'
import { auditApi, type AuditEvent, type AuditPage, type AuditSummary } from '../api/audit'
import { tr, locale, useLocale } from '../i18n'
import { config } from '../../config'

const emptyFilters = { ip: '', userId: '', account: '', eventType: '', severity: '', path: '', traceId: '', sessionId: '', statusCode: '', from: '', to: '' }
const field = 'w-full rounded-xl border border-edge-default bg-navy-900 px-3 py-2.5 text-xs text-ink-primary outline-none focus:border-blue-400'
const tones: Record<string, string> = { info: 'bg-blue-500/10 text-blue-400', warning: 'bg-orange-500/10 text-orange-400', error: 'bg-red-500/10 text-red-400' }
function eventName(value: string) { return value.replaceAll('_', ' ') }

function AuditDetails({ event, close, search }: { event: AuditEvent; close: () => void; search: (key: string, value: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  const details = [
    ['Time', new Date(event.occurredAt).toLocaleString(locale())], ['Event', eventName(event.eventType)],
    ['Source', event.source], ['Client IP', event.clientIp], ['Proxy IP', event.peerIp],
    ['User ID', event.userId], ['Target user ID', event.targetUserId], ['Attempted account', event.account],
    ['Organization ID', event.organizationId], ['Resource ID', event.resourceId], ['Session ID', event.sessionId],
    ['Method', event.method], ['Path', event.path], ['Matched route', event.route], ['Status', String(event.statusCode)],
    ['Duration', `${event.durationMs} ms`], ['Redirect path', event.redirectPath], ['Trace ID', event.traceId],
    ['User agent', event.userAgent], ['Security signal', event.signal], ['Event ID', event.id],
  ]
  return <dialog ref={dialog} onClose={close} onClick={e => { if (e.target === e.currentTarget) close() }} className="audit-dialog rounded-2xl border border-edge-strong bg-navy-800 p-0 text-ink-primary shadow-2xl">
    <div className="sticky top-0 z-10 flex items-start justify-between border-b border-edge-subtle bg-navy-800 p-6">
      <div><p className="text-[10px] uppercase tracking-[.18em] text-blue-400 mb-2">{tr('Security audit')}</p><h2 className="text-lg font-semibold">{tr('Event details')}</h2></div>
      <button autoFocus onClick={close} aria-label={tr('Close')} className="rounded-lg p-2 hover:bg-navy-700"><X size={18} /></button>
    </div>
    <div className="p-6">
      <div className="flex flex-wrap gap-2 mb-5">
        {event.clientIp && <button className="audit-button" onClick={() => search('ip', event.clientIp!)}><Globe size={13} />{tr('Activity from this IP')}</button>}
        {event.userId && <button className="audit-button" onClick={() => search('userId', event.userId!)}><Fingerprint size={13} />{tr('Activity for this user')}</button>}
        {event.sessionId && <button className="audit-button" onClick={() => search('sessionId', event.sessionId!)}>{tr('Activity for this session')}</button>}
      </div>
      {event.signal && <p className="mb-5 rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-xs text-orange-400">{tr('Signals are investigation hints, not proof of an attack. Browser reports are unverified.')}</p>}
      <dl className="divide-y divide-edge-subtle">{details.map(([label, value]) => <div key={label} className="grid grid-cols-[125px_1fr] gap-4 py-3 text-xs"><dt className="text-ink-muted">{tr(label!)}</dt><dd className="break-all font-mono leading-relaxed">{value || '—'}</dd></div>)}</dl>
    </div>
  </dialog>
}

export default function AuditLog() {
  useLocale()
  const [draft, setDraft] = useState(emptyFilters)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [data, setData] = useState<AuditPage | null>(null)
  const [summary, setSummary] = useState<AuditSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [advanced, setAdvanced] = useState(false)
  const [selected, setSelected] = useState<AuditEvent | null>(null)
  useEffect(() => {
    let active = true
    Promise.all([auditApi.list({ ...filters, page: String(page), pageSize: '50' }), auditApi.summary()]).then(([result, totals]) => {
      if (active) { setData(result); setSummary(totals); setLoading(false) }
    }).catch(e => { if (active) { setError(e instanceof Error ? e.message : tr('Unable to load audit logs')); setLoading(false) } })
    return () => { active = false }
  }, [filters, page, revision])
  const reload = () => { setLoading(true); setError(''); setRevision(v => v + 1) }
  const apply = (values: typeof emptyFilters) => {
    if (values.from && values.to && values.from > values.to) { setError(tr('Start date must be before end date')); return }
    const next: Record<string, string> = {}
    for (const [key, value] of Object.entries(values)) if (value.trim()) next[key] = key === 'from' || key === 'to' ? new Date(value).toISOString() : value.trim()
    setFilters(next); setPage(1); setLoading(true); setError('')
  }
  const pivot = (key: string, value: string) => {
    const next = { ...emptyFilters, [key]: value }; setDraft(next); apply(next); setSelected(null); setAdvanced(true)
  }
  const input = (key: keyof typeof emptyFilters, label: string, type = 'text') => <label className="block text-[11px] text-ink-muted">{tr(label)}<input type={type} value={draft[key]} onChange={e => setDraft(v => ({ ...v, [key]: e.target.value }))} className={`${field} mt-1.5`} maxLength={2048} /></label>
  return <section className="space-y-5">
    <div className="audit-hero rounded-2xl border border-blue-500/20 p-6">
      <div className="flex flex-wrap items-center justify-between gap-5"><div className="flex items-center gap-4"><div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-blue-400"><ShieldCheck size={26} /></div><div><h2 className="text-lg font-semibold tracking-tight">{tr('Security audit')}</h2><p className="mt-1 text-xs text-ink-secondary">{tr('Last 24 hours · investigate account and request activity')}</p></div></div><button className="audit-button" onClick={reload} disabled={loading}><Activity size={14} className={loading ? 'animate-pulse' : ''} />{tr('Refresh')}</button></div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {[
          { label: 'Warnings', value: summary?.warnings ?? 0, icon: TriangleAlert, cls: 'text-orange-400' },
          { label: 'Failed logins', value: summary?.failures ?? 0, icon: ShieldAlert, cls: 'text-yellow-400' },
          { label: 'Errors', value: summary?.errors ?? 0, icon: TriangleAlert, cls: 'text-red-400' },
          { label: 'Denied', value: summary?.denied ?? 0, icon: Ban, cls: 'text-orange-400' },
          { label: 'Rate limited', value: summary?.rateLimited ?? 0, icon: ShieldAlert, cls: 'text-purple-400' },
          { label: '404 routes', value: summary?.notFound ?? 0, icon: Search, cls: 'text-sky-400' },
          { label: 'Incidents detected', value: summary?.incidents ?? 0, icon: ShieldAlert, cls: 'text-red-400', incident: true },
        ].map(card => <div key={card.label} className={`rounded-xl border p-3 ${card.incident ? 'border-red-500/35 bg-red-500/10' : 'border-edge-subtle bg-navy-900/35'}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-wide text-ink-muted">{tr(card.label)}</span><card.icon size={14} className={card.cls} /></div><p className={`mt-2 text-2xl font-semibold font-mono ${card.cls}`}>{card.value}</p>{card.incident && card.value > 0 && <p className="mt-1 text-[10px] font-medium text-red-400">{tr('Incident detected')}</p>}</div>)}
      </div>
    </div>
    {config.appMode === 'mock' && <p className="text-xs text-ink-muted">{tr('Audit records are available when connected to the server.')}</p>}
    <form onSubmit={e => { e.preventDefault(); apply(draft) }} className="rounded-2xl border border-edge-subtle bg-navy-800 p-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {input('ip', 'Client IP')}{input('path', 'Path contains')}
        <label className="text-[11px] text-ink-muted">{tr('Severity')}<select className={`${field} mt-1.5`} value={draft.severity} onChange={e => setDraft(v => ({ ...v, severity: e.target.value }))}><option value="">{tr('All events')}</option>{['info', 'warning', 'error'].map(v => <option key={v} value={v}>{tr(v)}</option>)}</select></label>
        {input('account', 'Attempted account')}
      </div>
      {advanced && <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 border-t border-edge-subtle pt-4">{input('userId', 'User ID')}{input('eventType', 'Event type')}{input('sessionId', 'Session ID')}{input('traceId', 'Trace ID')}{input('statusCode', 'HTTP status', 'number')}{input('from', 'From', 'datetime-local')}{input('to', 'To', 'datetime-local')}</div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><button type="button" className="flex items-center gap-2 text-xs text-ink-secondary" onClick={() => setAdvanced(v => !v)}><SlidersHorizontal size={14} />{tr('More filters')}</button><div className="flex gap-2"><button type="button" className="audit-button" onClick={() => { setDraft(emptyFilters); apply(emptyFilters) }}>{tr('Clear')}</button><button className="flex items-center gap-2 rounded-xl bg-blue-500 px-4 py-2 text-xs font-medium text-white"><Search size={14} />{tr('Search logs')}</button></div></div>
    </form>
    <div className="rounded-2xl border border-edge-subtle bg-navy-800 overflow-hidden">
      <div className="flex justify-between items-center px-5 py-4 border-b border-edge-subtle"><h3 className="text-sm font-semibold">{tr('Activity stream')}</h3><span className="text-xs text-ink-muted">{data ? `${data.total.toLocaleString(locale())} ${tr('events')}` : '—'}</span></div>
      {error ? <div role="alert" className="p-8 text-sm text-red-400">{error}<button className="audit-button mt-4" onClick={reload}>{tr('Retry')}</button></div> : loading ? <div role="status" className="flex justify-center p-16"><Loader2 className="animate-spin text-blue-400" aria-label={tr('Loading')} /></div> : !data?.items.length ? <div className="p-16 text-center"><Search className="mx-auto mb-4 text-ink-muted" size={28} /><p className="text-sm font-medium">{tr('No events found')}</p><p className="mt-2 text-xs text-ink-muted">{tr('Try a wider date range or clear your filters.')}</p></div> : <div className="overflow-x-auto"><table className="w-full text-xs text-left"><thead className="bg-navy-900/50 text-ink-muted"><tr>{['Event', 'Account / IP', 'Request', 'Time'].map(label => <th key={label} className="px-5 py-3 font-medium">{tr(label)}</th>)}</tr></thead><tbody className="divide-y divide-edge-subtle">{data.items.map(item => <tr key={item.id} className="hover:bg-navy-700/40 transition-colors">
        <td className="px-5 py-4"><button onClick={() => setSelected(item)} className="text-left group"><span className={`inline-flex rounded-md px-2 py-1 text-[10px] uppercase tracking-wide mb-1.5 ${tones[item.severity] ?? tones.info}`}>{tr(item.severity)}</span><span className="block font-medium text-ink-primary group-hover:text-blue-400 whitespace-nowrap">{eventName(item.eventType)}</span></button></td>
        <td className="px-5 py-4"><button onClick={() => item.clientIp && pivot('ip', item.clientIp)} className="font-mono text-blue-400 whitespace-nowrap">{item.clientIp || '—'}</button><p className="text-ink-muted mt-1.5 max-w-48 truncate" title={item.account || item.userId}>{item.account || item.userId || tr('Anonymous')}</p></td>
        <td className="px-5 py-4"><div className="flex items-center gap-2"><span className={item.statusCode >= 400 ? 'text-orange-400' : 'text-ink-secondary'}>{item.statusCode}</span><span className="text-[10px] font-mono text-ink-muted">{item.method}</span>{item.statusCode >= 300 && item.statusCode < 400 ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} className="text-ink-muted" />}</div><p className="font-mono mt-1.5 max-w-64 truncate" title={item.path}>{item.path}</p></td>
        <td className="px-5 py-4 whitespace-nowrap text-ink-secondary"><p>{new Date(item.occurredAt).toLocaleDateString(locale())}</p><p className="font-mono text-ink-muted mt-1.5">{new Date(item.occurredAt).toLocaleTimeString(locale())}</p></td>
      </tr>)}</tbody></table></div>}
      <div className="flex justify-between items-center border-t border-edge-subtle p-4"><p className="text-xs text-ink-muted">{tr('Page')} {page} / {Math.max(1, Math.ceil((data?.total ?? 0) / 50))}</p><div className="flex gap-2"><button aria-label={tr('Previous page')} disabled={loading || page === 1} className="audit-button" onClick={() => { setLoading(true); setPage(v => v - 1) }}><ChevronLeft size={15} /></button><button aria-label={tr('Next page')} disabled={loading || page * 50 >= (data?.total ?? 0)} className="audit-button" onClick={() => { setLoading(true); setPage(v => v + 1) }}><ChevronRight size={15} /></button></div></div>
    </div>
    {selected && <AuditDetails event={selected} close={() => setSelected(null)} search={pivot} />}
  </section>
}
