import { useState } from 'react'
import { Building2, BriefcaseBusiness, Check, Loader2, X } from 'lucide-react'
import { tr, useLocale } from '../i18n'
import { useApp } from '../context/useApp'
import { defaultHiddenModules } from '../lib/organizationLifecycle'
import OrganizationModules from './OrganizationModules'
import type { OrgMembership } from '../api/types'

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d', '#374151']
const inputClass = 'w-full rounded-lg border border-edge-default bg-navy-700 px-3 py-2.5 text-sm text-ink-primary outline-none focus:border-blue-500'

export default function OrganizationCreateModal({ onClose, onCreated }: {
  onClose: () => void; onCreated?: (org: OrgMembership) => void
}) {
  useLocale()
  const { addOrg } = useApp()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0]!)
  const [temporary, setTemporary] = useState(false)
  const [hidden, setHidden] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selectType = (value: boolean) => { if (value === temporary) return; setTemporary(value); setHidden(defaultHiddenModules(value)) }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (busy || !name.trim()) return
    setBusy(true)
    setError('')
    try {
      const org = await addOrg({ name: name.trim(), description: description.trim(), color,
        initials: name.trim().split(/\s+/).map(word => word[0]).join('').toUpperCase().slice(0, 2),
        isTemporary: temporary, hiddenModules: hidden })
      onCreated?.(org)
      onClose()
    } catch (error) { setError(error instanceof Error ? error.message : tr('Failed to create organization')) }
    finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm" onClick={() => { if (!busy) onClose() }} onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose() }}>
    <form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="create-organization-title" onClick={event => event.stopPropagation()} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-edge-default bg-navy-800 shadow-2xl">
      <div className="flex items-center justify-between border-b border-edge-subtle px-5 py-4">
        <div><h2 id="create-organization-title" className="font-semibold text-ink-primary">{tr('New Organization')}</h2><p className="mt-1 text-xs text-ink-muted">{tr('Choose a workspace type and tailor its modules from the start.')}</p></div>
        <button type="button" disabled={busy} onClick={onClose} aria-label={tr('Close')} className="rounded p-2 text-ink-muted hover:bg-navy-700"><X size={18} /></button>
      </div>
      <fieldset disabled={busy} className="min-h-0 space-y-5 overflow-y-auto p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[false, true].map(value => <button type="button" key={String(value)} aria-pressed={temporary === value} onClick={() => selectType(value)} className={`rounded-xl border p-4 text-left transition-colors ${temporary === value ? 'border-blue-500/50 bg-blue-500/10' : 'border-edge-default hover:bg-navy-700'}`}>
            {value ? <BriefcaseBusiness size={20} className="mb-3 text-amber-400" /> : <Building2 size={20} className="mb-3 text-blue-400" />}
            <span className="block text-sm font-semibold text-ink-primary">{tr(value ? 'Temporary engagement' : 'Permanent organization')}</span>
            <span className="mt-1 block text-xs leading-relaxed text-ink-muted">{tr(value ? 'A focused workspace for a one-off assignment. Archive it when finished.' : 'Ongoing collaboration with all modules enabled by default.')}</span>
          </button>)}
        </div>
        <label className="block space-y-2 text-xs text-ink-secondary">{tr('Name *')}<input autoFocus required maxLength={200} value={name} onChange={event => setName(event.target.value)} className={inputClass} /></label>
        <label className="block space-y-2 text-xs text-ink-secondary">{tr('Description')}<textarea rows={2} maxLength={100000} value={description} onChange={event => setDescription(event.target.value)} className={inputClass} /></label>
        <fieldset><legend className="mb-2 text-xs text-ink-secondary">{tr('Color')}</legend><div className="flex flex-wrap gap-2">{COLORS.map(value => <button type="button" key={value} aria-label={`${tr('Color')} ${value}`} aria-pressed={color === value} onClick={() => setColor(value)} className="flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ backgroundColor: value, borderColor: color === value ? 'white' : 'transparent' }}>{color === value && <Check size={13} className="text-white" />}</button>)}</div></fieldset>
        <div className="border-t border-edge-subtle pt-4"><p className="mb-3 text-xs leading-relaxed text-ink-muted">{tr('Select the sections your team needs. You can change them later in Customize organization.')}</p><OrganizationModules hidden={hidden} onChange={setHidden} disabled={busy} /></div>
      </fieldset>
      <div className="border-t border-edge-subtle px-5 py-4">
        {error && <p role="alert" className="mb-3 text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-edge-default px-4 py-2 text-sm text-ink-secondary disabled:opacity-50">{tr('Cancel')}</button><button type="submit" disabled={busy || !name.trim()} className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-400 disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}{tr(busy ? 'Creating…' : 'Create')}</button></div>
      </div>
    </form>
  </div>
}
