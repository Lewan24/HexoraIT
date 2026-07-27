import { useState } from 'react'
import {
  Plus, X, Edit2, Trash2, Tag, Calendar,
  CheckCircle2, Circle, Clock, Ban, Loader2, DollarSign
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Plan, Priority, PlanStatus } from '../api/types'

const STATUSES: PlanStatus[] = ['planned', 'in-progress', 'completed', 'cancelled']
const PRIORITIES: Priority[] = ['high', 'medium', 'low']

const STATUS_CONFIG: Record<PlanStatus, { cls: string; label: string; icon: React.ReactNode }> = {
  planned:     { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',     label: 'Planned',     icon: <Circle size={10} /> },
  'in-progress': { cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',   label: 'In Progress', icon: <Clock size={10} /> },
  completed:   { cls: 'bg-green-500/15 text-green-400 border-green-500/30',  label: 'Completed',   icon: <CheckCircle2 size={10} /> },
  cancelled:   { cls: 'bg-navy-500/20 text-ink-muted border-edge-default',   label: 'Cancelled',   icon: <Ban size={10} /> },
}

const PRIORITY_CONFIG: Record<Priority, { cls: string; dot: string; label: string }> = {
  high:   { cls: 'text-red-400 bg-red-500/10 border-red-500/25',     dot: 'bg-red-400',    label: 'High' },
  medium: { cls: 'text-orange-400 bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-400', label: 'Medium' },
  low:    { cls: 'text-green-400 bg-green-500/10 border-green-500/25',   dot: 'bg-green-400',  label: 'Low' },
}

const inp = (err?: string) =>
  `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`

// ─── Plan Modal ───────────────────────────────────────────────────────────────

function PlanModal({ initial, onClose, onSave, onDelete }: {
  initial?: Plan
  onClose: () => void
  onSave: (p: Omit<Plan, 'id' | 'createdAt'>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const { assets } = useApp()

  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'medium' as Priority,
    status: initial?.status ?? 'planned' as PlanStatus,
    targetDate: initial?.targetDate ?? '',
    tags: initial?.tags.join(', ') ?? '',
    estimatedCost: initial?.estimatedCost ?? 0,
    assetIds: initial?.assetIds ?? [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (k: string, v: unknown) => {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: '' }))
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Required'
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority as Priority,
        status: form.status as PlanStatus,
        targetDate: form.targetDate,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        estimatedCost: Number(form.estimatedCost),
        assetIds: form.assetIds
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

  const toggleAsset = (id: string) => {
    setForm(f => ({
      ...f,
      assetIds: f.assetIds.includes(id)
        ? f.assetIds.filter(x => x !== id)
        : [...f.assetIds, id]
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !busy && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? 'Edit Plan' : 'Add Plan'}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">Strategic initiative or project plan</p>
          </div>
          <button onClick={() => !busy && onClose()} disabled={busy} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Network Upgrade Q3" className={inp(errors.title)} autoFocus disabled={busy} />
            {errors.title && <p className="text-[10px] text-red-400 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder="Goals, scope, and key deliverables…" className={inp() + ' resize-none'} disabled={busy} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inp()} disabled={busy}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp()} disabled={busy}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Target Date</label>
            <input type="date" value={form.targetDate} onChange={e => set('targetDate', e.target.value)} className={inp()} disabled={busy} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">
              Estimated Cost
            </label>

            <input type="number" min="0" step="0.01" value={form.estimatedCost}
              onChange={e =>
                set('estimatedCost', e.target.value)
              }
              placeholder="25000" className={inp()} disabled={busy}
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">
              Linked Assets
            </label>

            <div className="max-h-40 overflow-y-auto bg-navy-700 border border-edge-default rounded-lg p-2 space-y-1">
              {assets.length === 0 && (
                <p className="text-xs text-ink-muted">
                  No assets available
                </p>
              )}

              {assets.map(asset => (
                <label
                  key={asset.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-navy-600 cursor-pointer">
                  <input type="checkbox" checked={form.assetIds.includes(asset.id)} onChange={() => toggleAsset(asset.id)}/>

                  <span className="text-xs text-ink-primary">
                    {asset.name}
                  </span>
                </label>
              ))}
            </div>

            {form.assetIds.length > 0 && (
              <p className="text-[10px] text-ink-muted mt-1">
                {form.assetIds.length} asset(s) selected
              </p>
            )}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="network, infrastructure, q3" className={inp()} disabled={busy} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          {initial && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted">Delete this plan?</span>
                <button onClick={handleDelete} disabled={deleting} className="text-[11px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50 flex items-center gap-1">
                  {deleting && <Loader2 size={10} className="animate-spin" />} Yes
                </button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-[11px] text-ink-muted hover:text-ink-secondary disabled:opacity-50">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} disabled={busy} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-red-400 transition-colors disabled:opacity-40">
                <Trash2 size={12} /> Delete
              </button>
            )
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => !busy && onClose()} disabled={busy} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={submit} disabled={busy} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
              style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Add Plan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({ plan, onClick }: { plan: Plan; onClick: () => void }) {
  const sc = STATUS_CONFIG[plan.status]
  const pc = PRIORITY_CONFIG[plan.priority]

  return (
    <button onClick={onClick}
      className="cursor-pointer w-full text-left bg-navy-800 border border-edge-subtle rounded-xl px-4 py-4 hover:border-edge-default hover:bg-navy-750 transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink-primary group-hover:text-white transition-colors">
            {plan.title}
            {plan.estimatedCost > 0 && (
              <span className="inline-flex items-center gap-1 ml-5 text-orange-400">
                Estimated cost:
                <span className='inline-flex items-center gap-1'>
                  <DollarSign size={11}/>
                  {plan.estimatedCost.toLocaleString('en-US')}
                </span>
              </span>
            )}  
          </p>
          {plan.description && (
            <p className="text-xs text-ink-muted mt-1 line-clamp-2 leading-relaxed">{plan.description}</p>
          )}

          {plan.assetIds.length > 0 && (
            <span className="
              text-[12px] text-ink-muted
            ">
              {plan.assetIds.length} assets included
            </span>
          )}
        </div>
        <Edit2 size={12} className="text-ink-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-semibold ${pc.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${pc.dot}`} />
          {pc.label}
        </span>
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${sc.cls}`}>
          {sc.icon} {sc.label}
        </span>
        {plan.targetDate && (
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
            <Calendar size={9} /> {plan.targetDate}
          </span>
        )}
      </div>

      {plan.tags.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
          <Tag size={9} className="text-ink-muted" />
          {plan.tags.map(t => (
            <span key={t} className="text-[10px] text-ink-muted px-1.5 py-0.5 rounded-full bg-navy-700 border border-edge-subtle">{t}</span>
          ))}
        </div>
      )}
    </button>
  )
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export default function Plans() {
  const { plans, isLoading, addPlan, updatePlan, deletePlan } = useApp()
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'all'>('all')
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all')
  const [modal, setModal] = useState<{ open: boolean; initial?: Plan }>({ open: false })

  const filtered = plans.filter(p =>
    (statusFilter === 'all' || p.status === statusFilter) &&
    (priorityFilter === 'all' || p.priority === priorityFilter)
  )

  const counts: Record<PlanStatus | 'all', number> = {
    all: plans.length,
    planned: plans.filter(p => p.status === 'planned').length,
    'in-progress': plans.filter(p => p.status === 'in-progress').length,
    completed: plans.filter(p => p.status === 'completed').length,
    cancelled: plans.filter(p => p.status === 'cancelled').length,
  }

  const handleSave = async (data: Omit<Plan, 'id' | 'createdAt'>) => {
    if (modal.initial) {
      await updatePlan({ ...modal.initial, ...data })
    } else {
      await addPlan(data)
    }
    setModal({ open: false })
  }

  const handleDelete = async (id: string) => {
    await deletePlan(id)
    setModal({ open: false })
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
          <h1 className="text-xl font-semibold text-ink-primary">Plans</h1>
          <p className="text-xs text-ink-muted mt-0.5">{plans.length} plans total</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} /> New Plan
        </button>
      </div>

      {/* Summary counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {STATUSES.map(s => {
          const sc = STATUS_CONFIG[s]
          return (
            <div key={s}
              onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
              className={`bg-navy-800 border rounded-xl p-3.5 cursor-pointer transition-all hover:-translate-y-0.5 ${statusFilter === s ? 'border-blue-500/40' : 'border-edge-subtle'}`}>
              <p className="text-2xl font-semibold font-mono text-ink-primary">{counts[s]}</p>
              <div className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md border mt-1.5 ${sc.cls}`}>
                {sc.icon} {sc.label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-3 bg-navy-800 border border-edge-subtle rounded-xl p-1 w-fit">
        {(['all', ...STATUSES] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-navy-600 text-ink-primary' : 'text-ink-muted hover:text-ink-secondary'}`}>
            {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
            <span className="ml-1.5 text-[10px] text-ink-muted">{counts[s]}</span>
          </button>
        ))}
      </div>

      {/* Priority filter pills */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-[11px] text-ink-muted">Priority:</span>
        {(['all', ...PRIORITIES] as const).map(p => (
          <button key={p} onClick={() => setPriorityFilter(p)}
            className={`px-2.5 py-1 rounded-full text-[11px] border transition-colors ${
              priorityFilter === p
                ? p === 'all' ? 'bg-blue-500/15 border-blue-500/40 text-blue-400' : `${PRIORITY_CONFIG[p].cls}`
                : 'border-edge-default text-ink-muted hover:text-ink-secondary bg-navy-800'
            }`}>
            {p === 'all' ? 'All' : PRIORITY_CONFIG[p].label}
          </button>
        ))}
      </div>

      {/* Plan list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle2 size={28} className="text-ink-muted opacity-30" />
          <p className="text-sm text-ink-muted">No plans match your filters</p>
          <button onClick={() => setModal({ open: true })} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">+ Add Plan</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(plan => (
            <PlanCard key={plan.id} plan={plan} onClick={() => setModal({ open: true, initial: plan })} />
          ))}
        </div>
      )}

      {modal.open && (
        <PlanModal
          initial={modal.initial}
          onClose={() => setModal({ open: false })}
          onSave={handleSave}
          onDelete={modal.initial ? () => handleDelete(modal.initial!.id) : undefined}
        />
      )}
    </div>
  )
}