import { tr, useLocale } from '../i18n'
import { useState, useEffect, useRef } from 'react'
import {
  Plus, Search, Filter, ChevronUp, ChevronDown, ChevronsUpDown,
  Edit2, Trash2, Eye, Server, Monitor, Router, HardDrive, Wifi,
  ChevronLeft, ChevronRight, Star, X, Printer, Phone, Loader2, Camera, Video,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Asset, AssetType, AssetStatus } from '../api/types'
import type { View } from '../App'

const TYPE_ICONS: Record<AssetType, React.ReactNode> = {
  Server: <Server size={12} />, Workstation: <Monitor size={12} />,
  Network: <Router size={12} />, Storage: <HardDrive size={12} />,
  AP: <Wifi size={12} />, Printer: <Printer size={12} />, Phone: <Phone size={12} />,
  Camera: <Camera size={12} />, Recorder: <Video size={12} />,
}

const STATUS_STYLES: Record<AssetStatus, string> = {
  online: 'bg-green-500/15 text-green-400 border-green-500/30',
  offline: 'bg-red-500/15 text-red-400 border-red-500/30',
  maintenance: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  unknown: 'bg-navy-500/20 text-ink-muted border-edge-default',
}

const ASSET_TYPES: AssetType[] = ['Server', 'Workstation', 'Network', 'Storage', 'AP', 'Printer', 'Phone', 'Camera', 'Recorder']
const ASSET_STATUSES: AssetStatus[] = ['online', 'offline', 'maintenance', 'unknown']

function StatusBadge({ status }: { status: AssetStatus }) {
  useLocale()
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${STATUS_STYLES[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === 'online' ? 'bg-green-400 shadow-[0_0_4px_rgba(74,222,128,0.8)] animate-pulse' : status === 'offline' ? 'bg-red-400' : status === 'maintenance' ? 'bg-orange-400' : 'bg-navy-400'}`} />
      {tr(status)}
    </span>
  )
}

// ─── Asset Form Modal ─────────────────────────────────────────────────────────

interface AssetFormProps {
  initial?: Asset
  onSave: (data: Omit<Asset, 'id' | 'updated'>) => Promise<void>
  onClose: () => void
}

function AssetForm({ initial, onSave, onClose }: AssetFormProps) {
  useLocale()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: initial?.type ?? 'Server' as AssetType,
    status: initial?.status ?? 'online' as AssetStatus,
    location: initial?.location ?? '',
    owner: initial?.owner ?? '',
    ip: initial?.ip ?? '',
    serial: initial?.serial ?? '',
    notes: initial?.notes ?? '',
    tags: initial?.tags ?? [],
    starred: initial?.starred ?? false,
  })
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstRef.current?.focus() }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, submitting])

  const set = (key: string, value: unknown) => {
    setForm(prev => ({
      ...prev,
      [key]: value
    }))

    setErrors(prev => ({
      ...prev,
      [key]: ''
    }))
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
    setTagInput('')
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = tr("Required")
    if (!form.location.trim()) e.location = tr("Required")
    if (!form.owner.trim()) e.owner = tr("Required")
    if (form.ip && !/^[\d.]+$/.test(form.ip)) e.ip = tr("Invalid IP")
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // Stays open on failure — the error toast (fired by AppProvider's `guarded`
  // wrapper) tells the user what happened, and their input isn't lost.
  const handleSubmit = async () => {
    if (!validate() || submitting) return
    setSubmitting(true)
    try {
      await onSave(form)
    } catch {
      // error toast already shown by context; keep modal open so nothing is lost
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit Asset") : tr("Add New Asset")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{initial ? tr("Editing {{value1}}", { value1: initial.name }) : tr("Register a new infrastructure asset")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr("Asset Name *")} error={errors.name}>
              <input ref={firstRef} value={form.name} onChange={e => set('name', e.target.value)}
                placeholder={tr("e.g. SRV-PROD-03")} className={input(errors.name)} disabled={submitting} />
            </Field>
            <Field label={tr("IP Address")} error={errors.ip}>
              <input value={form.ip} onChange={e => set('ip', e.target.value)}
                placeholder={tr("e.g. 10.0.1.12")} className={input(errors.ip)} disabled={submitting} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={tr("Type")}>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={input()} disabled={submitting}>
                {ASSET_TYPES.map(t => <option key={t} value={t}>{tr(t)}</option>)}
              </select>
            </Field>
            <Field label={tr("Status")}>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={input()} disabled={submitting}>
                {ASSET_STATUSES.map(s => <option key={s} value={s}>{tr(s)}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label={tr("Location *")} error={errors.location}>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder={tr("e.g. DC-RACK-A1")} className={input(errors.location)} disabled={submitting} />
            </Field>
            <Field label={tr("Owner *")} error={errors.owner}>
              <input value={form.owner} onChange={e => set('owner', e.target.value)}
                placeholder={tr("e.g. John Doe")} className={input(errors.owner)} disabled={submitting} />
            </Field>
          </div>

          <Field label={tr("Serial Number")}>
            <input value={form.serial} onChange={e => set('serial', e.target.value)}
              placeholder={tr("e.g. BCZK1234567")} className={input() + ' font-mono'} disabled={submitting} />
          </Field>

          <Field label={tr("Tags")}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-700 border border-edge-subtle text-[11px] text-ink-secondary font-mono">
                  {t}
                  <button type="button" onClick={() => set('tags', form.tags.filter(x => x !== t))} className="text-ink-muted hover:text-red-400 transition-colors ml-0.5" disabled={submitting}>×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder={tr("Add tag and press Enter")} className={input() + ' flex-1'} disabled={submitting} />
              <button type="button" onClick={addTag} disabled={submitting} className="px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-secondary text-xs hover:bg-navy-600 transition-colors disabled:opacity-40">{tr("Add")}</button>
            </div>
          </Field>

          <Field label={tr("Notes")}>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder={tr("Any relevant notes…")} rows={3}
              className={input() + ' resize-none leading-relaxed'} disabled={submitting} />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/50">
          <label className="flex items-center gap-2 cursor-pointer">
            <div onClick={() => !submitting && set('starred', !form.starred)} className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${form.starred ? 'bg-yellow-500/20 border-yellow-500/50' : 'border-edge-strong'}`}>
              {form.starred && <Star size={10} className="text-yellow-400 fill-yellow-400" />}
            </div>
            <span className="text-xs text-ink-secondary">{tr("Add to favorites")}</span>
          </label>
          <div className="flex gap-2">
            <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-4 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs transition-colors border border-edge-default disabled:opacity-40">{tr("Cancel")}</button>
            <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-xs font-medium transition-all disabled:opacity-60 flex items-center gap-1.5" style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.35)' }}>
              {submitting && <Loader2 size={12} className="animate-spin" />}
              {submitting ? tr("Saving…") : initial ? tr("Save Changes") : tr("Create Asset")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Delete confirm dialog ─────────────────────────────────────────────────────

function DeleteConfirm({ name, onConfirm, onCancel }: { name: string; onConfirm: () => Promise<void>; onCancel: () => void }) {
  useLocale()
  const [deleting, setDeleting] = useState(false)

  const handleConfirm = async () => {
    if (deleting) return
    setDeleting(true)
    try {
      await onConfirm()
    } catch {
      setDeleting(false) // stay open so the user can retry or cancel
    }
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (deleting) return; if (e.key === 'Escape') onCancel(); if (e.key === 'Enter') handleConfirm() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onConfirm, onCancel, deleting])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && onCancel()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ animation: 'modalIn 0.15s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
          <Trash2 size={18} className="text-red-400" />
        </div>
        <h3 className="text-sm font-semibold text-ink-primary text-center mb-1">{tr("Delete Asset")}</h3>
        <p className="text-xs text-ink-muted text-center mb-5">{tr("Are you sure you want to delete")} <span className="text-ink-primary font-mono">{name}</span>{tr("? This cannot be undone.")}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={deleting} className="flex-1 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs transition-colors border border-edge-default disabled:opacity-40">{tr("Cancel")}</button>
          <button onClick={handleConfirm} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            {deleting && <Loader2 size={12} className="animate-spin" />}
            {deleting ? tr("Deleting…") : tr("Delete")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  useLocale()
  return (
    <div>
      <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
    </div>
  )
}

function input(error?: string) {
  return `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${error ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`
}

type SortKey = keyof Asset
type SortDir = 'asc' | 'desc'

interface Props { navigate: (v: View, id?: string) => void }

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function AssetInventory({ navigate }: Props) {
  useLocale()
  const { assets, isLoading, addAsset, updateAsset, deleteAsset, toggleStarAsset, canWrite } = useApp()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [addOpen, setAddOpen] = useState(false)
  const [editAsset, setEditAsset] = useState<Asset | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const PER_PAGE = 8

  const filtered = assets
    .filter(a =>
      (typeFilter === 'All' || a.type === typeFilter) &&
      (statusFilter === 'All' || a.status === statusFilter) &&
      (a.name.toLowerCase().includes(query.toLowerCase()) || a.ip.includes(query) || a.location.toLowerCase().includes(query.toLowerCase()) || a.owner.toLowerCase().includes(query.toLowerCase()))
    )
    .sort((a, b) => {
      const av = String(a[sortKey]); const bv = String(b[sortKey])
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const safePage = Math.min(page, pages)
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  const sort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortKey(key)
    setSortDir('asc')
  }
  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronsUpDown size={11} className="opacity-30" />
  const toggleSelect = (id: string) => {
    if (!canWrite('assets', id)) return
    setSelected(prev => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })
  }
  const selectable = paged.filter(a => canWrite('assets', a.id))
  const allSelected = selectable.length > 0 && selectable.every(a => selected.has(a.id))

  const onlineCount = assets.filter(a => a.status === 'online').length

  const handleBulkDelete = async () => {
    setBulkDeleting(true)
    // Settle all deletes even if some fail — a failed one keeps its row,
    // rather than one rejection aborting the whole batch silently.
    await Promise.allSettled(Array.from(selected).filter(id => canWrite('assets', id)).map(id => deleteAsset(id)))
    setSelected(new Set())
    setBulkDeleting(false)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="p-6">
      <style>{"@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(4px); } to { opacity:1; transform:scale(1) translateY(0); } }"}</style>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{tr("Asset Inventory")}</h1>
          <p className="text-xs text-ink-muted mt-0.5 font-mono">{assets.length}  {tr("assets ·")} <span className="text-green-400">{onlineCount}  {tr("online")}</span> · {assets.filter(a => a.status === 'offline').length}  {tr("offline")}</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          disabled={!canWrite('assets')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}
        >
          <Plus size={15} />  {tr("Add Asset")} </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input value={query} onChange={e => { setQuery(e.target.value); setPage(1) }}
            placeholder={tr("Search name, IP, location, owner…")}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:border-blue-500 focus:outline-none transition-colors" />
          {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"><X size={12} /></button>}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={13} className="text-ink-muted" />
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
            className="px-2.5 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-secondary text-xs focus:outline-none focus:border-blue-500 cursor-pointer">
            <option value="All">{tr("All")}</option>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{tr(t)}</option>)}
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            className="px-2.5 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-secondary text-xs focus:outline-none focus:border-blue-500 cursor-pointer">
            <option value="All">{tr("All")}</option>
            {ASSET_STATUSES.map(s => <option key={s} value={s}>{tr(s)}</option>)}
          </select>
        </div>

        {selected.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-ink-muted font-mono">{selected.size}  {tr("selected")}</span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting || Array.from(selected).some(id => !canWrite('assets', id))}
              className="px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 border border-red-500/20 transition-colors flex items-center gap-1.5 disabled:opacity-50">
              {bulkDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}  {tr("Delete selected")} </button>
          </div>
        )}
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-2">
        {paged.length === 0 ? (
          <div className="py-12 text-center">
            <Server size={28} className="text-ink-muted mx-auto mb-3 opacity-40" />
            <p className="text-sm text-ink-muted">{tr("No assets match your filter")}</p>
            <button onClick={() => { setQuery(''); setTypeFilter('All'); setStatusFilter('All') }} className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors">{tr("Clear filters")}</button>
          </div>
        ) : paged.map(asset => (
          <div key={asset.id} className="bg-navy-800 border border-edge-subtle rounded-xl p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => navigate('asset-detail', asset.id)} className="font-mono text-ink-link font-medium text-sm">{asset.name}</button>
                <StatusBadge status={asset.status} />
              </div>
              <p className="text-[10px] font-mono text-ink-muted">{asset.ip} · {asset.location}</p>
              <p className="text-[10px] text-ink-muted mt-0.5">{tr(asset.type)} · {asset.owner}</p>
            </div>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <button disabled={!canWrite('assets', asset.id)} onClick={() => toggleStarAsset(asset.id)}
                className={`p-2 rounded-md transition-colors ${asset.starred ? 'text-yellow-400' : 'text-ink-muted'}`}>
                <Star size={14} fill={asset.starred ? 'currentColor' : 'none'} />
              </button>
              <button disabled={!canWrite('assets', asset.id)} onClick={() => setEditAsset(asset)} className="p-2 rounded-md text-ink-muted hover:text-ink-primary transition-colors disabled:opacity-40"><Edit2 size={14} /></button>
              <button disabled={!canWrite('assets', asset.id)} onClick={() => setDeleteTarget(asset)} className="p-2 rounded-md text-ink-muted hover:text-red-400 transition-colors disabled:opacity-40"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
        {/* Mobile pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] font-mono text-ink-muted">
              {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, filtered.length)}  {tr("of")} {filtered.length}
            </span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary disabled:opacity-30"><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={safePage >= pages} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary disabled:opacity-30"><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-edge-subtle bg-navy-900/50">
                <th className="pl-4 pr-2 py-3 w-8">
                  <div onClick={() => allSelected ? setSelected(new Set()) : setSelected(new Set(paged.filter(a => canWrite('assets', a.id)).map(a => a.id)))}
                    className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${allSelected ? 'bg-blue-500 border-blue-500' : 'border-edge-strong hover:border-blue-500/50'}`}>
                    {allSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                </th>
                {[
                  { k: 'name' as SortKey, label: 'Name' },
                  { k: 'type' as SortKey, label: 'Type' },
                  { k: 'status' as SortKey, label: 'Status' },
                  { k: 'location' as SortKey, label: 'Location' },
                  { k: 'owner' as SortKey, label: 'Owner' },
                  { k: 'updated' as SortKey, label: 'Updated' },
                ].map(col => (
                  <th key={col.k} onClick={() => sort(col.k)}
                    className="px-3 py-3 text-left font-medium text-ink-muted cursor-pointer hover:text-ink-secondary transition-colors select-none whitespace-nowrap">
                    <span className="flex items-center gap-1">{tr(col.label)} <SortIcon k={col.k} /></span>
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-medium text-ink-muted w-28">{tr("Actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="py-16 text-center">
                  <Server size={28} className="text-ink-muted mx-auto mb-3 opacity-40" />
                  <p className="text-sm text-ink-muted">{tr("No assets match your filter")}</p>
                  <button onClick={() => { setQuery(''); setTypeFilter('All'); setStatusFilter('All') }} className="text-xs text-blue-400 hover:text-blue-300 mt-2 transition-colors">{tr("Clear filters")}</button>
                </td></tr>
              ) : paged.map(asset => (
                <tr key={asset.id} className={`group hover:bg-navy-700/50 transition-colors ${selected.has(asset.id) ? 'bg-blue-500/5' : ''}`}>
                  <td className="pl-4 pr-2 py-3">
                    <div onClick={() => toggleSelect(asset.id)}
                      className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer transition-all ${selected.has(asset.id) ? 'bg-blue-500 border-blue-500' : 'border-edge-strong group-hover:border-blue-500/40'}`}>
                      {selected.has(asset.id) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => navigate('asset-detail', asset.id)} className="font-mono text-ink-link hover:text-blue-300 font-medium transition-colors">{asset.name}</button>
                    <p className="text-ink-muted font-mono mt-0.5 text-[10px]">{asset.ip}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className="flex items-center gap-1.5 text-ink-secondary">
                      <span className="text-ink-muted">{TYPE_ICONS[asset.type]}</span>{tr(asset.type)}
                    </span>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={asset.status} /></td>
                  <td className="px-3 py-3 text-ink-secondary font-mono">{asset.location}</td>
                  <td className="px-3 py-3 text-ink-secondary">{asset.owner}</td>
                  <td className="px-3 py-3 text-ink-muted font-mono">{asset.updated}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <button disabled={!canWrite('assets', asset.id)} onClick={() => toggleStarAsset(asset.id)} title={asset.starred ? tr("Unstar") : tr("Star")}
                        className={`p-1.5 rounded-md transition-colors ${asset.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-yellow-400'} hover:bg-navy-600`}>
                        <Star size={13} fill={asset.starred ? 'currentColor' : 'none'} />
                      </button>
                      <button onClick={() => navigate('asset-detail', asset.id)} title={tr("View")} className="p-1.5 rounded-md hover:bg-navy-600 text-ink-muted hover:text-blue-400 transition-colors"><Eye size={13} /></button>
                      <button disabled={!canWrite('assets', asset.id)} onClick={() => setEditAsset(asset)} title={tr("Edit")} className="p-1.5 rounded-md hover:bg-navy-600 text-ink-muted hover:text-ink-primary transition-colors disabled:opacity-40"><Edit2 size={13} /></button>
                      <button disabled={!canWrite('assets', asset.id)} onClick={() => setDeleteTarget(asset)} title={tr("Delete")} className="p-1.5 rounded-md hover:bg-navy-600 text-ink-muted hover:text-red-400 transition-colors disabled:opacity-40"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-edge-subtle">
          <span className="text-[11px] font-mono text-ink-muted">
            {filtered.length === 0 ? tr("No results") : tr("{{value1}}–{{value2}} of {{value3}}", { value1: (safePage - 1) * PER_PAGE + 1, value2: Math.min(safePage * PER_PAGE, filtered.length), value3: filtered.length })}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} className={`w-7 h-7 rounded-md text-[11px] font-mono transition-colors ${p === safePage ? 'bg-blue-500 text-white' : 'text-ink-muted hover:text-ink-primary hover:bg-navy-700'}`}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={safePage >= pages} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 disabled:opacity-30 transition-colors"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {addOpen && (
        <AssetForm
          onSave={async data => { await addAsset(data); setAddOpen(false) }}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editAsset && (
        <AssetForm
          initial={editAsset}
          onSave={async data => { await updateAsset({ ...editAsset, ...data }); setEditAsset(null) }}
          onClose={() => setEditAsset(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={async () => { await deleteAsset(deleteTarget.id); setDeleteTarget(null) }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
