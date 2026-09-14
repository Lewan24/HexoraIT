import { tr, useLocale } from '../i18n'
import { useState } from 'react'
import {
  Plus, Search, X, Edit2, Trash2, Star, ArrowLeft,
  Phone, Mail, Building2, User, Tag, Copy, Check, Loader2,
} from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Contact } from '../api/types'

const inp = (err?: string) =>
  `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function AvatarCircle({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  useLocale()
  const sz = size === 'lg' ? 'w-14 h-14 text-lg' : size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs'
  return (
    <div className={`${sz} rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-semibold flex-shrink-0`}>
      {initials(name)}
    </div>
  )
}

function CopyBtn({ value }: { value: string }) {
  useLocale()
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded text-ink-muted hover:text-blue-400 transition-colors">
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function ContactModal({ initial, onClose, onSave }: {
  initial?: Contact
  onClose: () => void
  onSave: (c: Omit<Contact, 'id'>) => Promise<void>
}) {
  useLocale()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    company: initial?.company ?? '',
    role: initial?.role ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    description: initial?.description ?? '',
    tags: initial?.tags.join(', ') ?? '',
    starred: initial?.starred ?? false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (k: string, v: string | boolean) => {
    setForm(f => ({ ...f, [k]: v }))
    if (typeof v === 'string') setErrors(e => ({ ...e, [k]: '' }))
  }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = tr("Required")
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({
        name: form.name.trim(),
        company: form.company.trim(),
        role: form.role.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        description: form.description.trim(),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        starred: form.starred,
      })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit Contact") : tr("Add Contact")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{tr("Vendor, partner, or team contact")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Full Name *")}</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={tr("Jane Smith")} className={inp(errors.name)} autoFocus disabled={submitting} />
            {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Company")}</label>
              <input value={form.company} onChange={e => set('company', e.target.value)} placeholder={tr("Acme Corp")} className={inp()} disabled={submitting} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Role / Title")}</label>
              <input value={form.role} onChange={e => set('role', e.target.value)} placeholder={tr("Account Manager")} className={inp()} disabled={submitting} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Phone")}</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder={"+1 555-000-0000"} className={inp()} disabled={submitting} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Email")}</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} placeholder={tr("jane@example.com")} className={inp()} disabled={submitting} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Description / Notes")}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
              placeholder={tr("Context, relationship notes…")} className={inp() + ' resize-none'} disabled={submitting} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Tags (comma-separated)")}</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder={tr("vendor, support, billing")} className={inp()} disabled={submitting} />
          </div>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          <button onClick={() => !submitting && set('starred', !form.starred)} disabled={submitting}
            className={`flex items-center gap-1.5 text-xs transition-colors disabled:opacity-40 ${form.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-ink-secondary'}`}>
            <Star size={13} className={form.starred ? 'fill-yellow-400' : ''} />  {tr("Starred")} </button>
          <div className="flex gap-2">
            <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
            <button onClick={submit} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5"
              style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
              {submitting && <Loader2 size={11} className="animate-spin" />}
              {submitting ? tr("Saving…") : initial ? tr("Save Changes") : tr("Add Contact")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirm({ name, onClose, onConfirm }: { name: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  useLocale()
  const [deleting, setDeleting] = useState(false)
  const handleConfirm = async () => {
    setDeleting(true)
    try {
      await onConfirm()
    } catch {
      setDeleting(false)
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !deleting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-semibold text-ink-primary mb-1">{tr("Delete Contact")}</h3>
        <p className="text-xs text-ink-secondary mb-5">{tr("Are you sure you want to delete")} <span className="text-ink-primary font-medium">{name}</span>{tr("? This cannot be undone.")}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} disabled={deleting} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
          <button onClick={handleConfirm} disabled={deleting} className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5">
            {deleting && <Loader2 size={11} className="animate-spin" />}
            {deleting ? tr("Deleting…") : tr("Delete")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Contact List Item ────────────────────────────────────────────────────────

function ContactItem({ contact, selected, onClick }: { contact: Contact; selected: boolean; onClick: () => void }) {
  useLocale()
  return (
    <button onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-navy-700/50 ${selected ? 'bg-navy-700/70 border-l-2 border-l-blue-500' : 'border-l-2 border-l-transparent'}`}>
      <AvatarCircle name={contact.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {contact.starred && <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />}
          <p className="text-xs font-semibold text-ink-primary truncate">{contact.name}</p>
        </div>
        <p className="text-[11px] text-ink-muted truncate">{contact.company}{contact.role && contact.company ? ' · ' : ''}{contact.role}</p>
        {contact.phone && <p className="text-[10px] text-ink-muted font-mono truncate">{contact.phone}</p>}
      </div>
    </button>
  )
}

// ─── Contact Detail ───────────────────────────────────────────────────────────

function ContactDetail({ contact, onEdit, onDelete, onToggleStar }: {
  contact: Contact
  onEdit: () => void
  onDelete: () => void
  onToggleStar: () => void
}) {
  useLocale()
  return (
    <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden h-full">
      <div className="px-5 py-5 border-b border-edge-subtle">
        <div className="flex items-start gap-3">
          <AvatarCircle name={contact.name} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-primary">{contact.name}</p>
            {contact.role && <p className="text-xs text-ink-secondary mt-0.5">{contact.role}</p>}
            {contact.company && (
              <div className="flex items-center gap-1 mt-1">
                <Building2 size={11} className="text-ink-muted" />
                <p className="text-[11px] text-ink-muted">{contact.company}</p>
              </div>
            )}
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <button onClick={onToggleStar}
              className={`p-1.5 rounded-md transition-colors hover:bg-navy-700 ${contact.starred ? 'text-yellow-400' : 'text-ink-muted hover:text-yellow-400'}`}>
              <Star size={13} className={contact.starred ? 'fill-yellow-400' : ''} />
            </button>
            <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-ink-primary transition-colors"><Edit2 size={13} /></button>
            <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-navy-700 text-ink-muted hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
          </div>
        </div>
      </div>

      <div className="px-5 py-4 space-y-0 divide-y divide-edge-subtle">
        {contact.phone && (
          <div className="flex items-center gap-3 py-2.5">
            <Phone size={13} className="text-ink-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted mb-0.5">{tr("Phone")}</p>
              <p className="text-xs font-mono text-ink-primary">{contact.phone}</p>
            </div>
            <CopyBtn value={contact.phone} />
          </div>
        )}
        {contact.email && (
          <div className="flex items-center gap-3 py-2.5">
            <Mail size={13} className="text-ink-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted mb-0.5">{tr("Email")}</p>
              <p className="text-xs text-blue-400 truncate">{contact.email}</p>
            </div>
            <CopyBtn value={contact.email} />
          </div>
        )}
        {contact.company && (
          <div className="flex items-center gap-3 py-2.5">
            <Building2 size={13} className="text-ink-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted mb-0.5">{tr("Company")}</p>
              <p className="text-xs text-ink-primary">{contact.company}</p>
            </div>
          </div>
        )}
        {contact.role && (
          <div className="flex items-center gap-3 py-2.5">
            <User size={13} className="text-ink-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-ink-muted mb-0.5">{tr("Role")}</p>
              <p className="text-xs text-ink-primary">{contact.role}</p>
            </div>
          </div>
        )}
      </div>

      {contact.tags.length > 0 && (
        <div className="px-5 py-3 border-t border-edge-subtle">
          <div className="flex items-center gap-1.5 mb-2">
            <Tag size={11} className="text-ink-muted" />
            <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">{tr("Tags")}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {contact.tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-navy-700 border border-edge-default text-[10px] text-ink-secondary">{t}</span>
            ))}
          </div>
        </div>
      )}

      {contact.description && (
        <div className="px-5 py-4 border-t border-edge-subtle">
          <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider mb-2">{tr("Notes")}</p>
          <p className="text-xs text-ink-secondary leading-relaxed">{contact.description}</p>
        </div>
      )}
    </div>
  )
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export default function Contacts() {
  useLocale()
  const { contacts, isLoading, addContact, updateContact, deleteContact, toggleStarContact } = useApp()
  const [query, setQuery] = useState('')
  const [starOnly, setStarOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(
    () => contacts[0]?.id ?? null
  )
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; initial?: Contact }>({ open: false })
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null)

  const filtered = contacts.filter(c =>
    (!starOnly || c.starred) &&
    (c.name.toLowerCase().includes(query.toLowerCase()) ||
     c.company.toLowerCase().includes(query.toLowerCase()) ||
     c.email.toLowerCase().includes(query.toLowerCase()) ||
     c.phone.toLowerCase().includes(query.toLowerCase()))
  )

  const effectiveSelectedId = selectedId ?? contacts[0]?.id
  const selected =
    contacts.find(c => c.id === effectiveSelectedId) ?? null

  const handleSave = async (data: Omit<Contact, 'id'>) => {
    if (modal.initial) {
      await updateContact({ ...modal.initial, ...data })
    } else {
      await addContact(data)
    }
    setModal({ open: false })
  }

  const handleDelete = async (c: Contact) => {
    await deleteContact(c.id)
    if (effectiveSelectedId === c.id) setSelectedId(filtered.find(x => x.id !== c.id)?.id ?? null)
    setMobileDetailOpen(false)
    setDeleteTarget(null)
  }

  const selectContact = (c: Contact) => {
    setSelectedId(c.id)
    setMobileDetailOpen(true)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1200px] h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{tr("Contacts")}</h1>
          <p className="text-xs text-ink-muted mt-0.5">{contacts.length}  {tr("contacts stored")}</p>
        </div>
        <button onClick={() => setModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} />  {tr("Add Contact")} </button>
      </div>

      {/* Two-panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 min-h-0">
        {/* List panel */}
        <div className={`lg:col-span-2 bg-navy-800 border border-edge-subtle rounded-xl flex flex-col overflow-hidden ${mobileDetailOpen ? 'hidden lg:flex' : 'flex'}`}>
          {/* Search + filter */}
          <div className="px-4 py-3 border-b border-edge-subtle flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
              <input value={query} onChange={e => setQuery(e.target.value)}
                placeholder={tr("Search contacts…")}
                className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:border-blue-500 focus:outline-none transition-colors" />
            </div>
            <button onClick={() => setStarOnly(!starOnly)}
              className={`p-1.5 rounded-lg border transition-colors ${starOnly ? 'bg-yellow-400/10 border-yellow-400/40 text-yellow-400' : 'border-edge-default text-ink-muted hover:text-ink-primary bg-navy-700'}`}>
              <Star size={13} className={starOnly ? 'fill-yellow-400' : ''} />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-edge-subtle">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <User size={24} className="text-ink-muted opacity-30" />
                <p className="text-sm text-ink-muted">{tr("No contacts found")}</p>
                <button onClick={() => setModal({ open: true })} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">{tr("+ Add Contact")}</button>
              </div>
            ) : (
              filtered.map(c => (
                <ContactItem key={c.id} contact={c} selected={effectiveSelectedId === c.id} onClick={() => selectContact(c)} />
              ))
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div className={`lg:col-span-3 ${mobileDetailOpen ? 'block' : 'hidden lg:block'}`}>
          {mobileDetailOpen && (
            <button onClick={() => setMobileDetailOpen(false)}
              className="lg:hidden flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 mb-3 transition-colors">
              <ArrowLeft size={14} />  {tr("Back to contacts")} </button>
          )}
          {selected ? (
            <ContactDetail
              contact={selected}
              onEdit={() => setModal({ open: true, initial: selected })}
              onDelete={() => setDeleteTarget(selected)}
              onToggleStar={() => toggleStarContact(selected.id)}
            />
          ) : (
            <div className="bg-navy-800 border border-edge-subtle rounded-xl flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center">
                <User size={28} className="text-ink-muted mx-auto mb-2 opacity-30" />
                <p className="text-sm text-ink-muted">{tr("Select a contact to view details")}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {modal.open && <ContactModal initial={modal.initial} onClose={() => setModal({ open: false })} onSave={handleSave} />}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => handleDelete(deleteTarget)}
        />
      )}
    </div>
  )
}