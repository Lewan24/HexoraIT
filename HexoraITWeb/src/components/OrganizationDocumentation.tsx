import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Download, FileText, Loader2, Search, ShieldCheck, X } from 'lucide-react'
import { tr, useLocale, locale } from '../i18n'
import { useApp } from '../context/useApp'
import { documentationApi, type DocumentationOptions, type DocumentationSection } from '../api/documentation'

const inputClass = 'w-full rounded-lg border border-edge-default bg-navy-700 px-3 py-2 text-sm text-ink-primary outline-none focus:border-blue-500'
const sectionTitle = (key: string) => tr(key === 'private-notes' ? 'My private notes' : key === 'files' ? 'File inventory' : key)

export default function OrganizationDocumentation() {
  const { currentOrg, access } = useApp()
  if (!currentOrg || !access?.canManageRoles) return <p role="alert" className="p-6 text-ink-muted">{tr('Only organization owners and administrators can export documentation.')}</p>
  return <DocumentationEditor key={currentOrg.id} orgId={currentOrg.id} orgName={currentOrg.name} />
}

function DocumentationEditor({ orgId, orgName }: { orgId: string; orgName: string }) {
  useLocale()
  const { toast } = useApp()
  const [sections, setSections] = useState<DocumentationSection[]>([])
  const [selection, setSelection] = useState<Record<string, string[] | null>>({})
  const [loading, setLoading] = useState(true)
  const [loadVersion, setLoadVersion] = useState(0)
  const [error, setError] = useState('')
  const [title, setTitle] = useState('')
  const [recipient, setRecipient] = useState('')
  const [language, setLanguage] = useState<'pl' | 'en'>(() => locale().startsWith('pl') ? 'pl' : 'en')
  const [flags, setFlags] = useState({ includeNotes: false, includeFinancials: false, includeSecrets: false, includeOrganizationDescription: false, includeKnowledgeContent: true })
  const [review, setReview] = useState(false)
  const [approved, setApproved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [picker, setPicker] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  useEffect(() => {
    let cancelled = false
    documentationApi.options(orgId).then(options => {
      if (cancelled) return
      setSections(options.sections)
      setSelection(Object.fromEntries(options.sections.filter(section => section.defaultSelected).map(section => [section.key, null])))
      setError('')
    }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : tr('Failed to load report options')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orgId, loadVersion])
  const selected = sections.filter(section => Object.hasOwn(selection, section.key))
  const count = selected.reduce((total, section) => total + (selection[section.key]?.length ?? section.count), 0)
  const sensitive = flags.includeSecrets && selected.some(section => ['passwords', 'licenses'].includes(section.key))
  const toggle = (key: string) => setSelection(previous => {
    const next = { ...previous }; if (Object.hasOwn(next, key)) delete next[key]; else next[key] = null; return next
  })
  const generate = async () => {
    if (!approved || busy || !count) return
    const request: DocumentationOptions = { title, recipient, language, ...flags, includeSecrets: sensitive,
      confirmSensitiveData: approved && sensitive, sections: selected.map(section => ({ key: section.key, itemIds: selection[section.key] ?? null })) }
    setBusy(true); setError(''); controller.current = new AbortController()
    try {
      const blob = await documentationApi.generate(orgId, request, controller.current.signal)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a'); link.href = url; link.download = `documentation-${orgId}-${new Date().toISOString().slice(0, 10)}.pdf`; link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 60000)
      toast(tr('Documentation PDF generated'))
    } catch (error) { if (!controller.current.signal.aborted) setError(error instanceof Error ? error.message : tr('Failed to generate documentation PDF')) }
    finally { setBusy(false) }
  }
  if (loading) return <div className="flex justify-center p-12"><Loader2 size={22} className="animate-spin text-ink-muted" /></div>
  if (!sections.length) return <div role="alert" className="p-6 text-red-400">{error}<button onClick={() => setLoadVersion(value => value + 1)} className="ml-3 text-blue-400">{tr('Retry')}</button></div>
  return <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
    <header className="flex items-start gap-3"><span className="rounded-xl bg-blue-500/10 p-3 text-blue-400"><FileText size={24} /></span><div><h1 className="text-xl font-semibold text-ink-primary">{tr('Documentation PDF')}</h1><p className="mt-1 text-sm text-ink-muted">{orgName}</p><p className="mt-2 text-xs text-ink-muted">{tr('Select the sections and records to share, review the scope, then download the PDF.')}</p></div></header>
    <div className="flex items-center gap-3 text-xs text-ink-muted"><span className={!review ? 'text-blue-400' : ''}>1. {tr('Select data')}</span><ChevronRight size={13} /><span className={review ? 'text-blue-400' : ''}>2. {tr('Review and generate')}</span></div>
    {!review ? <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <section className="space-y-3"><h2 className="text-sm font-semibold text-ink-primary">{tr('Report sections')}</h2>
        {sections.map(section => {
          const enabled = Object.hasOwn(selection, section.key)
          return <div key={section.key} className={`rounded-xl border p-4 ${enabled ? 'border-blue-500/30 bg-blue-500/5' : 'border-edge-subtle bg-navy-800'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3"><label className="flex cursor-pointer items-center gap-3 text-sm text-ink-primary"><input type="checkbox" checked={enabled} onChange={() => toggle(section.key)} className="accent-blue-500" /><span className="capitalize">{sectionTitle(section.key)}</span><span className="text-xs text-ink-muted">{section.count}</span></label>
              {enabled && <button onClick={() => setPicker(section.key)} className="rounded-lg border border-edge-default px-2 py-1.5 text-xs text-blue-400">{tr('Choose records')}</button>}</div>
            {enabled && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-muted"><span>{selection[section.key] === null ? tr('All records in this section') : tr('Selected records: {{count}}', { count: selection[section.key]?.length ?? 0 })}</span>{selection[section.key] !== null && <button onClick={() => setSelection(previous => ({ ...previous, [section.key]: null }))} className="text-blue-400">{tr('Include all')}</button>}</div>}
            {section.key === 'private-notes' && <p className="mt-2 text-xs text-ink-muted">{tr('Only your own private notes are available. Other members’ notes are never exported.')}</p>}
          </div>
        })}
      </section>
      <aside className="space-y-4"><section className="space-y-4 rounded-xl border border-edge-subtle bg-navy-800 p-4"><h2 className="text-sm font-semibold text-ink-primary">{tr('Document details')}</h2>
        <label className="block space-y-1.5 text-xs text-ink-muted">{tr('Report title')}<input value={title} maxLength={200} onChange={event => setTitle(event.target.value)} placeholder={tr('Organization documentation')} className={inputClass} /></label>
        <label className="block space-y-1.5 text-xs text-ink-muted">{tr('Recipient')}<input value={recipient} maxLength={200} onChange={event => setRecipient(event.target.value)} className={inputClass} /></label>
        <label className="block space-y-1.5 text-xs text-ink-muted">{tr('PDF language')}<select value={language} onChange={event => setLanguage(event.target.value as 'pl' | 'en')} className={inputClass}><option value="pl">Polski</option><option value="en">English</option></select></label>
      </section>
      <section className="space-y-3 rounded-xl border border-edge-subtle bg-navy-800 p-4"><h2 className="text-sm font-semibold text-ink-primary">{tr('Included fields')}</h2>
        {([['includeKnowledgeContent', 'Article contents'], ['includeOrganizationDescription', 'Organization description'], ['includeNotes', 'Notes and contact descriptions'], ['includeFinancials', 'Costs and financial values'], ['includeSecrets', 'Plaintext passwords and license keys']] as const).map(([key, label]) => <label key={key} className="flex items-start gap-2 text-xs leading-relaxed text-ink-secondary"><input type="checkbox" className="mt-0.5 accent-blue-500" checked={flags[key]} onChange={event => setFlags(previous => ({ ...previous, [key]: event.target.checked }))} />{tr(label)}</label>)}
        <p className="border-t border-edge-subtle pt-3 text-xs leading-relaxed text-ink-muted">{tr('Files and attachments are listed with their metadata. Their binary contents are not embedded in the PDF.')}</p>
      </section>
      <button disabled={!count} onClick={() => { setReview(true); setApproved(false) }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm text-white disabled:opacity-40">{tr('Review scope')}<ChevronRight size={15} /></button>
      </aside>
    </div> : <section className="space-y-5 rounded-xl border border-edge-default bg-navy-800 p-5 sm:p-6">
      <div className="flex items-center gap-2 text-ink-primary"><ShieldCheck size={21} className="text-blue-400" /><h2 className="font-semibold">{tr('Review and generate')}</h2></div>
      <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-xs text-ink-muted">{tr('Organization')}</dt><dd className="mt-1 text-ink-primary">{orgName}</dd></div><div><dt className="text-xs text-ink-muted">{tr('Recipient')}</dt><dd className="mt-1 text-ink-primary">{recipient || '—'}</dd></div></dl>
      <ul className="divide-y divide-edge-subtle">{selected.map(section => <li key={section.key} className="flex items-center justify-between gap-3 py-2 text-sm text-ink-secondary"><span className="capitalize">{sectionTitle(section.key)}</span><span className="font-mono text-xs">{selection[section.key]?.length ?? section.count}</span></li>)}</ul>
      <div className="grid gap-2 rounded-lg bg-navy-700/50 p-4 text-xs text-ink-muted">
        <p>{tr('Article contents')}: {tr(flags.includeKnowledgeContent ? 'Yes' : 'No')}</p><p>{tr('Organization description')}: {tr(flags.includeOrganizationDescription ? 'Yes' : 'No')}</p><p>{tr('Notes and contact descriptions')}: {tr(flags.includeNotes ? 'Yes' : 'No')}</p><p>{tr('Costs and financial values')}: {tr(flags.includeFinancials ? 'Yes' : 'No')}</p><p>{tr('Plaintext passwords and license keys')}: {tr(sensitive ? 'Yes' : 'No')}</p>
      </div>
      {sensitive && <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-400">{tr('This PDF will contain plaintext passwords or license keys. Confirm that these credentials should be shared with the recipient.')}</p>}
      <label className="flex items-start gap-3 text-sm leading-relaxed text-ink-secondary"><input type="checkbox" disabled={busy} checked={approved} onChange={event => setApproved(event.target.checked)} className="mt-1 accent-blue-500" />{tr('I approve the selected records and fields for inclusion in this PDF.')}</label>
      <p className="text-xs text-ink-muted">{tr('The report uses current data at generation time. Recheck the selection if records have changed.')}</p>
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div className="flex flex-wrap justify-between gap-3"><button disabled={busy} onClick={() => setReview(false)} className="flex items-center gap-2 rounded-lg border border-edge-default px-4 py-2 text-sm text-ink-secondary disabled:opacity-40"><ArrowLeft size={14} />{tr('Edit selection')}</button><button disabled={busy || !approved || !count} onClick={() => void generate()} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white disabled:opacity-40">{busy ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}{tr(busy ? 'Generating PDF…' : 'Generate PDF')}</button></div>
    </section>}
    {picker && <RecordPicker orgId={orgId} section={picker} initial={selection[picker] ?? []} onClose={() => setPicker(null)} onSave={ids => { setSelection(previous => ({ ...previous, [picker]: ids })); setPicker(null) }} />}
  </div>
}

function RecordPicker({ orgId, section, initial, onClose, onSave }: { orgId: string; section: string; initial: string[]; onClose: () => void; onSave: (ids: string[]) => void }) {
  const [selected, setSelected] = useState(new Set(initial))
  const [items, setItems] = useState<{ id: string; name: string }[]>([])
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let cancelled = false
    const timer = window.setTimeout(() => {
      documentationApi.items(orgId, section, page, query).then(batch => {
        if (!cancelled) { setItems(previous => page === 1 ? batch : [...previous, ...batch]); setMore(batch.length === 200); setError('') }
      }).catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : tr('Failed to load records')) }).finally(() => { if (!cancelled) setLoading(false) })
    }, 200)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [orgId, section, page, query])
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={onClose} onKeyDown={event => { if (event.key === 'Escape') onClose() }}>
    <div role="dialog" aria-modal="true" aria-labelledby="record-picker-title" onClick={event => event.stopPropagation()} className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-xl border border-edge-default bg-navy-800 shadow-2xl">
      <header className="flex items-center justify-between border-b border-edge-subtle p-4"><h2 id="record-picker-title" className="font-semibold capitalize text-ink-primary">{sectionTitle(section)}</h2><button onClick={onClose} aria-label={tr('Close')} className="p-1 text-ink-muted"><X size={16} /></button></header>
      <label className="m-4 flex items-center gap-2 rounded-lg border border-edge-default px-3 py-2"><Search size={14} className="text-ink-muted" /><input autoFocus maxLength={200} aria-label={tr('Search records')} placeholder={tr('Search records')} value={query} onChange={event => { setQuery(event.target.value); setPage(1); setLoading(true); setItems([]) }} className="w-full bg-transparent text-sm text-ink-primary outline-none" /></label>
      <div className="min-h-0 overflow-y-auto px-4">{items.map(item => <label key={item.id} className="flex cursor-pointer items-center gap-3 border-b border-edge-subtle py-3 text-sm text-ink-secondary"><input type="checkbox" checked={selected.has(item.id)} onChange={event => setSelected(previous => { const next = new Set(previous); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next })} className="accent-blue-500" /><span className="break-words">{item.name}</span></label>)}{loading && <Loader2 size={18} className="mx-auto my-4 animate-spin text-ink-muted" />}{error && <p role="alert" className="my-3 text-xs text-red-400">{error}</p>}{!loading && !items.length && !error && <p className="py-8 text-center text-xs text-ink-muted">{tr('No matching records')}</p>}{more && !loading && <button onClick={() => { setPage(value => value + 1); setLoading(true) }} className="my-3 text-sm text-blue-400">{tr('Load more')}</button>}</div>
      <footer className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-edge-subtle p-4"><span className="text-xs text-ink-muted">{tr('Selected records: {{count}}', { count: selected.size })}</span><button disabled={!selected.size || selected.size > 5000} onClick={() => onSave([...selected])} className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-40"><Check size={14} />{tr('Apply selection')}</button></footer>
    </div>
  </div>
}
