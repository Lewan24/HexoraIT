import { useState, useEffect } from 'react'
import {
  Plus, X, Edit2, Trash2, Calendar,
  User, CheckSquare, ChevronRight, ChevronLeft, Loader2,
  FolderKanban, ChevronDown, Check, Layers,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Task, Priority, TaskStatus, Project } from '../api/types'

const PRIORITIES: Priority[] = ['high', 'medium', 'low']
const STATUSES: TaskStatus[] = ['todo', 'in-progress', 'done']

const PRIORITY_CONFIG: Record<Priority, { cls: string; dot: string; label: string }> = {
  high:   { cls: 'text-red-400 bg-red-500/10 border-red-500/25',     dot: 'bg-red-400',    label: 'High' },
  medium: { cls: 'text-orange-400 bg-orange-500/10 border-orange-500/25', dot: 'bg-orange-400', label: 'Medium' },
  low:    { cls: 'text-green-400 bg-green-500/10 border-green-500/25',   dot: 'bg-green-400',  label: 'Low' },
}

const STATUS_CONFIG: Record<TaskStatus, { label: string; col: string }> = {
  'todo':       { label: 'To Do',       col: 'border-edge-subtle' },
  'in-progress': { label: 'In Progress', col: 'border-cyan-500/30' },
  'done':        { label: 'Done',        col: 'border-green-500/30' },
}

const PROJECT_COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d', '#374151']
const NO_PROJECT = '__none__'

function isOverdue(dueDate: string) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date()
}

const inp = (err?: string) =>
  `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`


function ProjectModal({ initial, onClose, onSave, onDelete }: {
  initial?: Project
  onClose: () => void
  onSave: (p: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [color, setColor] = useState(initial?.color! ?? PROJECT_COLORS[0])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const submit = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    setSubmitting(true)
    try {
      await onSave({ name: name.trim(), description, color })
      onClose()
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
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle">
          <h2 className="text-sm font-semibold text-ink-primary">{initial ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={() => !busy && onClose()} disabled={busy} className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Name *</label>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="e.g. Network Overhaul Q3" className={inp(error)} autoFocus disabled={busy} />
            {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Optional" className={inp() + ' resize-none'} disabled={busy} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map(c => (
                <button key={c} onClick={() => !busy && setColor(c)} className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent' }}>
                  {color === c && <Check size={10} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-edge-subtle bg-navy-900/40">
          {initial && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted">Delete project? Tasks stay, unassigned.</span>
                <button onClick={handleDelete} disabled={deleting} className="text-[11px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50">Yes</button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-[11px] text-ink-muted disabled:opacity-50">No</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} disabled={busy} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-red-400 transition-colors disabled:opacity-40">
                <Trash2 size={12} /> Delete
              </button>
            )
          ) : <div />}
          <div className="flex gap-2">
            <button onClick={() => !busy && onClose()} disabled={busy} className="px-3.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">Cancel</button>
            <button onClick={submit} disabled={busy} className="px-3.5 py-1.5 rounded-lg text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5" style={{ backgroundColor: color }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Create Project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskModal({ initial, projects, defaultProjectId, onClose, onSave, onDelete }: {
  initial?: Task
  projects: Project[]
  defaultProjectId?: string
  onClose: () => void
  onSave: (t: Omit<Task, 'id' | 'createdAt'>) => Promise<void>
  onDelete?: () => Promise<void>
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    priority: initial?.priority ?? 'medium' as Priority,
    status: initial?.status ?? 'todo' as TaskStatus,
    assignee: initial?.assignee ?? '',
    dueDate: initial?.dueDate ?? '',
    tags: initial?.tags.join(', ') ?? '',
    projectId: initial?.projectId ?? defaultProjectId ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

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
        priority: form.priority,
        status: form.status,
        assignee: form.assignee.trim(),
        dueDate: form.dueDate,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        projectId: form.projectId || undefined,
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
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? 'Edit Task' : 'Add Task'}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">IT task or action item</p>
          </div>
          <button onClick={() => !busy && onClose()} disabled={busy} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Replace firewall firmware" className={inp(errors.title)} autoFocus disabled={busy} />
            {errors.title && <p className="text-[10px] text-red-400 mt-1">{errors.title}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Project</label>
            <select value={form.projectId} onChange={e => set('projectId', e.target.value)} className={inp()} disabled={busy}>
              <option value="">No Project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              placeholder="Optional details about this task…" className={inp() + ' resize-none'} disabled={busy} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inp()} disabled={busy}>
                {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp()} disabled={busy}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Assignee</label>
              <input value={form.assignee} onChange={e => set('assignee', e.target.value)} placeholder="John Doe" className={inp()} disabled={busy} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inp()} disabled={busy} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="network, security, maintenance" className={inp()} disabled={busy} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          {initial && onDelete ? (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-ink-muted">Delete this task?</span>
                <button onClick={handleDelete} disabled={deleting} className="text-[11px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50">Yes</button>
                <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="text-[11px] text-ink-muted disabled:opacity-50">No</button>
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
              {submitting ? 'Saving…' : initial ? 'Save Changes' : 'Add Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TaskCard({ task, onEdit, onMove }: {
  task: Task
  onEdit: () => void
  onMove: (dir: 'prev' | 'next') => void
}) {
  const pc = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.dueDate)
  const statusIdx = STATUSES.indexOf(task.status)

  return (
    <div className="bg-navy-800 border border-edge-subtle rounded-xl px-3.5 py-3 hover:border-edge-default transition-all group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-ink-primary leading-snug flex-1 min-w-0">{task.title}</p>
        <button onClick={onEdit} className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
          <Edit2 size={11} />
        </button>
      </div>
      {task.description && (
        <p className="text-[11px] text-ink-muted truncate mb-2">{task.description}</p>
      )}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <span className={`inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${pc.cls}`}>
          <span className={`w-1 h-1 rounded-full ${pc.dot}`} />{pc.label}
        </span>
        {task.assignee && (
          <span className="inline-flex items-center gap-1 text-[10px] text-ink-muted">
            <User size={9} /> {task.assignee}
          </span>
        )}
      </div>
      {(task.dueDate || task.tags.length > 0) && (
        <div className="flex items-center gap-2 flex-wrap">
          {task.dueDate && (
            <span className={`inline-flex items-center gap-1 text-[10px] font-mono ${overdue && task.status !== 'done' ? 'text-red-400' : 'text-ink-muted'}`}>
              <Calendar size={9} /> {task.dueDate}
              {overdue && task.status !== 'done' && <span className="text-[9px]">· overdue</span>}
            </span>
          )}
          {task.tags.slice(0, 2).map(t => (
            <span key={t} className="text-[9px] text-ink-muted px-1 py-0.5 rounded bg-navy-700 border border-edge-subtle">{t}</span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-edge-subtle">
        <button
          onClick={() => onMove('prev')}
          disabled={statusIdx === 0}
          className="flex items-center gap-0.5 text-[10px] text-ink-muted hover:text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1.5 py-0.5 rounded hover:bg-navy-700">
          <ChevronLeft size={10} /> {statusIdx > 0 ? STATUS_CONFIG[STATUSES[statusIdx - 1]!].label : ''}
        </button>
        <div className="flex-1" />
        <button
          onClick={() => onMove('next')}
          disabled={statusIdx === STATUSES.length - 1}
          className="flex items-center gap-0.5 text-[10px] text-ink-muted hover:text-ink-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1.5 py-0.5 rounded hover:bg-navy-700">
          {statusIdx < STATUSES.length - 1 ? STATUS_CONFIG[STATUSES[statusIdx + 1]!].label : ''} <ChevronRight size={10} />
        </button>
      </div>
    </div>
  )
}

function ProjectSwitcher({ projects, activeId, onSelect, onNew, onEdit }: {
  projects: Project[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onEdit: (p: Project) => void
}) {
  const [open, setOpen] = useState(false)
  const active = projects.find(p => p.id === activeId)
  const label = activeId === 'all' ? 'All Tasks' : activeId === NO_PROJECT ? 'No Project' : active?.name ?? 'All Tasks'
  const color = active?.color

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-xs text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-colors">
        {color ? <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} /> : <Layers size={13} className="text-ink-muted" />}
        <span className="font-medium">{label}</span>
        <ChevronDown size={12} className={`text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 w-64 bg-navy-750 border border-edge-default rounded-xl shadow-2xl z-40 overflow-hidden">
            <button onClick={() => { onSelect('all'); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-navy-700 transition-colors ${activeId === 'all' ? 'text-blue-400' : 'text-ink-secondary'}`}>
              <Layers size={13} className="flex-shrink-0" /> All Tasks
              {activeId === 'all' && <Check size={11} className="ml-auto flex-shrink-0" />}
            </button>
            <button onClick={() => { onSelect(NO_PROJECT); setOpen(false) }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-xs hover:bg-navy-700 transition-colors border-t border-edge-subtle ${activeId === NO_PROJECT ? 'text-blue-400' : 'text-ink-secondary'}`}>
              <span className="w-2.5 h-2.5 rounded-full border border-edge-strong flex-shrink-0" /> No Project
              {activeId === NO_PROJECT && <Check size={11} className="ml-auto flex-shrink-0" />}
            </button>
            {projects.length > 0 && <div className="border-t border-edge-subtle" />}
            {projects.map(p => (
              <div key={p.id} className={`flex items-center hover:bg-navy-700 transition-colors ${activeId === p.id ? 'text-blue-400' : 'text-ink-secondary'}`}>
                <button onClick={() => { onSelect(p.id); setOpen(false) }} className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-left text-xs min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate">{p.name}</span>
                  <span className="text-[10px] text-ink-muted flex-shrink-0">{p.taskCount}</span>
                  {activeId === p.id && <Check size={11} className="ml-auto flex-shrink-0" />}
                </button>
                <button onClick={() => { onEdit(p); setOpen(false) }} className="p-2 text-ink-muted hover:text-ink-primary flex-shrink-0"><Edit2 size={11} /></button>
              </div>
            ))}
            <div className="border-t border-edge-subtle">
              <button onClick={() => { onNew(); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors">
                <Plus size={12} /> New Project
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function Tasks() {
  const { tasks, projects, isLoading, addTask, updateTask, deleteTask, addProject, updateProject, deleteProject } = useApp()
  const [modal, setModal] = useState<{ open: boolean; initial?: Task }>({ open: false })
  const [projectModal, setProjectModal] = useState<{ open: boolean; initial?: Project } | null>(null)
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>('todo')
  const [activeProjectId, setActiveProjectId] = useState<string>('all')

  const filteredTasks = tasks.filter(t => {
    if (activeProjectId === 'all') return true
    if (activeProjectId === NO_PROJECT) return !t.projectId
    return t.projectId === activeProjectId
  })

  const byStatus = (s: TaskStatus) => filteredTasks.filter(t => t.status === s)

  const handleSaveTask = async (data: Omit<Task, 'id' | 'createdAt'>) => {
    if (modal.initial) {
      await updateTask({ ...modal.initial, ...data })
    } else {
      await addTask(data)
    }
    setModal({ open: false })
  }

  const handleDeleteTask = async (id: string) => {
    await deleteTask(id)
    setModal({ open: false })
  }

  const moveTask = (task: Task, dir: 'prev' | 'next') => {
    const idx = STATUSES.indexOf(task.status)
    const nextIdx = dir === 'next' ? idx + 1 : idx - 1
    if (nextIdx < 0 || nextIdx >= STATUSES.length) return
    updateTask({ ...task, status: STATUSES[nextIdx]! })
  }

  const handleSaveProject = async (data: Omit<Project, 'id' | 'createdAt' | 'taskCount'>) => {
    if (projectModal?.initial) {
      await updateProject({ ...projectModal.initial, ...data })
    } else {
      const created = await addProject(data)
      setActiveProjectId(created.id) // jump straight into the new project
    }
  }

  const handleDeleteProject = async (id: string) => {
    await deleteProject(id)
    if (activeProjectId === id) setActiveProjectId('all')
    setProjectModal(null)
  }

  const colHeader = (s: TaskStatus) => {
    const count = byStatus(s).length
    const colCls: Record<TaskStatus, string> = {
      'todo': 'text-ink-secondary',
      'in-progress': 'text-cyan-400',
      'done': 'text-green-400',
    }
    return (
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className={`text-xs font-semibold ${colCls[s]}`}>{STATUS_CONFIG[s].label}</p>
          <span className="text-[10px] font-mono text-ink-muted bg-navy-700 border border-edge-subtle px-1.5 py-0.5 rounded-full">{count}</span>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  const defaultProjectId = activeProjectId !== 'all' && activeProjectId !== NO_PROJECT ? activeProjectId : undefined

  return (
    <div className="p-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary flex items-center gap-2"><FolderKanban size={18} className="text-blue-400" /> Tasks</h1>
          <p className="text-xs text-ink-muted mt-0.5">{filteredTasks.length} tasks · {byStatus('in-progress').length} in progress</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Project switcher */}
      <div className="mb-5">
        <ProjectSwitcher
          projects={projects}
          activeId={activeProjectId}
          onSelect={setActiveProjectId}
          onNew={() => setProjectModal({ open: true })}
          onEdit={p => setProjectModal({ open: true, initial: p })}
        />
      </div>

      {/* Mobile status tabs */}
      <div className="flex items-center gap-1 mb-4 bg-navy-800 border border-edge-subtle rounded-xl p-1 w-fit lg:hidden">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setMobileStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${mobileStatus === s ? 'bg-navy-600 text-ink-primary' : 'text-ink-muted hover:text-ink-secondary'}`}>
            {STATUS_CONFIG[s].label}
            <span className="ml-1.5 text-[10px] text-ink-muted">{byStatus(s).length}</span>
          </button>
        ))}
      </div>

      {/* Kanban columns — desktop */}
      <div className="hidden lg:grid grid-cols-3 gap-4">
        {STATUSES.map(s => (
          <div key={s} className={`bg-navy-800/50 border rounded-xl p-4 ${STATUS_CONFIG[s].col}`}>
            {colHeader(s)}
            {byStatus(s).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <CheckSquare size={20} className="text-ink-muted opacity-30" />
                <p className="text-xs text-ink-muted">No tasks</p>
              </div>
            ) : (
              <div className="space-y-2">
                {byStatus(s).map(task => (
                  <TaskCard key={task.id} task={task} onEdit={() => setModal({ open: true, initial: task })} onMove={dir => moveTask(task, dir)} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile single column */}
      <div className="lg:hidden">
        <div className={`bg-navy-800/50 border rounded-xl p-4 ${STATUS_CONFIG[mobileStatus].col}`}>
          {colHeader(mobileStatus)}
          {byStatus(mobileStatus).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckSquare size={20} className="text-ink-muted opacity-30" />
              <p className="text-xs text-ink-muted">No tasks</p>
            </div>
          ) : (
            <div className="space-y-2">
              {byStatus(mobileStatus).map(task => (
                <TaskCard key={task.id} task={task} onEdit={() => setModal({ open: true, initial: task })} onMove={dir => moveTask(task, dir)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {modal.open && (
        <TaskModal
          initial={modal.initial}
          projects={projects}
          defaultProjectId={defaultProjectId}
          onClose={() => setModal({ open: false })}
          onSave={handleSaveTask}
          onDelete={modal.initial ? () => handleDeleteTask(modal.initial!.id) : undefined}
        />
      )}

      {projectModal?.open && (
        <ProjectModal
          initial={projectModal.initial}
          onClose={() => setProjectModal(null)}
          onSave={handleSaveProject}
          onDelete={projectModal.initial ? () => handleDeleteProject(projectModal.initial!.id) : undefined}
        />
      )}
    </div>
  )
}