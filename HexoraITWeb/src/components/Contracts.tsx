import { tr, useLocale, locale } from '../i18n'
import { useState } from 'react'
import {
  Plus, Search, X, Edit2, Trash2, Star, ArrowLeft,
  Calendar, DollarSign, Building2, FileText, RefreshCw,
  CheckCircle2, AlertTriangle, Clock, ChevronDown, Loader2,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Contract, ContractCategory, ContractStatus } from '../api/types'
import DocumentAttachment from '../components/DocumentAttachment'
import { contractsApi } from '../api/resources'

const CATEGORIES: ContractCategory[] = ['Service', 'Support', 'Maintenance', 'Lease', 'NDA', 'SLA', 'Software', 'Other']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'CZK']

const STATUS_CONFIG: Record<ContractStatus, { cls: string; icon: React.ReactNode; label: string }> = {
  active:   { cls: 'bg-green-500/15 text-green-400 border-green-500/30',   icon: <CheckCircle2 size={11} />, label: 'Active' },
  expiring: { cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: <AlertTriangle size={11} />, label: 'Expiring' },
  expired:  { cls: 'bg-red-500/15 text-red-400 border-red-500/30',         icon: <AlertTriangle size={11} />, label: 'Expired' },
  draft:    { cls: 'bg-navy-500/20 text-ink-muted border-edge-default',    icon: <Clock size={11} />,        label: 'Draft' },
}

const CAT_COLORS: Record<ContractCategory, string> = {
  Service:     'text-blue-400 bg-blue-500/10 border-blue-500/25',
  Support:     'text-cyan-400 bg-cyan-500/10 border-cyan-500/25',
  Maintenance: 'text-green-400 bg-green-500/10 border-green-500/25',
  Lease:       'text-purple-400 bg-purple-500/10 border-purple-500/25',
  NDA:         'text-yellow-400 bg-yellow-500/10 border-yellow-500/25',
  SLA:         'text-orange-400 bg-orange-500/10 border-orange-500/25',
  Software:    'text-indigo-400 bg-indigo-500/10 border-indigo-500/25',
  Other:       'text-ink-muted bg-navy-500/20 border-edge-default',
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

const inp = (err?: string) =>
  `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`

// ─── Contract Modal ───────────────────────────────────────────────────────────

function ContractModal({ initial, onClose, onSave }: {
  initial?: Contract
  onClose: () => void
  onSave: (c: Omit<Contract, 'id' | 'status' | 'document'>, pendingFile?: File) => Promise<void>
}) {
  useLocale()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    vendor: initial?.vendor ?? '',
    category: initial?.category ?? 'Service' as ContractCategory,
    startDate: initial?.startDate ?? '',
    endDate: initial?.endDate ?? '',
    value: initial?.value != null ? String(initial.value) : '',
    currency: initial?.currency ?? 'USD',
    autoRenew: initial?.autoRenew ?? false,
    notes: initial?.notes ?? '',
    starred: initial?.starred ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | undefined>()

  const set = (k: string, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }))
    if (typeof v === 'string') setErrors(e => ({ ...e, [k]: '' }))
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = tr("Required")
    if (!form.vendor.trim()) e.vendor = tr("Required")
    if (!form.endDate) e.endDate = tr("Required")
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({
        name: form.name.trim(),
        vendor: form.vendor.trim(),
        category: form.category,
        startDate: form.startDate,
        endDate: form.endDate,
        value: Number(form.value) || 0,
        currency: form.currency,
        autoRenew: form.autoRenew,
        notes: form.notes.trim(),
        starred: form.starred,
      }, pendingFile)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit Contract") : tr("Add Contract")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{tr("Vendor agreements, SLAs, leases")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Contract Name *")}</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={tr("e.g. Annual Support Agreement")} className={inp(errors.name)} autoFocus disabled={submitting} />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Vendor *")}</label>
              <input value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder={tr("Acme Corp")} className={inp(errors.vendor)} disabled={submitting} />
              {errors.vendor && <p className="text-[10px] text-red-400 mt-1">{errors.vendor}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Category")}</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inp()} disabled={submitting}>
                {CATEGORIES.map(c => <option key={c} value={c}>{tr(c)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Start Date")}</label>
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} className={inp()} disabled={submitting} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("End Date *")}</label>
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} className={inp(errors.endDate)} disabled={submitting} />
              {errors.endDate && <p className="text-[10px] text-red-400 mt-1">{errors.endDate}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Contract Value")}</label>
              <input value={form.value} onChange={e => set('value', e.target.value)} placeholder={"0.00"} className={inp() + ' font-mono'} disabled={submitting} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Currency")}</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inp()} disabled={submitting}>
                {CURRENCIES.map(c => <option key={c} value={c}>{tr(c)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Notes")}</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder={tr("Key terms, contact persons, renewal conditions…")} className={inp() + ' resize-none'} disabled={submitting} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Document")}</label>
            <DocumentAttachment
              doc={initial?.document}
              entityId={initial?.id}
              pendingFileName={pendingFile?.name}
              onPendingFile={setPendingFile}
              uploadFn={contractsApi.uploadDocument}
              downloadFn={contractsApi.downloadDocument}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-medium text-ink-secondary">{tr("Auto-Renew")}</p>
              <p className="text-[10px] text-ink-muted">{tr("Contract renews automatically")}</p>
            </div>
            <button onClick={() => !submitting && set('autoRenew', !form.autoRenew)} disabled={submitting}
              className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 ${form.autoRenew ? 'bg-blue-500' : 'bg-navy-600 border border-edge-default'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.autoRenew ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          <button onClick={() => !submitting && set('starred', !form.starred)} disabled={submitting}
            className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 ${form.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-ink-secondary'}`}>
            <Star size={13} className={form.starred ? 'fill-yellow-400' : ''} />  {tr("Starred")} </button>
          <div className="flex gap-2">
            <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
            <button onClick={submit} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
              style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? tr("Saving…") : initial ? tr("Save Changes") : tr("Add Contract")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Contract Detail ──────────────────────────────────────────────────────────

function ContractDetail({ contract, onEdit, onDelete, onToggleStar }: {
  contract: Contract
  onEdit: () => void
  onDelete: () => void
  onToggleStar: () => void
}) {
  useLocale()
  const sc = STATUS_CONFIG[contract.status]
  const days = daysUntil(contract.endDate)

  return (
    <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-edge-subtle">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-primary leading-snug">{contract.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${sc.cls}`}>
                {sc.icon} {tr(sc.label)}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-semibold ${CAT_COLORS[contract.category]}`}>
                {tr(contract.category)}
              </span>
              {contract.autoRenew && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
                  <RefreshCw size={9} />  {tr("Auto-Renew")} </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onToggleStar}
              className={`p-1.5 rounded-md transition-colors hover:bg-navy-700 ${contract.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-yellow-400'}`}>
              <Star size={13} className={contract.starred ? 'fill-yellow-400' : ''} />
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-ink-primary transition-colors"><Edit2 size={13} /></button>
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      {Math.abs(days) < 365 && (
        <div className={`px-5 py-2.5 border-b border-edge-subtle ${days < 0 ? 'bg-red-500/5' : days <= 60 ? 'bg-orange-500/5' : ''}`}>
          <p className={`text-xs font-semibold font-mono ${days < 0 ? 'text-red-400' : days <= 60 ? 'text-orange-400' : 'text-ink-secondary'}`}>
            {days < 0 ? tr('Expired {{count}} days ago', { count: Math.abs(days) }) : tr('Expires in {{count}} days', { count: days })}
          </p>
        </div>
      )}

      <div className="px-5 py-4 space-y-0 divide-y divide-edge-subtle">
        {[
          { label: 'Vendor', value: contract.vendor, icon: <Building2 size={11} /> },
          { label: 'Start', value: contract.startDate || '—', icon: <Calendar size={11} />, mono: true },
          { label: 'End', value: contract.endDate, icon: <Calendar size={11} />, mono: true },
          { label: 'Value', value: contract.value > 0 ? `${contract.value.toLocaleString(locale())} ${contract.currency}` : '—', icon: <DollarSign size={11} />, mono: true },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2 py-2.5">
            <span className="text-ink-muted flex-shrink-0">{r.icon}</span>
            <span className="text-xs text-ink-muted w-16 flex-shrink-0">{tr(r.label)}</span>
            <span className={`text-xs text-ink-secondary ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
          </div>
        ))}
      </div>

      {contract.notes && (
        <div className="px-5 py-4 border-t border-edge-subtle">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">{tr("Notes")}</p>
          <p className="text-xs text-ink-secondary leading-relaxed">{contract.notes}</p>
        </div>
      )}

      <div className="px-5 py-4 border-t border-edge-subtle">
        <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">{tr("Document")}</p>
        <DocumentAttachment
          doc={contract.document}
          entityId={contract.id}
          uploadFn={contractsApi.uploadDocument}
          downloadFn={contractsApi.downloadDocument}
        />
      </div>
    </div>
  )
}

// ─── Contracts ────────────────────────────────────────────────────────────────

export default function Contracts() {
  useLocale()
  const { contracts, isLoading, addContract, updateContract, deleteContract, toggleStarContract, toast } = useApp()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'All'>('All')
  const [selectedId, setSelectedId] = useState<string | null>(
    () => contracts[0]?.id ?? null
  )
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; initial?: Contract }>({ open: false })
  const [catOpen, setCatOpen] = useState(false)
  const [catFilter, setCatFilter] = useState<ContractCategory | 'All'>('All')

  const filtered = contracts.filter(c =>
    (statusFilter === 'All' || c.status === statusFilter) &&
    (catFilter === 'All' || c.category === catFilter) &&
    (c.name.toLowerCase().includes(query.toLowerCase()) ||
     c.vendor.toLowerCase().includes(query.toLowerCase()))
  )

  const activeSelectedId = selectedId ?? contracts[0]?.id ?? null
  const selected = contracts.find(c => c.id === activeSelectedId) ?? null

  const totalValue = contracts.reduce((s, c) => s + c.value, 0)
  const active = contracts.filter(c => c.status === 'active').length
  const expiring = contracts.filter(c => c.status === 'expiring').length
  const expired = contracts.filter(c => c.status === 'expired').length

  const handleSave = async (data: Omit<Contract, 'id' | 'status' | 'document'>, pendingFile?: File) => {
    if (modal.initial) {
      await updateContract({ ...modal.initial, ...data })
    } else {
      await addContract(data)
      if (pendingFile) {
        const latest = contracts[0]
        if (latest) {
          try {
            await contractsApi.uploadDocument(latest.id, pendingFile)
          } catch {
            toast(tr("Contract saved, but the document failed to upload"), 'error')
          }
        }
      }
    }
    setModal({ open: false })
  }

  const handleDelete = async (id: string) => {
    await deleteContract(id)
    if (activeSelectedId === id) setSelectedId(filtered.find(c => c.id !== id)?.id ?? null)
    setMobileDetailOpen(false)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{tr("Contracts")}</h1>
          <p className="text-xs text-ink-muted mt-0.5">{contracts.length}  {tr("contracts ·")} {totalValue.toLocaleString(locale())}  {tr("total value")}</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} />  {tr("Add Contract")} </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Active', value: active, color: 'text-green-400', status: 'active' as const },
          { label: 'Expiring', value: expiring, color: 'text-orange-400', status: 'expiring' as const },
          { label: 'Expired', value: expired, color: 'text-red-400', status: 'expired' as const },
          { label: 'Total Value', value: `${(totalValue / 1000).toFixed(1)}k`, color: 'text-blue-400', status: null },
        ].map((card, i) => (
          <div key={i}
            onClick={() => card.status && setStatusFilter(statusFilter === card.status ? 'All' : card.status)}
            className={`bg-navy-800 border rounded-xl p-4 transition-all ${card.status ? 'cursor-pointer hover:-translate-y-0.5' : ''} ${statusFilter === card.status ? 'border-blue-500/40 bg-navy-750' : 'border-edge-subtle'}`}>
            <p className={`text-2xl font-semibold font-mono ${card.color}`}>{card.value}</p>
            <p className="text-xs font-medium text-ink-secondary mt-1">{tr(card.label)}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tr("Search contracts…")}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:border-blue-500 focus:outline-none transition-colors" />
        </div>
        <div className="relative">
          <button onClick={() => setCatOpen(!catOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors ${catFilter !== 'All' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-navy-800 border-edge-default text-ink-secondary hover:text-ink-primary'}`}>
            <FileText size={12} /> {tr(catFilter)}
            <ChevronDown size={11} className={`transition-transform ${catOpen ? 'rotate-180' : ''}`} />
          </button>
          {catOpen && (
            <div className="absolute left-0 top-full mt-1 bg-navy-750 border border-edge-default rounded-xl shadow-2xl z-30 overflow-hidden w-40">
              {(['All', ...CATEGORIES] as const).map(c => (
                <button key={c} onClick={() => { setCatFilter(c as ContractCategory | 'All'); setCatOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-navy-700 ${catFilter === c ? 'text-blue-400' : 'text-ink-secondary'}`}>
                  {tr(c)}
                </button>
              ))}
            </div>
          )}
        </div>
        {(statusFilter !== 'All' || catFilter !== 'All') && (
          <button onClick={() => { setStatusFilter('All'); setCatFilter('All') }}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors px-2 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5">
            <X size={11} />  {tr("Clear")} </button>
        )}
      </div>

      {/* Two-panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* List */}
        <div className={`lg:col-span-3 bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden ${mobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <FileText size={24} className="text-ink-muted opacity-30" />
              <p className="text-sm text-ink-muted">{tr("No contracts match your filters")}</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge-subtle bg-navy-900/40">
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">{tr("Contract")}</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted hidden sm:table-cell">{tr("Vendor")}</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted hidden md:table-cell">{tr("End Date")}</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">{tr("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-subtle">
                {filtered.map(c => {
                  const days = daysUntil(c.endDate)
                  const sc = STATUS_CONFIG[c.status]
                  return (
                    <tr key={c.id}
                      onClick={() => { setSelectedId(c.id); setMobileDetailOpen(true) }}
                      className={`cursor-pointer hover:bg-navy-700/50 transition-colors ${activeSelectedId === c.id ? 'bg-navy-700/70 border-l-2 border-l-blue-500' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {c.starred && <Star size={10} className="text-yellow-400 fill-yellow-400 mt-0.5 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-ink-primary font-medium truncate max-w-[160px]">{c.name}</p>
                            <span className={`text-[9px] font-mono px-1 py-0.5 rounded border font-semibold ${CAT_COLORS[c.category]}`}>{tr(c.category)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary hidden sm:table-cell">{c.vendor}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="font-mono text-ink-secondary">{c.endDate}</p>
                        {Math.abs(days) < 365 && (
                          <p className={`text-[10px] font-mono ${days < 0 ? 'text-red-400' : days <= 60 ? 'text-orange-400' : 'text-ink-muted'}`}>
                            {days < 0 ? tr('{{count}}d ago', { count: Math.abs(days) }) : tr('{{count}}d left', { count: days })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono border ${sc.cls}`}>
                          {sc.icon} {tr(sc.label)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail */}
        <div className={`lg:col-span-2 ${mobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
          {mobileDetailOpen && (
            <button onClick={() => setMobileDetailOpen(false)}
              className="lg:hidden flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mb-3 transition-colors">
              <ArrowLeft size={14} />  {tr("Back to contracts")} </button>
          )}
          {selected ? (
            <div className="sticky top-4">
              <ContractDetail
                contract={selected}
                onEdit={() => setModal({ open: true, initial: selected })}
                onDelete={() => handleDelete(selected.id)}
                onToggleStar={() => toggleStarContract(selected.id)}
              />
            </div>
          ) : (
            <div className="bg-navy-800 border border-edge-subtle rounded-xl flex items-center justify-center h-48">
              <div className="text-center">
                <FileText size={22} className="text-ink-muted mx-auto mb-2 opacity-30" />
                <p className="text-xs text-ink-muted">{tr("Select a contract to view details")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {catOpen && <div className="fixed inset-0 z-20" onClick={() => setCatOpen(false)} />}
      {modal.open && <ContractModal initial={modal.initial} onClose={() => setModal({ open: false })} onSave={handleSave} />}
    </div>
  )
}