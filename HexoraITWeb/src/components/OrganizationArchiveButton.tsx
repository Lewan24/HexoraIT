import { useState } from 'react'
import { Archive, ArchiveRestore, Loader2, X } from 'lucide-react'
import { tr, useLocale } from '../i18n'
import { useApp } from '../context/useApp'
import { canManageOrganization } from '../lib/organizationLifecycle'
import type { OrgMembership } from '../api/types'

export default function OrganizationArchiveButton({ org, onChanged }: { org: OrgMembership; onChanged?: () => void }) {
  useLocale()
  const { setOrgArchived } = useApp()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!canManageOrganization(org)) return null
  const update = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    try { await setOrgArchived(org.id, !org.isArchived); setConfirming(false); onChanged?.() }
    catch (error) { setError(error instanceof Error ? error.message : tr('Operation failed')) }
    finally { setBusy(false) }
  }
  return <>
    <button type="button" disabled={busy} onClick={() => org.isArchived ? void update() : setConfirming(true)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-ink-muted hover:bg-navy-700 hover:text-ink-primary disabled:opacity-50">
      {busy ? <Loader2 size={13} className="animate-spin" /> : org.isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}{tr(org.isArchived ? 'Reactivate' : 'Archive')}
    </button>
    {error && !confirming && <p role="alert" className="text-xs text-red-400">{error}</p>}
    {confirming && <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => { if (!busy) setConfirming(false) }} onKeyDown={event => { if (event.key === 'Escape' && !busy) setConfirming(false) }}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={`archive-title-${org.id}`} aria-describedby={`archive-description-${org.id}`} onClick={event => event.stopPropagation()} className="w-full max-w-md rounded-2xl border border-edge-default bg-navy-800 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between"><Archive size={24} className="text-amber-400" /><button type="button" autoFocus disabled={busy} onClick={() => setConfirming(false)} aria-label={tr('Close')} className="p-2 text-ink-muted"><X size={16} /></button></div>
        <h2 id={`archive-title-${org.id}`} className="text-lg font-semibold text-ink-primary">{tr('Archive organization?')}</h2>
        <p className="mt-2 break-words text-sm font-medium text-ink-primary">{org.name}</p>
        <p id={`archive-description-${org.id}`} className="mt-3 text-sm leading-relaxed text-ink-muted">{tr('This organization will leave the active list for all members. Its documentation and module settings will be kept. An owner or administrator can reactivate it from the archive.')}</p>
        {error && <p role="alert" className="mt-3 text-xs text-red-400">{error}</p>}
        <div className="mt-6 flex justify-end gap-2"><button type="button" disabled={busy} onClick={() => setConfirming(false)} className="rounded-lg border border-edge-default px-3 py-2 text-sm text-ink-secondary">{tr('Cancel')}</button><button type="button" disabled={busy} onClick={() => void update()} className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />}{tr('Move to archive')}</button></div>
      </div>
    </div>}
  </>
}
