import { tr, useLocale } from '../i18n'
import { useState, useEffect, useRef } from 'react'
import {
  Search, Plus, X, Edit2, Trash2, ArrowLeft, Shield, ChevronDown, Loader2,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Group, GroupType } from '../api/types'

const GROUP_TYPES: GroupType[] = ['AD Security', 'AD Distribution', 'AD OU', 'Local Group', 'VLAN Group', 'Project Team', 'Other']
const ALL_TYPES = ['All', ...GROUP_TYPES] as const

const TYPE_COLORS: Record<GroupType, string> = {
  'AD Security': 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  'AD Distribution': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/25',
  'AD OU': 'text-purple-400 bg-purple-500/10 border-purple-500/25',
  'Local Group': 'text-green-400 bg-green-500/10 border-green-500/25',
  'VLAN Group': 'text-orange-400 bg-orange-500/10 border-orange-500/25',
  'Project Team': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/25',
  'Other': 'text-ink-secondary bg-navy-700 border-edge-default',
}

function inp(error?: string) {
  return `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${error ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`
}

// ─── Group Form Modal ──────────────────────────────────────────────────────────

interface GroupFormProps {
  initial?: Group
  onSave: (d: Omit<Group, 'id' | 'createdAt'>) => Promise<void>
  onClose: () => void
}

function GroupForm({ initial, onSave, onClose }: GroupFormProps) {
  useLocale()
  const { assets } = useApp()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    type: (initial?.type ?? 'Other') as GroupType,
    description: initial?.description ?? '',
    purpose: initial?.purpose ?? '',
    members: initial?.members ?? [] as string[],
    linkedAssets: initial?.linkedAssets ?? [] as string[],
    tags: initial?.tags ?? [] as string[],
  })
  const [memberInput, setMemberInput] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstRef.current?.focus() }, [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose, submitting])

  const set = (k: string, v: unknown) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const addMember = () => {
    const m = memberInput.trim()
    if (m && !form.members.includes(m)) set('members', [...form.members, m])
    setMemberInput('')
  }
  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t])
    setTagInput('')
  }

  const toggleAsset = (id: string) => {
    set('linkedAssets', form.linkedAssets.includes(id)
      ? form.linkedAssets.filter(a => a !== id)
      : [...form.linkedAssets, id])
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = tr("Required")
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave(form)
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit Group") : tr("Add Group")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{initial ? tr("Editing {{value1}}", { value1: initial.name }) : tr("Define a new group or directory object")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={15} /></button>
        </div>

        <div className="px-5 py-4 space-y-3.5 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Name *")}</label>
            <input ref={firstRef} value={form.name} onChange={e => set('name', e.target.value)} placeholder={tr("e.g. Domain Admins")}
              className={inp(errors.name)} disabled={submitting} />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Type")}</label>
            <div className="relative">
              <select value={form.type} onChange={e => set('type', e.target.value as GroupType)} className={inp() + ' appearance-none pr-8'} disabled={submitting}>
                {GROUP_TYPES.map(t => <option key={t} value={t}>{tr(t)}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Purpose")}</label>
            <textarea value={form.purpose} onChange={e => set('purpose', e.target.value)} rows={3}
              placeholder={tr("What is this group used for? Who should be a member?")}
              className={inp() + ' resize-none leading-relaxed'} disabled={submitting} />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Description")}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              placeholder={tr("Short description…")}
              className={inp() + ' resize-none leading-relaxed'} disabled={submitting} />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Members")}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.members.map(m => (
                <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-700 border border-edge-subtle text-[11px] text-ink-secondary font-mono">
                  {m}
                  <button type="button" onClick={() => set('members', form.members.filter(x => x !== m))} disabled={submitting} className="text-ink-muted hover:text-red-400 transition-colors ml-0.5"><X size={9} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={memberInput} onChange={e => setMemberInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember() } }}
                placeholder={tr("Type name/username, press Enter…")} className={inp() + ' flex-1'} disabled={submitting} />
              <button type="button" onClick={addMember} disabled={submitting} className="px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-secondary text-xs hover:bg-navy-600 transition-colors disabled:opacity-40">{tr("Add")}</button>
            </div>
          </div>

          {assets.length > 0 && (
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Linked Assets")}</label>
              <div className="max-h-32 overflow-y-auto rounded-lg bg-navy-700 border border-edge-default divide-y divide-edge-subtle">
                {assets.map(a => (
                  <label key={a.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-navy-600 transition-colors">
                    <div onClick={() => !submitting && toggleAsset(a.id)} className={`w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${form.linkedAssets.includes(a.id) ? 'bg-blue-500 border-blue-500' : 'border-edge-strong'}`}>
                      {form.linkedAssets.includes(a.id) && <span className="text-white text-[8px] font-bold">✓</span>}
                    </div>
                    <span className="text-xs text-ink-primary truncate">{a.name}</span>
                    <span className="text-[10px] text-ink-muted font-mono ml-auto flex-shrink-0">{tr(a.type)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Tags")}</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-700 border border-edge-subtle text-[11px] text-ink-secondary font-mono">
                  {t}
                  <button type="button" onClick={() => set('tags', form.tags.filter(x => x !== t))} disabled={submitting} className="text-ink-muted hover:text-red-400 transition-colors ml-0.5"><X size={9} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder={tr("Add tag…")} className={inp() + ' flex-1'} disabled={submitting} />
              <button type="button" onClick={addTag} disabled={submitting} className="px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-secondary text-xs hover:bg-navy-600 transition-colors disabled:opacity-40">{tr("Add")}</button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-edge-subtle bg-navy-900/50">
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-3.5 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs transition-colors border border-edge-default disabled:opacity-40">{tr("Cancel")}</button>
          <button onClick={submit} disabled={submitting} className="px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-xs font-medium transition-all disabled:opacity-60 flex items-center gap-1.5" style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.35)' }}>
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {submitting ? tr("Saving…") : initial ? tr("Save Changes") : tr("Add Group")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Panel ──────────────────────────────────────────────────────────────

function GroupDetail({ group, onBack, onEdit, onDelete }: {
  group: Group
  onBack?: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  useLocale()
  const { assets, updateGroup } = useApp()
  const [memberInput, setMemberInput] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const linkedAssetNames = group.linkedAssets.map(id => assets.find(a => a.id === id)).filter(Boolean)

  const addMember = () => {
    const m = memberInput.trim()
    if (m && !group.members.includes(m)) {
      void updateGroup({ ...group, members: [...group.members, m] })
    }
    setMemberInput('')
  }

  const removeMember = (m: string) => {
    void updateGroup({ ...group, members: group.members.filter(x => x !== m) })
  }

  const handleDelete = async () => {
    setDeleting(true)

    try {
      await onDelete()
    } 
    catch {
      setDeleting(false)
    }
    
    setDeleting(false)
    setConfirmDelete(false)
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink-primary transition-colors mb-4">
          <ArrowLeft size={13} />  {tr("Back to list")} </button>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-navy-700 border border-edge-default flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-semibold text-ink-primary truncate">{group.name}</h1>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${TYPE_COLORS[group.type]}`}>{tr(group.type)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={onEdit} className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-secondary text-xs hover:border-edge-strong transition-colors">
            <Edit2 size={12} /><span className="hidden sm:inline">{tr("Edit")}</span>
          </button>
          <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg bg-navy-800 border border-edge-default text-ink-muted hover:text-red-400 hover:border-red-500/30 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {group.purpose && (
        <div className="bg-navy-800 border border-edge-subtle rounded-xl p-4 sm:p-5 mb-4">
          <h3 className="text-xs font-semibold text-ink-primary mb-2">{tr("Purpose")}</h3>
          <p className="text-xs text-ink-secondary leading-relaxed">{group.purpose}</p>
        </div>
      )}

      {group.description && (
        <div className="bg-navy-800 border border-edge-subtle rounded-xl p-4 sm:p-5 mb-4">
          <h3 className="text-xs font-semibold text-ink-primary mb-2">{tr("Description")}</h3>
          <p className="text-xs text-ink-secondary leading-relaxed">{group.description}</p>
        </div>
      )}

      <div className="bg-navy-800 border border-edge-subtle rounded-xl p-4 sm:p-5 mb-4">
        <h3 className="text-xs font-semibold text-ink-primary mb-3 flex items-center gap-2">
           {tr("Members")} <span className="text-[10px] font-mono text-ink-muted bg-navy-700 px-1.5 py-0.5 rounded border border-edge-subtle">{group.members.length}</span>
        </h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {group.members.length > 0 ? group.members.map(m => (
            <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-700 border border-edge-default text-[11px] text-ink-secondary font-mono">
              {m}
              <button onClick={() => removeMember(m)} className="text-ink-muted hover:text-red-400 transition-colors ml-0.5"><X size={9} /></button>
            </span>
          )) : <p className="text-xs text-ink-muted">{tr("No members")}</p>}
        </div>
        <div className="flex gap-2">
          <input value={memberInput} onChange={e => setMemberInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember() } }}
            placeholder={tr("Add member…")}
            className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none focus:border-blue-500 transition-colors flex-1" />
          <button onClick={addMember} className="px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-secondary text-xs hover:bg-navy-600 transition-colors flex-shrink-0">{tr("Add")}</button>
        </div>
      </div>

      <div className="bg-navy-800 border border-edge-subtle rounded-xl p-4 sm:p-5 mb-4">
        <h3 className="text-xs font-semibold text-ink-primary mb-3">{tr("Linked Assets")}</h3>
        {linkedAssetNames.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {linkedAssetNames.map(a => a && (
              <span key={a.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-navy-700 border border-edge-default text-[11px] text-ink-secondary font-mono">
                {a.name}
                <span className="text-ink-muted">·{tr(a.type)}</span>
              </span>
            ))}
          </div>
        ) : <p className="text-xs text-ink-muted">{tr("No linked assets")}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-navy-800 border border-edge-subtle rounded-xl p-4">
          <h3 className="text-xs font-semibold text-ink-primary mb-3">{tr("Tags")}</h3>
          {group.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {group.tags.map(t => <span key={t} className="px-2 py-0.5 rounded-md bg-navy-700 text-[11px] text-ink-secondary font-mono border border-edge-subtle">{t}</span>)}
            </div>
          ) : <p className="text-xs text-ink-muted">{tr("No tags")}</p>}
        </div>
        <div className="bg-navy-800 border border-edge-subtle rounded-xl p-4">
          <h3 className="text-xs font-semibold text-ink-primary mb-3">{tr("Created")}</h3>
          <p className="text-xs text-ink-secondary font-mono">{group.createdAt}</p>
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-navy-800 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ animation: 'modalIn 0.15s ease-out' }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4"><Trash2 size={18} className="text-red-400" /></div>
            <h3 className="text-sm font-semibold text-ink-primary text-center mb-1">{tr("Delete Group")}</h3>
            <p className="text-xs text-ink-muted text-center mb-5">{tr("Delete")} <span className="text-ink-primary font-mono">{group.name}</span>{tr("? This cannot be undone.")}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="flex-1 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs transition-colors border border-edge-default disabled:opacity-40">{tr("Cancel")}</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                {deleting && <Loader2 size={12} className="animate-spin" />}
                {deleting ? tr("Deleting…") : tr("Delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export default function Groups() {
  useLocale()
  const { groups, isLoading, addGroup, updateGroup, deleteGroup, toast } = useApp()

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('All')
  const [selectedId, setSelectedId] = useState<string | null>(
    () => groups[0]?.id ?? null
  )
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)

  const filtered = groups.filter(g =>
    (typeFilter === 'All' || g.type === typeFilter) &&
    (g.name.toLowerCase().includes(query.toLowerCase()) ||
      g.description.toLowerCase().includes(query.toLowerCase()) ||
      g.type.toLowerCase().includes(query.toLowerCase()))
  )

  const effectiveSelectedId = selectedId ?? groups[0]?.id
  const selected =
    groups.find(g => g.id === effectiveSelectedId) ?? null

  const selectGroup = (id: string) => {
    setSelectedId(id)
    setMobileDetailOpen(true)
  }

  const handleDelete = async () => {
    if (!selected) 
      return

    await deleteGroup(selected.id)
    toast(tr("Group deleted"))
    setMobileDetailOpen(false)
    setSelectedId(filtered.find(g => g.id !== selected.id)?.id ?? null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* List Panel */}
      <div className={`flex flex-col border-r border-edge-subtle bg-navy-900 flex-shrink-0 w-full md:w-72 ${mobileDetailOpen ? 'hidden md:flex' : 'flex'}`}>
        <div className="px-4 pt-4 pb-3 border-b border-edge-subtle flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-ink-primary">{tr("Groups & Directory")}</h2>
              <p className="text-[10px] text-ink-muted mt-0.5 font-mono">{groups.length}  {tr("groups")}</p>
            </div>
            <button onClick={() => setAddOpen(true)} className="p-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white transition-all" title={tr("Add group")}>
              <Plus size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={tr("Search groups…")}
              className="w-full pl-7 pr-7 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:border-blue-500 focus:outline-none transition-colors" />
            {query && <button onClick={() => setQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink-primary transition-colors"><X size={11} /></button>}
          </div>
        </div>

        <div className="px-3 py-2 border-b border-edge-subtle flex-shrink-0 flex flex-wrap gap-1">
          {ALL_TYPES.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-colors ${typeFilter === t ? 'bg-blue-500 text-white' : 'bg-navy-800 text-ink-muted hover:text-ink-secondary border border-edge-subtle'}`}>
              {tr(t)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-edge-subtle">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Shield size={22} className="text-ink-muted opacity-40" />
              <p className="text-xs text-ink-muted">{tr("No groups defined")}</p>
              <button onClick={() => setAddOpen(true)} className="text-[11px] text-blue-400 hover:text-blue-300 transition-colors">{tr("+ Add group")}</button>
            </div>
          )}
          {filtered.map(g => (
            <button key={g.id} onClick={() => selectGroup(g.id)}
              className={`w-full px-4 py-3 text-left transition-all hover:bg-navy-800/80 ${selectedId === g.id ? 'bg-navy-800 md:border-r-2 md:border-blue-500' : ''}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_COLORS[g.type]}`}>{tr(g.type)}</span>
              </div>
              <p className="text-xs font-medium text-ink-primary truncate mb-0.5">{g.name}</p>
              <div className="flex items-center justify-between gap-1">
                <p className="text-[10px] text-ink-muted truncate">{g.description || g.purpose}</p>
                <span className="text-[10px] text-ink-muted font-mono flex-shrink-0">{g.members.length}  {tr("members")}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail Panel */}
      <div className={`flex-1 overflow-y-auto ${mobileDetailOpen ? 'block' : 'hidden md:block'}`}>
        {selected ? (
          <GroupDetail
            group={selected}
            onBack={() => setMobileDetailOpen(false)}
            onEdit={() => setEditGroup(selected)}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-14 h-14 rounded-2xl bg-navy-800 border border-edge-subtle flex items-center justify-center"><Shield size={24} className="text-ink-muted" /></div>
            <p className="text-sm text-ink-secondary font-medium">{tr("No groups defined")}</p>
            <p className="text-xs text-ink-muted">{tr("or")} <button onClick={() => setAddOpen(true)} className="text-blue-400 hover:text-blue-300 transition-colors">{tr("add a new group")}</button></p>
          </div>
        )}
      </div>

      {/* Modals */}
      {addOpen && (
        <GroupForm
          onSave={async d => {
            await addGroup(d)
            setAddOpen(false)
            toast(tr("Group added"))
          }}
          onClose={() => setAddOpen(false)}
        />
      )}
      {editGroup && (
        <GroupForm
          initial={editGroup}
          onSave={async d => {
            await updateGroup({ ...editGroup, ...d })
            setEditGroup(null)
            toast(tr("Group updated"))
          }}
          onClose={() => setEditGroup(null)}
        />
      )}
    </div>
  )
}