import { tr, useLocale } from '../i18n'
import { useState } from 'react'
import { Plus, Search, Network, Globe, Wifi, Server, Shield, Lock, Edit2, Trash2, X, ChevronDown, Dot, Loader2 } from 'lucide-react'
import { useApp } from '../context/useApp'
import type { Subnet, IPEntry, IPEntryStatus, SubnetType } from '../api/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<SubnetType, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  LAN:  { color: 'text-blue-400',   bg: 'bg-blue-500/12 border-blue-500/25',    icon: <Network size={12} />, label: 'LAN' },
  DMZ:  { color: 'text-orange-400', bg: 'bg-orange-500/12 border-orange-500/25', icon: <Shield size={12} />,  label: 'DMZ' },
  WAN:  { color: 'text-cyan-400',   bg: 'bg-cyan-500/12 border-cyan-500/25',    icon: <Globe size={12} />,   label: 'WAN' },
  WLAN: { color: 'text-green-400',  bg: 'bg-green-500/12 border-green-500/25',  icon: <Wifi size={12} />,   label: 'WLAN' },
  MGMT: { color: 'text-purple-400', bg: 'bg-purple-500/12 border-purple-500/25', icon: <Server size={12} />, label: 'MGMT' },
  VPN:  { color: 'text-yellow-400', bg: 'bg-yellow-500/12 border-yellow-500/25', icon: <Lock size={12} />,   label: 'VPN' },
}

const IP_STATUS: Record<IPEntryStatus, { dot: string; badge: string; label: string }> = {
  used:     { dot: 'bg-green-400',  badge: 'bg-green-500/15 text-green-400 border-green-500/30',   label: 'Used' },
  reserved: { dot: 'bg-yellow-400', badge: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', label: 'Reserved' },
  free:     { dot: 'bg-navy-500',   badge: 'bg-navy-600/30 text-ink-muted border-edge-default',    label: 'Free' },
}

function inp(err?: string) {
  return `w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors disabled:opacity-50 ${err ? 'border-red-500/50 focus:border-red-500' : 'border-edge-default focus:border-blue-500'}`
}

// ─── Subnet Modal ─────────────────────────────────────────────────────────────

function SubnetModal({ initial, onClose, onSave }: {
  initial?: Subnet
  onClose: () => void
  onSave: (s: Omit<Subnet, 'id' | 'ips'>) => Promise<void>
}) {
  useLocale()
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    cidr: initial?.cidr ?? '',
    vlan: initial?.vlan != null ? String(initial.vlan) : '',
    type: initial?.type ?? 'LAN' as SubnetType,
    gateway: initial?.gateway ?? '',
    dns: initial?.dns ?? '',
    description: initial?.description ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = tr("Required")
    if (!form.cidr.trim()) e.cidr = tr("Required")
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({ ...form, vlan: form.vlan ? Number(form.vlan) : undefined })
    } catch {
      setSubmitting(false) // stay open, error toast already fired
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-md" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit Subnet") : tr("Add Subnet")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{tr("Define a network segment or VLAN")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Name *")}</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder={tr("Server Farm")} className={inp(errors.name)} autoFocus disabled={submitting} />
              {errors.name && <p className="text-[10px] text-red-400 mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("CIDR *")}</label>
              <input value={form.cidr} onChange={e => set('cidr', e.target.value)} placeholder={"10.0.1.0/24"} className={inp(errors.cidr) + ' font-mono'} disabled={submitting} />
              {errors.cidr && <p className="text-[10px] text-red-400 mt-1">{errors.cidr}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Type")}</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inp()} disabled={submitting}>
                {(Object.keys(TYPE_CONFIG) as SubnetType[]).map(t => <option key={t} value={t}>{tr(TYPE_CONFIG[t].label)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("VLAN ID")}</label>
              <input value={form.vlan} onChange={e => set('vlan', e.target.value)} placeholder={"10"} className={inp() + ' font-mono'} disabled={submitting} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Gateway")}</label>
              <input value={form.gateway} onChange={e => set('gateway', e.target.value)} placeholder={"10.0.1.1"} className={inp() + ' font-mono'} disabled={submitting} />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("DNS")}</label>
              <input value={form.dns} onChange={e => set('dns', e.target.value)} placeholder={"8.8.8.8"} className={inp() + ' font-mono'} disabled={submitting} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Description")}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} className={inp() + ' resize-none'} disabled={submitting} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-edge-subtle bg-navy-900/40">
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
          <button onClick={submit} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5" style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
            {submitting && <Loader2 size={11} className="animate-spin" />}
            {submitting ? tr("Saving…") : initial ? tr("Save Changes") : tr("Add Subnet")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── IP Entry Modal ───────────────────────────────────────────────────────────

function IPModal({ initial, assets, onClose, onSave }: {
  initial?: IPEntry
  assets: { id: string; name: string; ip: string }[]
  onClose: () => void
  onSave: (e: Omit<IPEntry, 'id'>) => Promise<void>
}) {
  useLocale()
  const [form, setForm] = useState<{
    ip: string; label: string; status: IPEntryStatus; assetId: string; notes: string
  }>({
    ip: initial?.ip ?? '',
    label: initial?.label ?? '',
    status: initial?.status ?? 'free',
    assetId: initial?.assetId ?? '',
    notes: initial?.notes ?? '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const set = (k: string, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const submit = async () => {
    const e: Record<string, string> = {}
    if (!form.ip.trim()) e.ip = tr("Required")
    setErrors(e)
    if (Object.keys(e).length || submitting) return
    setSubmitting(true)
    try {
      await onSave({ ip: form.ip.trim(), label: form.label.trim(), status: form.status, assetId: form.assetId || undefined, notes: form.notes.trim() })
    } catch {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-sm" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle">
          <div>
            <h2 className="text-sm font-semibold text-ink-primary">{initial ? tr("Edit IP Entry") : tr("Add IP Entry")}</h2>
            <p className="text-[11px] text-ink-muted mt-0.5">{tr("Assign and document an IP address")}</p>
          </div>
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="p-1.5 rounded-lg text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors disabled:opacity-40"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("IP Address *")}</label>
              <input value={form.ip} onChange={e => set('ip', e.target.value)} placeholder={"10.0.1.10"} className={inp(errors.ip) + ' font-mono'} autoFocus disabled={submitting} />
              {errors.ip && <p className="text-[10px] text-red-400 mt-1">{errors.ip}</p>}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Status")}</label>
              <select value={form.status} onChange={e => set('status', e.target.value)} className={inp()} disabled={submitting}>
                <option value="free">{tr("Free")}</option>
                <option value="used">{tr("Used")}</option>
                <option value="reserved">{tr("Reserved")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Label / Hostname")}</label>
            <input value={form.label} onChange={e => set('label', e.target.value)} placeholder={tr("hostname or plain text")} className={inp() + ' font-mono'} disabled={submitting} />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Assign to Asset")}</label>
            <select value={form.assetId} onChange={e => set('assetId', e.target.value)} className={inp()} disabled={submitting}>
              <option value="">{tr("— None —")}</option>
              {assets.map(a => (
                <option key={a.id} value={a.id}>{a.name} ({a.ip})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">{tr("Notes")}</label>
            <input value={form.notes} onChange={e => set('notes', e.target.value)} placeholder={tr("Optional notes")} className={inp()} disabled={submitting} />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-edge-subtle bg-navy-900/40">
          <button onClick={() => !submitting && onClose()} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-40">{tr("Cancel")}</button>
          <button onClick={submit} disabled={submitting} className="px-4 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-400 text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-60 flex items-center gap-1.5" style={{ boxShadow: '0 1px 10px rgba(37,99,235,0.3)' }}>
            {submitting && <Loader2 size={11} className="animate-spin" />}
            {submitting ? tr("Saving…") : initial ? tr("Save") : tr("Add IP")}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Subnet Row ───────────────────────────────────────────────────────────────

function SubnetRow({ subnet, assets, onEdit, onDelete, onAddIP, onEditIP, onDeleteIP }: {
  subnet: Subnet
  assets: { id: string; name: string; ip: string }[]
  onEdit: () => void
  onDelete: () => void
  onAddIP: (e: Omit<IPEntry, 'id'>) => Promise<void>
  onEditIP: (e: IPEntry) => Promise<void>
  onDeleteIP: (entryId: string) => Promise<void>
}) {
  useLocale()
  const [expanded, setExpanded] = useState(false)
  const [ipModal, setIPModal] = useState<{ open: boolean; initial?: IPEntry }>({ open: false })
  const [deletingIpId, setDeletingIpId] = useState<string | null>(null)
  const tc = TYPE_CONFIG[subnet.type]
  const usedCount = subnet.ips.filter(ip => ip.status === 'used').length
  const reservedCount = subnet.ips.filter(ip => ip.status === 'reserved').length

  const handleDeleteIp = async (entryId: string) => {
    setDeletingIpId(entryId)
    try {
      await onDeleteIP(entryId)
    } finally {
      setDeletingIpId(null)
    }
  }

  return (
    <div className="border border-edge-subtle rounded-xl overflow-hidden bg-navy-800 transition-all">
      {/* Subnet header */}
      <div className="flex items-center gap-3 px-4 py-3.5 hover:bg-navy-750 transition-colors cursor-pointer select-none" onClick={() => setExpanded(!expanded)}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${tc.bg}`}>
          <span className={tc.color}>{tc.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-ink-primary">{subnet.name}</span>
            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md border font-semibold ${tc.bg} ${tc.color}`}>{subnet.type}</span>
            {subnet.vlan != null && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-navy-700 text-ink-muted border border-edge-subtle">{tr("VLAN")} {subnet.vlan}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] font-mono text-ink-muted">{subnet.cidr}</span>
            <span className="text-[10px] text-ink-muted">·</span>
            <span className="text-[10px] text-ink-muted font-mono">{subnet.ips.length}  {tr("IPs")}</span>
            {usedCount > 0 && <span className="text-[10px] text-green-400 font-mono">{usedCount}  {tr("used")}</span>}
            {reservedCount > 0 && <span className="text-[10px] text-yellow-400 font-mono">{reservedCount}  {tr("reserved")}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onEdit} className="p-1.5 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><Edit2 size={13} /></button>
          <button onClick={onDelete} className="p-1.5 rounded-md text-ink-muted hover:text-red-400 hover:bg-navy-700 transition-colors"><Trash2 size={13} /></button>
        </div>
        <span className={`text-ink-muted transition-transform duration-200 ml-1 ${expanded ? '' : '-rotate-90'}`}>
          <ChevronDown size={14} />
        </span>
      </div>

      {/* IP Table */}
      {expanded && (
        <div className="border-t border-edge-subtle">
          {(subnet.gateway || subnet.dns || subnet.description) && (
            <div className="flex items-center gap-4 px-4 py-2.5 bg-navy-900/40 border-b border-edge-subtle flex-wrap">
              {subnet.gateway && <span className="text-[10px] text-ink-muted font-mono">{tr("GW:")} <span className="text-ink-secondary">{subnet.gateway}</span></span>}
              {subnet.dns && <span className="text-[10px] text-ink-muted font-mono">{tr("DNS:")} <span className="text-ink-secondary">{subnet.dns}</span></span>}
              {subnet.description && <span className="text-[10px] text-ink-muted">{subnet.description}</span>}
            </div>
          )}

          {subnet.ips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Dot size={24} className="text-ink-muted opacity-30" />
              <p className="text-xs text-ink-muted">{tr("No IP entries yet")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-edge-subtle bg-navy-900/30">
                    <th className="px-4 py-2.5 text-left font-medium text-ink-muted">{tr("IP Address")}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-ink-muted">{tr("Label / Hostname")}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-ink-muted">{tr("Status")}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-ink-muted">{tr("Asset")}</th>
                    <th className="px-4 py-2.5 text-left font-medium text-ink-muted">{tr("Notes")}</th>
                    <th className="px-4 py-2.5 w-16" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-edge-subtle">
                  {[...subnet.ips].sort((a, b) => {
                    const toNum = (ip: string) => ip.split('.').reduce((acc, oct) => acc * 256 + (parseInt(oct) || 0), 0)
                    return toNum(a.ip) - toNum(b.ip)
                  }).map(entry => {
                    const sc = IP_STATUS[entry.status]
                    const assignedAsset = entry.assetId ? assets.find(a => a.id === entry.assetId) : null
                    const isDeleting = deletingIpId === entry.id
                    return (
                      <tr key={entry.id} className="group hover:bg-navy-700/40 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-ink-primary font-medium">{entry.ip}</td>
                        <td className="px-4 py-2.5 font-mono text-ink-secondary">{entry.label || <span className="text-ink-muted italic">—</span>}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${sc.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                            {tr(sc.label)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {assignedAsset ? (
                            <span className="font-mono text-blue-400 text-[11px]">{assignedAsset.name}</span>
                          ) : (
                            <span className="text-ink-muted italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-ink-muted">{entry.notes || '—'}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">
                            <button onClick={() => setIPModal({ open: true, initial: entry })} disabled={isDeleting}
                              className="p-1 rounded text-ink-muted hover:text-ink-primary hover:bg-navy-600 transition-colors disabled:opacity-40"><Edit2 size={11} /></button>
                            <button onClick={() => handleDeleteIp(entry.id)} disabled={isDeleting}
                              className="p-1 rounded text-ink-muted hover:text-red-400 hover:bg-navy-600 transition-colors disabled:opacity-40">
                              {isDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-3 border-t border-edge-subtle bg-navy-900/30">
            <button onClick={() => setIPModal({ open: true })}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">
              <Plus size={12} />  {tr("Add IP Entry")} </button>
          </div>
        </div>
      )}

      {ipModal.open && (
        <IPModal
          initial={ipModal.initial}
          assets={assets}
          onClose={() => setIPModal({ open: false })}
          onSave={async e => {
            if (ipModal.initial) await onEditIP({ ...ipModal.initial, ...e })
            else await onAddIP(e)
            setIPModal({ open: false })
          }}
        />
      )}
    </div>
  )
}

// ─── Networks ─────────────────────────────────────────────────────────────────

export default function Networks() {
  useLocale()
  const { assets, subnets, isLoading, addSubnet, updateSubnet, deleteSubnet, addIPEntry, updateIPEntry, deleteIPEntry, currentOrg } = useApp()
  const [query, setQuery] = useState('')
  const [subnetModal, setSubnetModal] = useState<{ open: boolean; initial?: Subnet }>({ open: false })
  const [deletingSubnetId, setDeletingSubnetId] = useState<string | null>(null)

  const assetOptions = assets.map(a => ({ id: a.id, name: a.name, ip: a.ip }))

  const filtered = subnets.filter(s =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.cidr.includes(query) ||
    s.type.toLowerCase().includes(query.toLowerCase())
  )

  const totalIPs = subnets.reduce((n, s) => n + s.ips.length, 0)
  const usedIPs = subnets.reduce((n, s) => n + s.ips.filter(ip => ip.status === 'used').length, 0)

  const typeBreakdown = Object.keys(TYPE_CONFIG).map(type => ({
    type: type as SubnetType,
    count: subnets.filter(s => s.type === type).length,
  })).filter(t => t.count > 0)

  const handleDeleteSubnet = async (id: string) => {
    setDeletingSubnetId(id)
    try {
      await deleteSubnet(id)
    } finally {
      setDeletingSubnetId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-[1100px]">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{tr("Networks")}</h1>
          <p className="text-xs text-ink-muted mt-0.5 font-mono">
            {currentOrg ? tr("{{value1}} · ", { value1: currentOrg.name }) : ''}{subnets.length}  {tr("subnet")}{subnets.length !== 1 ? tr("s") : ''} · {totalIPs}  {tr("IPs tracked ·")} {usedIPs}  {tr("in use")} </p>
        </div>
        <button onClick={() => setSubnetModal({ open: true })}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-500 hover:bg-blue-400 active:scale-95 text-white text-sm font-medium transition-all flex-shrink-0"
          style={{ boxShadow: '0 1px 12px rgba(37,99,235,0.3)' }}>
          <Plus size={14} />  {tr("Add Subnet")} </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-navy-800 border border-edge-subtle rounded-xl px-4 py-3">
          <p className="text-xl font-semibold font-mono text-ink-primary">{subnets.length}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{tr("Subnets")}</p>
        </div>
        <div className="bg-navy-800 border border-edge-subtle rounded-xl px-4 py-3">
          <p className="text-xl font-semibold font-mono text-ink-primary">{totalIPs}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{tr("Total IPs")}</p>
        </div>
        <div className="bg-navy-800 border border-edge-subtle rounded-xl px-4 py-3">
          <p className="text-xl font-semibold font-mono text-green-400">{usedIPs}</p>
          <p className="text-xs text-ink-secondary mt-0.5">{tr("In Use")}</p>
        </div>
        <div className="bg-navy-800 border border-edge-subtle rounded-xl px-4 py-3">
          <div className="flex flex-wrap gap-1.5 mt-0.5">
            {typeBreakdown.map(t => {
              const tc = TYPE_CONFIG[t.type]
              return (
                <span key={t.type} className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-md border ${tc.bg} ${tc.color}`}>
                  {t.type} ×{t.count}
                </span>
              )
            })}
            {typeBreakdown.length === 0 && <p className="text-xs text-ink-muted">{tr("No subnets")}</p>}
          </div>
          <p className="text-xs text-ink-secondary mt-1">{tr("Subnet types")}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
        <input value={query} onChange={e => setQuery(e.target.value)}
          placeholder={tr("Search subnets, CIDRs, types…")}
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:border-blue-500 focus:outline-none transition-colors" />
      </div>

      {/* Subnet list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-12 h-12 rounded-xl bg-navy-800 border border-edge-subtle flex items-center justify-center">
            <Network size={20} className="text-ink-muted opacity-50" />
          </div>
          <p className="text-sm text-ink-secondary">
            {query ? tr("No subnets match your search") : tr("No subnets yet")}
          </p>
          {!query && (
            <button onClick={() => setSubnetModal({ open: true })} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
               {tr("Add your first subnet")} </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(subnet => (
            <div key={subnet.id} className={deletingSubnetId === subnet.id ? 'opacity-50 pointer-events-none' : ''}>
              <SubnetRow
                subnet={subnet}
                assets={assetOptions}
                onEdit={() => setSubnetModal({ open: true, initial: subnet })}
                onDelete={() => handleDeleteSubnet(subnet.id)}
                onAddIP={e => addIPEntry(subnet.id, e)}
                onEditIP={e => updateIPEntry(subnet.id, e)}
                onDeleteIP={id => deleteIPEntry(subnet.id, id)}
              />
            </div>
          ))}
        </div>
      )}

      {subnetModal.open && (
        <SubnetModal
          initial={subnetModal.initial}
          onClose={() => setSubnetModal({ open: false })}
          onSave={async data => {
            if (subnetModal.initial) await updateSubnet({ ...subnetModal.initial, ...data })
            else await addSubnet(data)
            setSubnetModal({ open: false })
          }}
        />
      )}
    </div>
  )
}