import { tr, useLocale } from '../i18n'
import { useState, useEffect, useRef } from 'react'
import { X, Star, Loader2 } from 'lucide-react'
import type { Asset, AssetType, AssetStatus } from '../api/types'
import { ASSET_TYPES, ASSET_STATUSES } from '../lib/assetOptions'

interface AssetFormProps {
  initial?: Asset
  onSave: (data: Omit<Asset, 'id' | 'updatedAt'>) => Promise<void>
  onClose: () => void
}

export default function AssetForm({ initial, onSave, onClose }: AssetFormProps) {
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
    if (t && t.length <= 100 && form.tags.length < 100 && !form.tags.includes(t)) set('tags', [...form.tags, t])
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
        role="dialog" aria-modal="true" aria-labelledby="asset-form-title"
        className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 id="asset-form-title" className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit Asset") : tr("Add New Asset")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{initial ? tr("Editing {{value1}}", { value1: initial.name }) : tr("Register a new infrastructure asset")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <Field label={tr("Asset Name *")} error={errors.name}>
              <input ref={firstRef} value={form.name} onChange={e => set('name', e.target.value)}
                placeholder={tr("e.g. SRV-PROD-03")} maxLength={200} className={input(errors.name)} disabled={submitting} />
            </Field>
            <Field label={tr("IP Address")} error={errors.ip}>
              <input value={form.ip} onChange={e => set('ip', e.target.value)}
                placeholder={tr("e.g. 10.0.1.12")} maxLength={45} className={input(errors.ip)} disabled={submitting} />
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
                placeholder={tr("e.g. DC-RACK-A1")} maxLength={500} className={input(errors.location)} disabled={submitting} />
            </Field>
            <Field label={tr("Owner *")} error={errors.owner}>
              <input value={form.owner} onChange={e => set('owner', e.target.value)}
                placeholder={tr("e.g. John Doe")} maxLength={200} className={input(errors.owner)} disabled={submitting} />
            </Field>
          </div>

          <Field label={tr("Serial Number")}>
            <input value={form.serial} onChange={e => set('serial', e.target.value)}
              placeholder={tr("e.g. BCZK1234567")} maxLength={200} className={input() + ' font-mono'} disabled={submitting} />
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
                placeholder={tr("Add tag and press Enter")} maxLength={100} className={input() + ' flex-1'} disabled={submitting} />
              <button type="button" onClick={addTag} disabled={submitting} className="px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-secondary text-xs hover:bg-navy-600 transition-colors disabled:opacity-40">{tr("Add")}</button>
            </div>
          </Field>

          <Field label={tr("Notes")}>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder={tr("Any relevant notes…")} rows={3}
              maxLength={100000} className={input() + ' resize-none leading-relaxed'} disabled={submitting} />
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

