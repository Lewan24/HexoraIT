import LanguageSwitcher from './LanguageSwitcher'
import { tr, useLocale } from '../i18n'
import { useState, useEffect } from 'react'
import {
  User, Building2, Bell, Shield, Info, Plus, Trash2, Edit2,
  Check, X, LogOut, Key, Monitor, Globe, Moon, Sun, ChevronRight,
  AlertTriangle, CheckCircle2, Loader2,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import { useAuth } from '../context/useAuth'
import { organizationsApi } from '../api/resources'
import { ApiError } from '../api/http'
import { toggleTheme, getTheme } from '../lib/theme'
import type { Organization, OrgMembership, OrgMember, OrgRole, OrganizationSummary } from '../api/types'
import type { View } from '../App'
import OrganizationRoles from './OrganizationRoles'

type Section = 'profile' | 'organizations' | 'roles' | 'appearance' | 'security' | 'notifications' | 'about'

const SECTIONS: { id: Section; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: 'roles', label: 'Organization roles', icon: <Shield size={16} />, desc: 'Configure permissions for the current organization' },
  { id: 'profile',       label: 'Profile',        icon: <User size={16} />,       desc: 'Your account information' },
  { id: 'organizations', label: 'Organizations',   icon: <Building2 size={16} />,  desc: 'Manage your organizations' },
  { id: 'appearance',    label: 'Appearance',      icon: <Monitor size={16} />,    desc: 'Theme and display preferences' },
  { id: 'security',      label: 'Security',        icon: <Shield size={16} />,     desc: 'Password and access settings' },
  { id: 'notifications', label: 'Notifications',   icon: <Bell size={16} />,       desc: 'Alert preferences' },
  { id: 'about',         label: 'About',           icon: <Info size={16} />,       desc: 'Version and changelog' },
]

const ACCENT_COLORS = [
  { name: 'Blue',    value: '#2563eb' },
  { name: 'Violet',  value: '#7c3aed' },
  { name: 'Emerald', value: '#059669' },
  { name: 'Rose',    value: '#e11d48' },
  { name: 'Amber',   value: '#d97706' },
  { name: 'Cyan',    value: '#0891b2' },
]

function inp(err?: string) {
  return `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-sm placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50' : 'border-edge-default focus:border-blue-500'}`
}

function SectionCard({ children }: { children: React.ReactNode }) {
  useLocale()
  return <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden">{children}</div>
}

function SectionHeader({ title, desc, action }: { title: string; desc?: string; action?: React.ReactNode }) {
  useLocale()
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle">
      <div>
        <h3 className="text-sm font-semibold text-ink-primary">{title}</h3>
        {desc && <p className="text-[11px] text-ink-muted mt-0.5">{desc}</p>}
      </div>
      {action}
    </div>
  )
}

function Row({ label, sub, children }: { label: string; sub?: string; children?: React.ReactNode }) {
  useLocale()
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-edge-subtle last:border-0">
      <div>
        <p className="text-xs font-medium text-ink-secondary">{label}</p>
        {sub && <p className="text-[11px] text-ink-muted mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  useLocale()
  return (
    <button onClick={() => onChange(!value)}
      className={`relative inline-flex w-10 h-5 rounded-full border transition-all ${value ? 'bg-blue-500 border-blue-600' : 'bg-navy-600 border-edge-default'}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}

function ConfirmModal({ title, message, confirmLabel, busy, onCancel, onConfirm }: {
  title: string
  message: React.ReactNode
  confirmLabel: string
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  useLocale()
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => !busy && onCancel()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4"><AlertTriangle size={18} className="text-red-400" /></div>
        <h3 className="text-sm font-semibold text-ink-primary text-center mb-1">{title}</h3>
        <p className="text-xs text-ink-muted text-center mb-5">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={busy} className="flex-1 py-2 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs transition-colors border border-edge-default disabled:opacity-40">{tr("Cancel")}</button>
          <button onClick={onConfirm} disabled={busy} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-medium transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
            {busy && <Loader2 size={12} className="animate-spin" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Org edit modal ──────────────────────────────────────────────────────────

function OrgEditModal({ org, onClose, onSave }: {
  org: OrgMembership
  onClose: () => void
  onSave: (data: Omit<Organization, 'id'>) => Promise<void>
}) {
  useLocale()
  const [name, setName] = useState(org.name)
  const [desc, setDesc] = useState(org.description)
  const [color, setColor] = useState(org.color)
  const [submitting, setSubmitting] = useState(false)
  const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d', '#374151']

  const submit = async () => {
    if (!name.trim() || submitting) return
    const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    setSubmitting(true)
    try {
      await onSave({ name: name.trim(), description: desc, color, initials })
      onClose()
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle">
          <h2 className="text-sm font-semibold text-ink-primary">{tr("Edit Organization")}</h2>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Name")}</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inp()} autoFocus disabled={submitting} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Description")}</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} className={inp()} disabled={submitting} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-2">{tr("Color")}</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => !submitting && setColor(c)} className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{ backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent' }}>
                  {color === c && <Check size={10} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-edge-subtle bg-navy-900/40">
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-3.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
          <button onClick={submit} disabled={submitting} className="px-3.5 py-1.5 rounded-lg text-white text-xs font-medium active:scale-95 transition-all disabled:opacity-60 flex items-center gap-1.5" style={{ backgroundColor: color }}>
            {submitting && <Loader2 size={11} className="animate-spin" />}
            {submitting ? tr("Saving…") : tr("Save")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Members modal ────────────────────────────────────────────────────────────

function MembersModal({ org, onClose }: { org: OrgMembership; onClose: () => void }) {
  useLocale()
  const { inviteMember, removeMember, toast } = useApp()
  const { user: currentUser } = useAuth()
  const [members, setMembers] = useState<OrgMember[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgRole>('Member')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const canManage = org.role === 'Owner' || org.role === 'Admin'

  useEffect(() => {
    organizationsApi.getMembers(org.id)
      .then(setMembers)
      .catch(() => toast(tr("Failed to load members"), 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [org.id])

  const handleInvite = async () => {
    if (!email.trim() || inviting) return
    setInviting(true)
    setError(null)
    try {
      const member = await inviteMember(org.id, email.trim(), role)
      setMembers(m => m ? [...m, member] : [member])
      setEmail('')
      toast(tr("{{value1}} added", { value1: member.displayName || member.email }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Failed to add member"))
    } finally {
      setInviting(false)
    }
  }

  const handleRemove = async (userId: string) => {
    setRemovingId(userId)
    try {
      await removeMember(org.id, userId)
      setMembers(m => m?.filter(x => x.userId !== userId) ?? null)
      if (userId === currentUser?.id) onClose()
    } catch {
      // error toast already fired by AppProvider
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{tr("Members —")} {org.name}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{tr("Manage who has access to this organization")}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><X size={14} /></button>
        </div>

        {canManage && (
          <div className="px-5 py-3 border-b border-edge-subtle flex-shrink-0 space-y-2">
            <div className="flex gap-2">
              <input value={email} onChange={e => { setEmail(e.target.value); setError(null) }}
                placeholder={tr("person@company.com")} className={inp()} disabled={inviting}
                onKeyDown={e => { if (e.key === 'Enter') handleInvite() }} />
              <select value={role} onChange={e => setRole(e.target.value as OrgRole)} disabled={inviting}
                className="px-2 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-xs focus:outline-none focus:border-blue-500 disabled:opacity-50">
                <option value="Member">{tr("Member")}</option>
                <option value="Admin">{tr("Admin")}</option>
                <option value="ReadOnly">{tr("Read Only")}</option>
              </select>
              <button onClick={handleInvite} disabled={inviting || !email.trim()}
                className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all disabled:opacity-50 flex items-center gap-1.5 flex-shrink-0">
                {inviting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
              </button>
            </div>
            {error && <p className="text-[11px] text-red-400">{error}</p>}
            <p className="text-[10px] text-ink-muted">{tr("The person must already have an account — this adds them by email, it doesn't send a signup invite.")}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-edge-subtle">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>
          ) : members && members.length > 0 ? (
            members.map(m => {
              const isSelf = m.userId === currentUser?.id
              const isOwner = m.role === 'Owner'
              const canRemoveOthers = canManage && !isOwner && (org.role === 'Owner' || m.role !== 'Admin')
              const showRemove = (isSelf && !isOwner) || (!isSelf && canRemoveOthers)
              return (
                <div key={m.userId} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {(m.displayName || m.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-ink-primary truncate">{m.displayName || m.email}{isSelf ? tr(" (you)") : ''}</p>
                    <p className="text-[10px] text-ink-muted truncate">{m.email}</p>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-navy-700 border border-edge-subtle text-ink-muted flex-shrink-0">{m.customRoleName ?? tr(m.role)}</span>
                  {showRemove && (
                    <button onClick={() => handleRemove(m.userId)} disabled={removingId === m.userId}
                      className="p-1.5 rounded-md text-ink-muted hover:text-red-400 hover:bg-navy-700 transition-colors disabled:opacity-40 flex-shrink-0"
                      title={isSelf ? tr("Leave organization") : tr("Remove member")}>
                      {removingId === m.userId ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  )}
                </div>
              )
            })
          ) : (
            <p className="px-5 py-8 text-center text-xs text-ink-muted">{tr("No members found")}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function ProfileSection() {
  useLocale()
  const { user, updateProfile } = useAuth()
  const { currentOrg } = useApp()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.displayName ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initials = (user?.displayName ?? '?').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      await updateProfile(name.trim())
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Failed to save profile"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionHeader title={tr("Account Information")} desc={tr("Your personal profile details")} action={
          editing ? (
            <div className="flex gap-2">
              <button onClick={() => { setEditing(false); setName(user?.displayName ?? '') }} disabled={saving} className="px-3 py-1.5 rounded-lg bg-navy-700 text-ink-secondary text-xs border border-edge-default hover:bg-navy-600 transition-colors disabled:opacity-40">{tr("Cancel")}</button>
              <button onClick={save} disabled={saving} className="px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all disabled:opacity-60 flex items-center gap-1.5" style={{ boxShadow: '0 1px 8px rgba(37,99,235,0.3)' }}>
                {saving && <Loader2 size={11} className="animate-spin" />}  {tr("Save")} </button>
            </div>
          ) : (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-700 text-ink-secondary text-xs border border-edge-default hover:bg-navy-600 transition-colors">
              <Edit2 size={11} />  {tr("Edit")} </button>
          )
        } />
        <div className="px-5 py-5">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-xl font-semibold text-white flex-shrink-0">{initials}</div>
            <div>
              <p className="text-sm font-semibold text-ink-primary">{user?.displayName}</p>
              <p className="text-xs text-ink-muted">{user?.email}</p>
              {currentOrg && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25 mt-1">{tr(currentOrg.role)} · {currentOrg.name}</span>
              )}
            </div>
            {saved && <span className="flex items-center gap-1 text-xs text-green-400 ml-auto"><CheckCircle2 size={13} />  {tr("Saved")}</span>}
          </div>
          {editing ? (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Full Name")}</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inp()} disabled={saving} />
              </div>
              {error && <p className="text-xs text-red-400">{error}</p>}
              <p className="text-[11px] text-ink-muted">{tr("Email can't be changed here — contact your administrator if it needs to be updated.")}</p>
            </div>
          ) : (
            <div className="space-y-2 text-xs">
              {[['Full Name', user?.displayName ?? '—'], ['Email', user?.email ?? '—']].map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 py-1.5 border-b border-edge-subtle last:border-0">
                  <span className="text-ink-muted w-28 flex-shrink-0">{tr(k ?? '')}</span>
                  <span className="text-ink-secondary">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}

function OrganizationsSection({ navigate }: { navigate: (v: View) => void }) {
  useLocale()
  const { orgs, currentOrg, switchOrg, addOrg, updateOrg, deleteOrg, removeMember, restoreOrg, toast } = useApp()
  const { user: currentUser } = useAuth()
  const [editTarget, setEditTarget] = useState<OrgMembership | null>(null)
  const [membersTarget, setMembersTarget] = useState<OrgMembership | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<OrgMembership | null>(null)
  const [leaveTarget, setLeaveTarget] = useState<OrgMembership | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newColor, setNewColor] = useState('#2563eb')
  const [creating, setCreating] = useState(false)
  const [deletedOrgs, setDeletedOrgs] = useState<OrganizationSummary[] | null>(null)
  const [loadingDeleted, setLoadingDeleted] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d']

  const submitNew = async () => {
    if (!newName.trim() || creating) return
    const initials = newName.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    setCreating(true)
    try {
      await addOrg({ name: newName.trim(), description: newDesc, color: newColor, initials })
      setNewName(''); setNewDesc(''); setAddOpen(false)
    } catch {
      // error toast already fired
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusyId(deleteTarget.id)
    try {
      await deleteOrg(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      // error toast already fired
    } finally {
      setBusyId(null)
    }
  }

  const handleLeave = async () => {
    if (!leaveTarget || !currentUser) return
    setBusyId(leaveTarget.id)
    try {
      await removeMember(leaveTarget.id, currentUser.id)
      toast(tr("Left {{value1}}", { value1: leaveTarget.name }), 'info')
      setLeaveTarget(null)
    } catch {
      // error toast already fired
    } finally {
      setBusyId(null)
    }
  }

  const loadDeleted = async () => {
    setLoadingDeleted(true)
    try {
      setDeletedOrgs(await organizationsApi.getDeleted())
    } catch {
      toast(tr("Failed to load deleted organizations"), 'error')
    } finally {
      setLoadingDeleted(false)
    }
  }

  const handleRestore = async (id: string) => {
    setRestoringId(id)
    try {
      await restoreOrg(id)
      setDeletedOrgs(prev => prev?.filter(o => o.id !== id) ?? null)
    } catch {
      // error toast already fired
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionHeader title={tr("Organizations")} desc={tr("Organizations configured: {{count}}", { count: orgs.length })} action={
          <button onClick={() => setAddOpen(!addOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all" style={{ boxShadow: '0 1px 8px rgba(37,99,235,0.3)' }}>
            <Plus size={11} />  {tr("Add")} </button>
        } />

        {addOpen && (
          <div className="px-5 py-4 border-b border-edge-subtle bg-navy-900/30 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Name *")}</label>
                <input value={newName} onChange={e => setNewName(e.target.value)} placeholder={tr("e.g. Remote Office")} className={inp()} autoFocus disabled={creating} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Description")}</label>
                <input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder={tr("Optional")} className={inp()} disabled={creating} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} onClick={() => !creating && setNewColor(c)} className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                    style={{ backgroundColor: c, borderColor: newColor === c ? '#fff' : 'transparent' }}>
                    {newColor === c && <Check size={9} className="text-white" />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setAddOpen(false)} disabled={creating} className="px-3 py-1.5 rounded-lg bg-navy-700 text-ink-secondary text-xs border border-edge-default hover:bg-navy-600 transition-colors disabled:opacity-40">{tr("Cancel")}</button>
                <button onClick={submitNew} disabled={creating} className="px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all disabled:opacity-60 flex items-center gap-1.5" style={{ backgroundColor: newColor }}>
                  {creating && <Loader2 size={11} className="animate-spin" />}  {tr("Create")} </button>
              </div>
            </div>
          </div>
        )}

        <div className="divide-y divide-edge-subtle">
          {orgs.map(org => {
            const canManage = org.role === 'Owner' || org.role === 'Admin'
            const isOwner = org.role === 'Owner'
            const busy = busyId === org.id
            return (
              <div key={org.id} className={`flex items-center gap-3 px-5 py-4 flex-wrap ${currentOrg?.id === org.id ? 'bg-blue-500/5' : ''}`}>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: org.color }}>{org.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-ink-primary">{org.name}</p>
                    {currentOrg?.id === org.id && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25">{tr("active")}</span>}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-navy-700 text-ink-muted border border-edge-subtle">{tr(org.role)}</span>
                  </div>
                  {org.description && <p className="text-xs text-ink-muted mt-0.5">{org.description}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0 flex-wrap">
                  {currentOrg?.id !== org.id && (
                    <button onClick={() => { switchOrg(org.id); navigate('dashboard'); toast(tr("Switched to {{value1}}", { value1: org.name }), 'info') }}
                      className="px-2.5 py-1.5 rounded-lg bg-navy-700 text-ink-secondary text-xs border border-edge-default hover:bg-navy-600 transition-colors">
                       {tr("Switch")} </button>
                  )}
                  {canManage && (
                    <button onClick={() => setMembersTarget(org)} className="px-2.5 py-1.5 rounded-lg bg-navy-700 text-ink-secondary text-xs border border-edge-default hover:bg-navy-600 transition-colors">
                       {tr("Members")} </button>
                  )}
                  {canManage && (
                    <button onClick={() => setEditTarget(org)} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><Edit2 size={13} /></button>
                  )}
                  {isOwner ? (
                    <button onClick={() => setDeleteTarget(org)} disabled={busy} title={tr("Delete organization")}
                      className="p-1.5 rounded-md text-ink-muted hover:text-red-400 hover:bg-navy-700 transition-colors disabled:opacity-40">
                      <Trash2 size={13} />
                    </button>
                  ) : (
                    <button onClick={() => setLeaveTarget(org)} disabled={busy}
                      className="px-2.5 py-1.5 rounded-lg text-red-400 text-xs border border-red-500/25 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                       {tr("Leave")} </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader title={tr("Deleted Organizations")} desc={tr("Organizations you own that have been deleted can be restored here")} action={
          <button onClick={loadDeleted} disabled={loadingDeleted}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-700 text-ink-secondary text-xs border border-edge-default hover:bg-navy-600 transition-colors disabled:opacity-50">
            {loadingDeleted && <Loader2 size={11} className="animate-spin" />} {deletedOrgs ? tr("Refresh") : tr("Check")}
          </button>
        } />
        {deletedOrgs === null ? (
          <p className="px-5 py-6 text-xs text-ink-muted text-center">{tr("Click \"Check\" to look for deleted organizations you own.")}</p>
        ) : deletedOrgs.length === 0 ? (
          <p className="px-5 py-6 text-xs text-ink-muted text-center">{tr("No deleted organizations found.")}</p>
        ) : (
          <div className="divide-y divide-edge-subtle">
            {deletedOrgs.map(org => (
              <div key={org.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <p className="text-sm text-ink-primary">{org.name}</p>
                <button onClick={() => handleRestore(org.id)} disabled={restoringId === org.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all disabled:opacity-50">
                  {restoringId === org.id && <Loader2 size={11} className="animate-spin" />}  {tr("Restore")} </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {editTarget && (
        <OrgEditModal org={editTarget} onClose={() => setEditTarget(null)} onSave={data => updateOrg(editTarget.id, data)} />
      )}
      {membersTarget && (
        <MembersModal org={membersTarget} onClose={() => setMembersTarget(null)} />
      )}
      {deleteTarget && (
        <ConfirmModal
          title={tr("Delete Organization")}
          message={<>{tr("Delete")} <span className="text-ink-primary font-medium">{deleteTarget.name}</span>{tr("? It will be hidden from everyone, but you can restore it later from this page.")}</>}
          confirmLabel={tr("Delete")}
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
      {leaveTarget && (
        <ConfirmModal
          title={tr("Leave Organization")}
          message={<>{tr("Leave")} <span className="text-ink-primary font-medium">{leaveTarget.name}</span>{tr("? You'll lose access until someone invites you back.")}</>}
          confirmLabel={tr("Leave")}
          busy={busyId === leaveTarget.id}
          onCancel={() => setLeaveTarget(null)}
          onConfirm={handleLeave}
        />
      )}
    </div>
  )
}

function AppearanceSection() {
  useLocale()
  const [theme, setTheme] = useState(getTheme)
  const [accent, setAccent] = useState('#2563eb')
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable')
  const [monoFont, setMonoFont] = useState(true)

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionHeader title={tr("Theme")} desc={tr("Visual appearance settings")} />
        <Row label={tr("Color scheme")} sub={tr("Switch between light and dark mode")}>
          <button onClick={() => setTheme(toggleTheme())}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-700 border border-edge-default text-xs text-ink-secondary hover:border-edge-strong transition-colors">
            {theme === 'dark' ? <Moon size={12} className="text-blue-400" /> : <Sun size={12} className="text-orange-400" />}
            {theme === 'dark' ? tr("Dark") : tr("Light")}
          </button>
        </Row>
        <Row label={tr("Accent color")} sub={tr("Used for active states and buttons (this session only)")}>
          <div className="flex gap-2">
            {ACCENT_COLORS.map(c => (
              <button key={c.value} onClick={() => setAccent(c.value)} title={tr(c.name)}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
                style={{ backgroundColor: c.value, borderColor: accent === c.value ? '#fff' : 'transparent' }}>
                {accent === c.value && <Check size={10} className="text-white" />}
              </button>
            ))}
          </div>
        </Row>
        <Row label={tr("Density")} sub={tr("Controls spacing of lists and tables (this session only)")}>
          <div className="flex rounded-lg overflow-hidden border border-edge-default">
            {(['comfortable', 'compact'] as const).map(d => (
              <button key={d} onClick={() => setDensity(d)}
                className={`px-3 py-1.5 text-xs transition-colors capitalize ${density === d ? 'bg-blue-500 text-white' : 'bg-navy-700 text-ink-secondary hover:bg-navy-600'}`}>
                {tr(d)}
              </button>
            ))}
          </div>
        </Row>
        <Row label={tr("Monospace font for data")} sub={tr("IP addresses, serial numbers, keys (this session only)")}>
          <Toggle value={monoFont} onChange={setMonoFont} />
        </Row>
      </SectionCard>

      <SectionCard>
        <SectionHeader title={tr("Language & Region")} desc={tr("Choose your interface language")} />
        <Row label={tr("Language")}><LanguageSwitcher /></Row>
        <Row label={tr("Date format")}><span className="text-xs text-ink-muted">{tr("YYYY-MM-DD")}</span></Row>
        <Row label={tr("Timezone")}>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Globe size={12} />  {tr("Browser default")} </div>
        </Row>
      </SectionCard>
    </div>
  )
}

function SecuritySection() {
  useLocale()
  const { changePassword } = useAuth()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [saving, setSaving] = useState(false)
  const [pwChanged, setPwChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submitPasswordChange = async () => {
    if (!currentPw || newPw.length < 8 || saving) return
    setSaving(true)
    setError(null)
    try {
      await changePassword(currentPw, newPw)
      setCurrentPw('')
      setNewPw('')
      setPwChanged(true)
      setTimeout(() => setPwChanged(false), 3000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Failed to update password"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionHeader title={tr("Password")} />
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Current Password")}</label>
              <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder={"••••••••"} className={inp()} disabled={saving} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("New Password")}</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder={tr("At least 8 characters")} className={inp()} disabled={saving} minLength={8} />
            </div>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center justify-between">
            {pwChanged && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle2 size={12} />  {tr("Password updated")}</span>}
            <button onClick={submitPasswordChange} disabled={saving || !currentPw || newPw.length < 8}
              className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all disabled:opacity-50">
              {saving ? <Loader2 size={11} className="animate-spin" /> : <Key size={11} />}
              {saving ? tr("Updating…") : tr("Update Password")}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader title={tr("Additional Security")} desc={tr("Not yet available in this deployment")} />
        <Row label={tr("Two-factor authentication")} sub={tr("Not yet supported")}>
          <span className="text-[10px] font-mono text-ink-muted px-2 py-1 rounded bg-navy-700 border border-edge-subtle">{tr("Coming soon")}</span>
        </Row>
        <Row label={tr("Activity audit log")} sub={tr("Not yet supported")}>
          <span className="text-[10px] font-mono text-ink-muted px-2 py-1 rounded bg-navy-700 border border-edge-subtle">{tr("Coming soon")}</span>
        </Row>
        <Row label={tr("IP allowlist")} sub={tr("Not yet supported")}>
          <span className="text-[10px] font-mono text-ink-muted px-2 py-1 rounded bg-navy-700 border border-edge-subtle">{tr("Coming soon")}</span>
        </Row>
      </SectionCard>
    </div>
  )
}

function NotificationsSection() {
  useLocale()
  const [prefs, setPrefs] = useState({
    licenseExpiry: true, assetOffline: true, passwordAudit: false,
    docUpdates: false, loginAlerts: true, weeklyReport: false,
  })
  const toggle = (k: keyof typeof prefs) => setPrefs(p => ({ ...p, [k]: !p[k] }))

  const rows: { key: keyof typeof prefs; label: string; sub: string }[] = [
    { key: 'licenseExpiry', label: 'License expiry alerts', sub: 'Notify 60, 30 and 7 days before' },
    { key: 'assetOffline',  label: 'Asset goes offline',    sub: 'When a monitored asset changes to offline' },
    { key: 'passwordAudit', label: 'Password audit reminders', sub: 'Monthly reminder to rotate old passwords' },
    { key: 'docUpdates',    label: 'Documentation updates', sub: 'When a document is created or edited' },
    { key: 'loginAlerts',   label: 'New login alerts',      sub: 'Email on sign-in from a new device' },
    { key: 'weeklyReport',  label: 'Weekly digest',         sub: 'Summary of activity every Monday' },
  ]

  return (
    <SectionCard>
      <SectionHeader title={tr("Notification Preferences")} desc={tr("Choose what you want to be notified about (not yet persisted)")} />
      {rows.map(r => (
        <Row key={r.key} label={tr(r.label)} sub={tr(r.sub)}>
          <Toggle value={prefs[r.key]} onChange={() => toggle(r.key)} />
        </Row>
      ))}
    </SectionCard>
  )
}

function AboutSection() {
  useLocale()
  return (
    <div className="space-y-4">
      <SectionCard>
        <SectionHeader title={tr("Application")} />
        <div className="px-5 py-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 0 20px rgba(37,99,235,0.4)' }}>
            <Shield size={22} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-primary">{tr("ITDocs")}</p>
            <p className="text-xs text-ink-muted">{tr("IT Documentation Platform")}</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeader title={tr("Danger Zone")} />
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg border border-orange-500/25 bg-orange-500/5">
            <div>
              <p className="text-xs font-medium text-orange-400 flex items-center gap-1.5"><AlertTriangle size={12} />  {tr("Export Data")}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">{tr("Not yet available in this deployment")}</p>
            </div>
            <button disabled className="px-3 py-1.5 rounded-lg border border-orange-500/30 text-orange-400/50 text-xs cursor-not-allowed">{tr("Export")}</button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/25 bg-red-500/5">
            <div>
              <p className="text-xs font-medium text-red-400 flex items-center gap-1.5"><LogOut size={12} />  {tr("Sign Out Everywhere")}</p>
              <p className="text-[11px] text-ink-muted mt-0.5">{tr("Not yet available in this deployment")}</p>
            </div>
            <button disabled className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400/50 text-xs cursor-not-allowed">{tr("Sign out")}</button>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export default function Settings({ navigate }: { navigate: (v: View) => void }) {
  useLocale()
  const { user } = useAuth()
  const isClient = user?.systemRole === 'Client'
  const [active, setActive] = useState<Section>('profile')
  const [mobileSection, setMobileSection] = useState(false)

  const activeSection = SECTIONS.find(s => s.id === active)!

  const content = () => {
    switch (isClient && ['roles', 'organizations'].includes(active) ? 'profile' : active) {
      case 'profile':       return <ProfileSection />
      case 'roles':         return <OrganizationRoles />
      case 'organizations': return <OrganizationsSection navigate={navigate} />
      case 'appearance':    return <AppearanceSection />
      case 'security':      return <SecuritySection />
      case 'notifications': return <NotificationsSection />
      case 'about':         return <AboutSection />
    }
  }

  return (
    <div className="p-4 sm:p-6 max-w-[900px]">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-ink-primary">{tr("Settings")}</h1>
        <p className="text-xs text-ink-muted mt-0.5">{tr("Manage your account, organizations and preferences")}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className={`md:w-52 flex-shrink-0 ${mobileSection ? 'hidden' : ''} md:block`}>
          <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden">
            {SECTIONS.filter(s => !isClient || !['roles', 'organizations'].includes(s.id)).map(s => (
              <button key={s.id}
                onClick={() => { setActive(s.id); setMobileSection(true) }}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm border-b border-edge-subtle last:border-0 transition-colors text-left group
                  ${active === s.id ? 'bg-blue-500/10 text-blue-300' : 'text-ink-secondary hover:text-ink-primary hover:bg-navy-700'}`}>
                <div className="flex items-center gap-3">
                  <span className={active === s.id ? 'text-blue-400' : 'text-ink-muted group-hover:text-ink-secondary'}>{s.icon}</span>
                  <span>{tr(s.label)}</span>
                </div>
                <ChevronRight size={13} className={`transition-transform ${active === s.id ? 'text-blue-400 rotate-90 md:rotate-0' : 'text-ink-muted opacity-0 group-hover:opacity-100'}`} />
              </button>
            ))}
          </div>
        </div>

        <div className={`flex-1 min-w-0 ${!mobileSection ? 'hidden' : ''} md:block`}>
          <button onClick={() => setMobileSection(false)} className="md:hidden flex items-center gap-2 text-xs text-blue-400 mb-3 hover:text-blue-300 transition-colors">
             {tr("← Back to settings")} </button>

          <div className="md:hidden mb-4">
            <h2 className="text-base font-semibold text-ink-primary flex items-center gap-2">
              <span className="text-blue-400">{activeSection.icon}</span> {tr(activeSection.label)}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">{tr(activeSection.desc)}</p>
          </div>

          {content()}
        </div>
      </div>
    </div>
  )
}
