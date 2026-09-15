import { tr, useLocale, locale } from '../i18n'
import { useState } from 'react'
import {
  Plus, Search, X, Edit2, Trash2, Star,
  AlertTriangle, CheckCircle2, Clock, Calendar, DollarSign,
  Key, Building2, Package, ChevronDown, Loader2,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { License, LicenseCategory, LicenseType, LicenseStatus } from '../api/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const CATEGORIES: LicenseCategory[] = ['Software', 'OS', 'Antivirus', 'Domain', 'Cloud', 'Security', 'Office', 'Virtualization', 'Backup', 'Monitoring', 'Other']

const LICENSE_TYPES: LicenseType[] = ['Subscription', 'Perpetual', 'OEM', 'Volume', 'Trial']

const STATUS_CONFIG: Record<LicenseStatus, { cls: string; icon: React.ReactNode; label: string }> = {
  active:   { cls: 'bg-green-500/15 text-green-400 border-green-500/30',   icon: <CheckCircle2 size={11} />, label: 'Active' },
  expiring: { cls: 'bg-orange-500/15 text-orange-400 border-orange-500/30', icon: <AlertTriangle size={11} />, label: 'Expiring' },
  expired:  { cls: 'bg-red-500/15 text-red-400 border-red-500/30',         icon: <AlertTriangle size={11} />, label: 'Expired' },
  inactive: { cls: 'bg-navy-500/20 text-ink-muted border-edge-default',    icon: <Clock size={11} />,        label: 'Inactive' },
}

const CAT_COLORS: Record<LicenseCategory, { bg: string; text: string }> = {
  Software:      { bg: 'bg-blue-500/12 border-blue-500/25',    text: 'text-blue-400' },
  OS:            { bg: 'bg-purple-500/12 border-purple-500/25', text: 'text-purple-400' },
  Antivirus:     { bg: 'bg-red-500/12 border-red-500/25',       text: 'text-red-400' },
  Domain:        { bg: 'bg-cyan-500/12 border-cyan-500/25',     text: 'text-cyan-400' },
  Cloud:         { bg: 'bg-sky-500/12 border-sky-500/25',       text: 'text-sky-400' },
  Security:      { bg: 'bg-orange-500/12 border-orange-500/25', text: 'text-orange-400' },
  Office:        { bg: 'bg-green-500/12 border-green-500/25',   text: 'text-green-400' },
  Virtualization:{ bg: 'bg-yellow-500/12 border-yellow-500/25', text: 'text-yellow-400' },
  Backup:        { bg: 'bg-teal-500/12 border-teal-500/25',     text: 'text-teal-400' },
  Monitoring:    { bg: 'bg-indigo-500/12 border-indigo-500/25', text: 'text-indigo-400' },
  Other:         { bg: 'bg-navy-500/20 border-edge-default',    text: 'text-ink-muted' },
}

function getLicenseCategoryFromString(category: string){
  let licenseCategory: LicenseCategory = "Other"

  switch (category.toUpperCase()){
    case "SOFTWARE":
      licenseCategory = "Software"
      break;

    case "OS":
      licenseCategory = "OS"
      break;

    case "ANTIVIRUS":
      licenseCategory = "Antivirus"
      break;

    case "DOMAIN":
      licenseCategory = "Domain"
      break;

    case "CLOUD":
      licenseCategory = "Cloud"
      break;

    case "SECURITY":
      licenseCategory = "Security"
      break;

    case "OFFICE":
      licenseCategory = "Office"
      break;

    case "VIRTUALIZATION":
      licenseCategory = "Virtualization"
      break;

    case "BACKUP":
      licenseCategory = "Backup"
      break;

    case "MONITORING":
      licenseCategory = "Monitoring"
      break;
  }

  return licenseCategory
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

function inp(err?: string) {
  return `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`
}

// ─── License Modal ────────────────────────────────────────────────────────────

function LicenseModal({ initial, onClose, onSave }: {
  initial?: License
  onClose: () => void
  onSave: (l: Omit<License, 'id' | 'status'>) => Promise<void>
}) {
  useLocale()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    vendor: initial?.vendor ?? '',
    category: initial?.category ?? 'Software' as LicenseCategory,
    type: initial?.type ?? 'Subscription' as LicenseType,
    seats: initial?.seats != null ? String(initial.seats) : '1',
    seatsUsed: initial?.seatsUsed != null ? String(initial.seatsUsed) : '0',
    purchaseDate: initial?.purchaseDate ?? '',
    expiryDate: initial?.expiryDate ?? '',
    cost: initial?.cost != null ? String(initial.cost) : '',
    currency: initial?.currency ?? 'USD',
    licenseKey: initial?.licenseKey ?? '',
    notes: initial?.notes ?? '',
    starred: initial?.starred ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (k: string, v: string | boolean) => { setForm(f => ({ ...f, [k]: v })); if (typeof v === 'string') setErrors(e => ({ ...e, [k]: '' })) }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = tr("Required")
    if (!form.vendor.trim()) e.vendor = tr("Required")
    if (!form.expiryDate) e.expiryDate = tr("Required")
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({
        name: form.name.trim(),
        vendor: form.vendor.trim(),
        category: form.category,
        type: form.type,
        seats: Number(form.seats) || 1,
        seatsUsed: Number(form.seatsUsed) || 0,
        purchaseDate: form.purchaseDate,
        expiryDate: form.expiryDate,
        cost: Number(form.cost) || 0,
        currency: form.currency,
        licenseKey: form.licenseKey.trim(),
        notes: form.notes.trim(),
        starred: form.starred,
      })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit License") : tr("Add License")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{tr("Software, antivirus, domain, cloud subscription")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("License Name *")}</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={tr("e.g. Microsoft 365 Business")} className={inp(errors.name)} autoFocus disabled={submitting} />
              {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Vendor *")}</label>
              <input value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder={tr("Microsoft")} className={inp(errors.vendor)} disabled={submitting} />
              {errors.vendor && <p className="text-[10px] text-red-400 mt-1">{errors.vendor}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Category")}</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className={inp()} disabled={submitting}>
                {CATEGORIES.map(c => <option key={c} value={c}>{tr(c)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("License Type")}</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inp()} disabled={submitting}>
                {LICENSE_TYPES.map(t => <option key={t} value={t}>{tr(t)}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Seats")}</label>
                <input value={form.seats} onChange={e => set('seats', e.target.value)} placeholder={"1"} className={inp() + ' font-mono'} disabled={submitting} />
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Used")}</label>
                <input value={form.seatsUsed} onChange={e => set('seatsUsed', e.target.value)} placeholder={"0"} className={inp() + ' font-mono'} disabled={submitting} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Purchase Date")}</label>
              <input type="date" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} className={inp()} disabled={submitting} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Expiry Date *")}</label>
              <input type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} className={inp(errors.expiryDate)} disabled={submitting} />
              {errors.expiryDate && <p className="text-[10px] text-red-400 mt-1">{errors.expiryDate}</p>}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Annual Cost")}</label>
              <input value={form.cost} onChange={e => set('cost', e.target.value)} placeholder={"0.00"} className={inp() + ' font-mono'} disabled={submitting} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Currency")}</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)} className={inp()} disabled={submitting}>
                {['USD', 'EUR', 'GBP', 'CZK', 'PLN', 'CHF'].map(c => <option key={c} value={c}>{tr(c)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("License Key / Serial")}</label>
            <input value={form.licenseKey} onChange={e => set('licenseKey', e.target.value)} placeholder={tr("XXXXX-XXXXX-XXXXX-XXXXX")} className={inp() + ' font-mono'} disabled={submitting} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Notes")}</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={inp() + ' resize-none'} disabled={submitting} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          <button onClick={() => !submitting && set('starred', !form.starred)} disabled={submitting}
            className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 ${form.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-ink-secondary'}`}>
            <Star size={13} className={form.starred ? 'fill-yellow-400' : ''} />  {tr("Starred")} </button>
          <div className="flex gap-2">
            <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
            <button onClick={submit} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5" style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? tr("Saving…") : initial ? tr("Save Changes") : tr("Add License")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── License Detail Panel ─────────────────────────────────────────────────────

function LicenseDetail({ license, onEdit, onDelete, onToggleStar }: {
  license: License
  onEdit: () => void
  onDelete: () => void
  onToggleStar: () => void
}) {
  useLocale()
  const sc = STATUS_CONFIG[license.status]
  const cc = CAT_COLORS[getLicenseCategoryFromString(license.category)]
  const days = daysUntil(license.expiryDate)
  const [keyVisible, setKeyVisible] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const seatPct = license.seats > 0 ? Math.min(100, (license.seatsUsed / license.seats) * 100) : 0

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } catch {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-edge-subtle">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-primary leading-snug">{license.name}</p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${sc.cls}`}>
                {sc.icon} {tr(sc.label)}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-semibold ${cc.bg} ${cc.text}`}>
                {tr(license.category)}
              </span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-navy-700 text-ink-muted border border-edge-subtle">{tr(license.type)}</span>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onToggleStar} disabled={deleting} className={`p-1.5 rounded-md transition-colors disabled:opacity-40 ${license.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-yellow-400'} hover:bg-navy-700`}>
              <Star size={13} className={license.starred ? 'fill-yellow-400' : ''} />
            </button>
            <button onClick={onEdit} disabled={deleting} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-ink-primary transition-colors disabled:opacity-40"><Edit2 size={13} /></button>
            <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-red-400 transition-colors disabled:opacity-40">
              {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* Seat bar */}
      {license.seats > 0 && (
        <div className="px-5 py-3 border-b border-edge-subtle">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">{tr("Seat Usage")}</span>
            <span className="text-[11px] font-mono text-ink-secondary">{license.seatsUsed}/{license.seats}</span>
          </div>
          <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${seatPct > 90 ? 'bg-orange-500' : 'bg-blue-500'}`}
              style={{ width: `${seatPct}%` }} />
          </div>
          <p className="text-[10px] text-ink-muted mt-1">{tr('Available seats: {{count}}', { count: license.seats - license.seatsUsed })}</p>
        </div>
      )}

      {/* Expiry countdown */}
      {Math.abs(days) < 365 && (
        <div className={`px-5 py-3 border-b border-edge-subtle ${days < 0 ? 'bg-red-500/5' : days <= 60 ? 'bg-orange-500/5' : ''}`}>
          <p className={`text-xs font-semibold font-mono ${days < 0 ? 'text-red-400' : days <= 60 ? 'text-orange-400' : 'text-ink-secondary'}`}>
            {days < 0 ? tr('Expired {{count}} days ago', { count: Math.abs(days) }) : tr('Expires in {{count}} days', { count: days })}
          </p>
        </div>
      )}

      {/* Details */}
      <div className="px-5 py-4 space-y-2.5">
        {[
          { label: 'Vendor', value: license.vendor, icon: <Building2 size={11} /> },
          { label: 'Purchased', value: license.purchaseDate || '—', icon: <Calendar size={11} />, mono: true },
          { label: 'Expires', value: license.expiryDate, icon: <Calendar size={11} />, mono: true },
          { label: 'Cost', value: license.cost > 0 ? `${license.cost.toLocaleString(locale())} ${license.currency}` : '—', icon: <DollarSign size={11} />, mono: true },
        ].map((r, i) => (
          <div key={i} className="flex items-center gap-2 py-1.5 border-b border-edge-subtle last:border-0">
            <span className="text-ink-muted flex-shrink-0">{r.icon}</span>
            <span className="text-xs text-ink-muted w-20 flex-shrink-0">{tr(r.label)}</span>
            <span className={`text-xs text-ink-secondary ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
          </div>
        ))}

        {license.licenseKey && (
          <div className="flex items-center gap-2 py-1.5 border-b border-edge-subtle">
            <span className="text-ink-muted flex-shrink-0"><Key size={11} /></span>
            <span className="text-xs text-ink-muted w-20 flex-shrink-0">{tr("Key")}</span>
            <div className="flex-1 flex items-center gap-1.5 min-w-0">
              <span className={`text-xs font-mono text-ink-secondary truncate ${!keyVisible ? 'blur-sm select-none' : ''}`}>
                {license.licenseKey}
              </span>
              <button onClick={() => setKeyVisible(!keyVisible)}
                className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex-shrink-0 font-mono">
                {keyVisible ? tr("hide") : tr("show")}
              </button>
            </div>
          </div>
        )}

        {license.notes && (
          <div className="pt-1">
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-1.5">{tr("Notes")}</p>
            <p className="text-xs text-ink-secondary leading-relaxed">{license.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Licenses ─────────────────────────────────────────────────────────────────

export default function Licenses() {
  useLocale()
  const { licenses, isLoading, addLicense, updateLicense, deleteLicense, toggleStarLicense, currentOrg } = useApp()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<LicenseCategory | 'All'>('All')
  const [statusFilter, setStatusFilter] = useState<LicenseStatus | 'All'>('All')
  const [sortBy, setSortBy] = useState<'name' | 'expiry' | 'cost'>('expiry')
  const [selectedId, setSelectedId] = useState<string | null>(
    () => licenses[0]?.id ?? null
  )
  const [modal, setModal] = useState<{ open: boolean; initial?: License }>({ open: false })
  const [catOpen, setCatOpen] = useState(false)
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)

  const filtered = licenses
    .filter(l =>
      (category === 'All' || l.category === category) &&
      (statusFilter === 'All' || l.status === statusFilter) &&
      (l.name.toLowerCase().includes(query.toLowerCase()) ||
       l.vendor.toLowerCase().includes(query.toLowerCase()) ||
       l.licenseKey.toLowerCase().includes(query.toLowerCase()))
    )
    .sort((a, b) => {
      if (sortBy === 'expiry') return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      if (sortBy === 'cost') return b.cost - a.cost
      return a.name.localeCompare(b.name)
    })

  const effectiveSelectedId = selectedId ?? licenses[0]?.id
  const selected = licenses.find(l => l.id === effectiveSelectedId) ?? null

  // Note: this sums cost across licenses that may be tracked in different
  // currencies and labels the total "USD" — carried over from the original
  // mock data. Worth fixing (convert or group by currency) before relying on it.
  const totalCost = licenses.reduce((s, l) => s + l.cost, 0)
  const expiring = licenses.filter(l => l.status === 'expiring').length
  const expired = licenses.filter(l => l.status === 'expired').length
  const active = licenses.filter(l => l.status === 'active').length

  const handleSave = async (data: Omit<License, 'id' | 'status'>) => {
    if (modal.initial) {
      await updateLicense({ ...modal.initial, ...data })
    } else {
      await addLicense(data)
    }
    setModal({ open: false })
  }

  const handleDelete = async (id: string) => {
    await deleteLicense(id)
    if (effectiveSelectedId === id) setSelectedId(filtered.find(l => l.id !== id)?.id ?? null)
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
          <h1 className="text-xl font-semibold text-ink-primary">{tr("Licenses")}</h1>
          <p className="text-xs text-ink-muted mt-0.5 font-mono">
            {currentOrg ? tr("{{value1}} · ", { value1: currentOrg.name }) : ''}{licenses.length}  {tr("licenses ·")} {totalCost.toLocaleString(locale())}  {tr("tracked")} </p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} />  {tr("Add License")} </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Active', value: active, sub: 'valid licenses', color: 'text-green-400', status: 'active' as const },
          { label: 'Expiring', value: expiring, sub: 'within 60 days', color: 'text-orange-400', status: 'expiring' as const },
          { label: 'Expired', value: expired, sub: 'need renewal', color: 'text-red-400', status: 'expired' as const },
          { label: 'Annual Spend', value: `${(totalCost / 1000).toFixed(1)}k`, sub: 'total tracked', color: 'text-blue-400', status: null },
        ].map((card, i) => (
          <div key={i}
            onClick={() => card.status && setStatusFilter(statusFilter === card.status ? 'All' : card.status)}
            className={`bg-navy-800 border rounded-xl p-4 transition-all ${card.status ? 'cursor-pointer hover:-translate-y-0.5 hover:border-edge-default' : ''} ${statusFilter === card.status ? 'border-blue-500/40 bg-navy-750' : 'border-edge-subtle'}`}>
            <p className={`text-2xl font-semibold font-mono ${card.color}`}>{card.value}</p>
            <p className="text-xs font-medium text-ink-secondary mt-1">{tr(card.label)}</p>
            <p className="text-[10px] text-ink-muted">{tr(card.sub)}</p>
          </div>
        ))}
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={tr("Search name, vendor, key…")}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:border-blue-500 focus:outline-none transition-colors" />
        </div>

        <div className="relative">
          <button onClick={() => setCatOpen(!catOpen)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs transition-colors ${category !== 'All' ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-navy-800 border-edge-default text-ink-secondary hover:text-ink-primary'}`}>
            <Package size={12} /> {tr(category)}
            <ChevronDown size={11} className={`transition-transform ${catOpen ? 'rotate-180' : ''}`} />
          </button>
          {catOpen && (
            <div className="absolute left-0 top-full mt-1 bg-navy-750 border border-edge-default rounded-xl shadow-2xl z-30 overflow-hidden w-44">
              {['All', ...CATEGORIES].map(c => (
                <button key={c} onClick={() => { setCategory(c as LicenseCategory | 'All'); setCatOpen(false) }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-navy-700 ${category === c ? 'text-blue-400' : 'text-ink-secondary'}`}>
                  {tr(c)}
                  {category === c && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-xs text-ink-secondary focus:border-blue-500 focus:outline-none transition-colors">
          <option value="expiry">{tr("Sort: Expiry")}</option>
          <option value="cost">{tr("Sort: Cost")}</option>
          <option value="name">{tr("Sort: Name")}</option>
        </select>

        {(statusFilter !== 'All' || category !== 'All') && (
          <button onClick={() => { setStatusFilter('All'); setCategory('All') }}
            className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors px-2 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/5">
            <X size={11} />  {tr("Clear")} </button>
        )}
      </div>

      {/* Two-panel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className={`lg:col-span-3 bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden ${mobileDetailOpen ? 'hidden lg:block' : 'block'}`}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Package size={24} className="text-ink-muted opacity-30" />
              <p className="text-sm text-ink-muted">{tr("No licenses match your filters")}</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-edge-subtle bg-navy-900/40">
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">{tr("License")}</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted hidden sm:table-cell">{tr("Vendor")}</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted">{tr("Expires")}</th>
                  <th className="px-4 py-3 text-left font-medium text-ink-muted hidden md:table-cell">{tr("Status")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge-subtle">
                {filtered.map(lic => {
                  const days = daysUntil(lic.expiryDate)
                  const sc = STATUS_CONFIG[lic.status]
                  const cc = CAT_COLORS[getLicenseCategoryFromString(lic.category)]
                  return (
                    <tr key={lic.id}
                      onClick={() => { setSelectedId(lic.id); setMobileDetailOpen(true) }}
                      className={`cursor-pointer hover:bg-navy-700/50 transition-colors ${effectiveSelectedId === lic.id ? 'bg-navy-700/70 border-l-2 border-l-blue-500' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {lic.starred && <Star size={10} className="text-yellow-400 fill-yellow-400 mt-0.5 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className="text-ink-primary font-medium truncate max-w-[180px]">{lic.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`text-[9px] font-mono px-1 py-0.5 rounded border font-semibold ${cc.bg} ${cc.text}`}>{tr(lic.category)}</span>
                              <span className="text-[10px] text-ink-muted">{tr(lic.type)}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-secondary hidden sm:table-cell">{lic.vendor}</td>
                      <td className="px-4 py-3">
                        <p className="font-mono text-ink-secondary">{lic.expiryDate}</p>
                        {Math.abs(days) < 365 && (
                          <p className={`text-[10px] font-mono mt-0.5 ${days < 0 ? 'text-red-400' : days <= 60 ? 'text-orange-400' : 'text-ink-muted'}`}>
                            {days < 0 ? tr('{{count}}d ago', { count: Math.abs(days) }) : tr('{{count}}d left', { count: days })}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
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

        <div className={`lg:col-span-2 ${mobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
          {mobileDetailOpen && (
            <button
              onClick={() => setMobileDetailOpen(false)}
              className="lg:hidden flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mb-3 transition-colors">
               {tr("← Back to licenses")} </button>
          )}
          {selected ? (
            <div className="sticky top-0">
              <LicenseDetail
                license={selected}
                onEdit={() => setModal({ open: true, initial: selected })}
                onDelete={() => handleDelete(selected.id)}
                onToggleStar={() => toggleStarLicense(selected.id)}
              />
            </div>
          ) : (
            <div className="bg-navy-800 border border-edge-subtle rounded-xl flex items-center justify-center h-48">
              <div className="text-center">
                <Package size={22} className="text-ink-muted mx-auto mb-2 opacity-30" />
                <p className="text-xs text-ink-muted">{tr("Select a license to view details")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {catOpen && <div className="fixed inset-0 z-20" onClick={() => setCatOpen(false)} />}
      {modal.open && <LicenseModal initial={modal.initial} onClose={() => setModal({ open: false })} onSave={handleSave} />}
    </div>
  )
}
