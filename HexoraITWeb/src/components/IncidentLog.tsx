import { tr, useLocale } from '../i18n'
import { useState } from 'react'
import {
  Plus, X, Edit2, Trash2, Tag, AlertTriangle,
  CheckCircle2, Clock, Circle, Server, Loader2,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Incident, IncidentSeverity, IncidentStatus } from '../api/types'

const SEVERITIES: IncidentSeverity[] = ['critical', 'high', 'medium', 'low']
const STATUSES: IncidentStatus[] = ['open', 'investigating', 'resolved', 'closed']

const SEV_CONFIG: Record<IncidentSeverity, { dot: string; cls: string; label: string; pulse?: boolean }> = {
  critical: { dot: 'bg-red-500',    cls: 'text-red-400 bg-red-500/10 border-red-500/25',       label: 'Critical', pulse: true },
  high:     { dot: 'bg-orange-500', cls: 'text-orange-400 bg-orange-500/10 border-orange-500/25', label: 'High' },
  medium:   { dot: 'bg-yellow-400', cls: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/25', label: 'Medium' },
  low:      { dot: 'bg-blue-400',   cls: 'text-blue-400 bg-blue-500/10 border-blue-500/25',      label: 'Low' },
}

const STATUS_CONFIG: Record<IncidentStatus, { cls: string; label: string; icon: React.ReactNode }> = {
  open:          { cls: 'text-red-400 bg-red-500/10 border-red-500/25',       label: 'Open',         icon: <Circle size={10} /> },
  investigating: { cls: 'text-orange-400 bg-orange-500/10 border-orange-500/25', label: 'Investigating', icon: <Clock size={10} /> },
  resolved:      { cls: 'text-green-400 bg-green-500/10 border-green-500/25',  label: 'Resolved',     icon: <CheckCircle2 size={10} /> },
  closed:        { cls: 'text-ink-muted bg-navy-500/20 border-edge-default',   label: 'Closed',       icon: <CheckCircle2 size={10} /> },
}

const inp = (err?: string) =>
  `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`

// ─── Incident Modal ───────────────────────────────────────────────────────────

function IncidentModal({ initial, onClose, onSave, onDelete }: {
  initial?: Incident
  onClose: () => void
  onSave: (i: Omit<Incident, 'id'>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  useLocale()
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    severity: initial?.severity ?? 'medium' as IncidentSeverity,
    status: initial?.status ?? 'open' as IncidentStatus,
    description: initial?.description ?? '',
    resolution: initial?.resolution ?? '',
    affectedSystems: initial?.affectedSystems.join(', ') ?? '',
    occurredAt: initial?.occurredAt ?? '',
    resolvedAt: initial?.resolvedAt ?? '',
    tags: initial?.tags.join(', ') ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (k: string, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = tr("Required")
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({
        title: form.title.trim(),
        severity: form.severity as IncidentSeverity,
        status: form.status as IncidentStatus,
        description: form.description.trim(),
        resolution: form.resolution.trim(),
        affectedSystems: form.affectedSystems.split(',').map(s => s.trim()).filter(Boolean),
        occurredAt: form.occurredAt,
        resolvedAt: form.resolvedAt,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      })
    } catch {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
    } catch {
      setDeleting(false)
    }
  }

  const busy = submitting || deleting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit Incident") : tr("Log Incident")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{tr("System outage, security event, or service disruption")}</p>
          </div>
          <button onClick={() => !busy && onClose()} disabled={busy} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Title *")}</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder={tr("e.g. Database unreachable")} className={inp(errors.title)} autoFocus disabled={busy} />
            {errors.title && <p className="text-[10px] text-red-400 mt-1">{errors.title}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Severity")}</label>
              <select value={form.severity} onChange={e => set('severity', e.target.value)} className={inp()} disabled={busy}>
                {SEVERITIES.map(s => <option key={s} value={s}>{tr(SEV_CONFIG[s].label)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Status")}</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp()} disabled={busy}>
                {STATUSES.map(s => <option key={s} value={s}>{tr(STATUS_CONFIG[s].label)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Affected Systems (comma-separated)")}</label>
            <input value={form.affectedSystems} onChange={e => set('affectedSystems', e.target.value)} placeholder={tr("Database, API Gateway, Auth Service")} className={inp()} disabled={busy} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Description")}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder={tr("Describe the incident, impact, and initial observations…")} className={inp() + ' resize-none'} disabled={busy} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Resolution")}</label>
            <textarea value={form.resolution} onChange={e => set('resolution', e.target.value)} rows={2}
              placeholder={tr("What steps resolved the incident? Root cause?")} className={inp() + ' resize-none'} disabled={busy} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Occurred At")}</label>
              <input type="datetime-local" value={form.occurredAt} onChange={e => set('occurredAt', e.target.value)} className={inp()} disabled={busy} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Resolved At")}</label>
              <input type="datetime-local" value={form.resolvedAt} onChange={e => set('resolvedAt', e.target.value)} className={inp()} disabled={busy} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Tags (comma-separated)")}</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder={tr("network, database, security")} className={inp()} disabled={busy} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          {initial && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted">{tr("Delete this incident?")}</span>
                <button onClick={handleDelete} disabled={deleting} className="text-[11px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50 flex items-center gap-1">
                  {deleting && <Loader2 size={10} className="animate-spin" />}  {tr("Yes")} </button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-[11px] text-ink-muted hover:text-ink-secondary disabled:opacity-50">{tr("No")}</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} disabled={busy} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-red-400 transition-colors disabled:opacity-40">
                <Trash2 size={12} />  {tr("Delete")} </button>
            )
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => !busy && onClose()} disabled={busy} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
            <button onClick={submit} disabled={busy} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
              style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? tr("Saving…") : initial ? tr("Save Changes") : tr("Log Incident")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function IncidentDetailModal({ incident, onClose, onEdit }: {
  incident: Incident
  onClose: () => void
  onEdit: () => void
}) {
  useLocale()
  const sc = SEV_CONFIG[incident.severity]
  const stc = STATUS_CONFIG[incident.status]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-6 py-4 border-b border-edge-subtle gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${sc.dot} ${sc.pulse ? 'animate-pulse' : ''}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-primary">{incident.title}</p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${sc.cls}`}>{tr(sc.label)}</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${stc.cls}`}>{stc.icon} {tr(stc.label)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-ink-primary transition-colors"><Edit2 size={13} /></button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-ink-primary transition-colors"><X size={14} /></button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {incident.affectedSystems.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">{tr("Affected Systems")}</p>
              <div className="flex flex-wrap gap-1.5">
                {incident.affectedSystems.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-navy-700 border border-edge-default text-ink-secondary">
                    <Server size={9} /> {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">{tr("Occurred")}</p>
              <p className="font-mono text-ink-secondary">{incident.occurredAt || '—'}</p>
            </div>
            <div>
              <p className="text-[10px] text-ink-muted mb-0.5">{tr("Resolved")}</p>
              <p className="font-mono text-ink-secondary">{incident.resolvedAt || '—'}</p>
            </div>
          </div>

          {incident.description && (
            <div>
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">{tr("Description")}</p>
              <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-line">{incident.description}</p>
            </div>
          )}

          {incident.resolution && (
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3.5">
              <p className="text-[10px] font-semibold text-green-400 uppercase tracking-wider mb-2">{tr("Resolution")}</p>
              <p className="text-xs text-ink-secondary leading-relaxed whitespace-pre-line">{incident.resolution}</p>
            </div>
          )}

          {incident.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Tag size={11} className="text-ink-muted" />
              {incident.tags.map(t => (
                <span key={t} className="text-[10px] text-ink-muted px-1.5 py-0.5 rounded-full bg-navy-700 border border-edge-subtle">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Incident Log ─────────────────────────────────────────────────────────────

export default function IncidentLog() {
  useLocale()
  const { incidents, isLoading, addIncident, updateIncident, deleteIncident } = useApp()
  const [statusFilter, setStatusFilter] = useState<IncidentStatus | 'all'>('all')
  const [sevFilter, setSevFilter] = useState<IncidentSeverity | 'all'>('all')
  const [editModal, setEditModal] = useState<{ open: boolean; initial?: Incident }>({ open: false })
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null)

  const filtered = incidents.filter(i =>
    (statusFilter === 'all' || i.status === statusFilter) &&
    (sevFilter === 'all' || i.severity === sevFilter)
  ).sort((a, b) => new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime())

  const open = incidents.filter(i => i.status === 'open').length
  const investigating = incidents.filter(i => i.status === 'investigating').length
  const resolved = incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length
  const critical = incidents.filter(i => i.severity === 'critical').length

  const handleSave = async (data: Omit<Incident, 'id'>) => {
    if (editModal.initial) {
      await updateIncident({ ...editModal.initial, ...data })
    } else {
      await addIncident(data)
    }
    setEditModal({ open: false })
  }

  const handleDelete = async (id: string) => {
    await deleteIncident(id)
    setEditModal({ open: false })
    setDetailIncident(null)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[900px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{tr("Incident Log")}</h1>
          <p className="text-xs text-ink-muted mt-0.5">{incidents.length}  {tr("total incidents recorded")}</p>
        </div>
        <button onClick={() => setEditModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} />  {tr("Log Incident")} </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Open', value: open, color: 'text-red-400' },
          { label: 'Investigating', value: investigating, color: 'text-orange-400' },
          { label: 'Resolved', value: resolved, color: 'text-green-400' },
          { label: 'Critical', value: critical, color: 'text-red-400' },
        ].map((card, i) => (
          <div key={i} className="bg-navy-800 border border-edge-subtle rounded-xl p-4">
            <p className={`text-2xl font-semibold font-mono ${card.color}`}>{card.value}</p>
            <p className="text-xs font-medium text-ink-secondary mt-1">{tr(card.label)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {/* Status tabs */}
        <div className="flex items-center gap-1 bg-navy-800 border border-edge-subtle rounded-xl p-1">
          {(['all', ...STATUSES] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-navy-600 text-ink-primary' : 'text-ink-muted hover:text-ink-secondary'}`}>
              {s === 'all' ? tr("All") : STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>

        {/* Severity pills */}
        <div className="flex items-center gap-1.5">
          {(['all', ...SEVERITIES] as const).map(s => (
            <button key={s} onClick={() => setSevFilter(s)}
              className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
                sevFilter === s
                  ? s === 'all' ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : SEV_CONFIG[s].cls
                  : 'border-edge-default text-ink-muted hover:text-ink-secondary bg-navy-800'
              }`}>
              {s === 'all' ? tr("All Severity") : SEV_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertTriangle size={28} className="text-ink-muted opacity-30" />
          <p className="text-sm text-ink-muted">{tr("No incidents match your filters")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(incident => {
            const sc = SEV_CONFIG[incident.severity]
            const stc = STATUS_CONFIG[incident.status]
            return (
              <button key={incident.id} onClick={() => setDetailIncident(incident)}
                className="w-full text-left bg-navy-800 border border-edge-subtle rounded-xl px-4 py-3.5 hover:border-edge-default hover:bg-navy-750 transition-all group">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${sc.dot} ${sc.pulse ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-ink-primary group-hover:text-white transition-colors">{incident.title}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${sc.cls}`}>{tr(sc.label)}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${stc.cls}`}>{stc.icon} {tr(stc.label)}</span>
                      </div>
                    </div>
                    {incident.affectedSystems.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Server size={9} className="text-ink-muted" />
                        {incident.affectedSystems.slice(0, 3).map(s => (
                          <span key={s} className="text-[10px] text-ink-muted px-1.5 py-0.5 rounded bg-navy-700 border border-edge-subtle">{s}</span>
                        ))}
                        {incident.affectedSystems.length > 3 && (
                          <span className="text-[10px] text-ink-muted">+{incident.affectedSystems.length - 3}  {tr("more")}</span>
                        )}
                      </div>
                    )}
                    {incident.occurredAt && (
                      <p className="text-[10px] font-mono text-ink-muted mt-1.5">{incident.occurredAt}</p>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {detailIncident && (
        <IncidentDetailModal
          incident={detailIncident}
          onClose={() => setDetailIncident(null)}
          onEdit={() => { setEditModal({ open: true, initial: detailIncident }); setDetailIncident(null) }}
        />
      )}

      {editModal.open && (
        <IncidentModal
          initial={editModal.initial}
          onClose={() => setEditModal({ open: false })}
          onSave={handleSave}
          onDelete={editModal.initial ? () => handleDelete(editModal.initial!.id) : undefined}
        />
      )}
    </div>
  )
}