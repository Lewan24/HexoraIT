import { tr, useLocale } from '../i18n'
import { useState } from 'react'
import { ArrowLeft, Edit2, Star, MoreHorizontal, Server, MapPin, User, Clock, HardDrive, Network, Tag, FileText, History, Link2, Trash2, X, Loader2 } from 'lucide-react'
import { useApp } from '../context/useApp'
import type { View } from '../App'

interface Props { assetId: string | null; navigate: (v: View) => void }
type Tab = 'overview' | 'history' | 'docs' | 'related'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Server: <Server size={16} className="text-blue-400" />,
  Workstation: <Server size={16} className="text-cyan-400" />,
  Network: <Network size={16} className="text-green-400" />,
  Storage: <HardDrive size={16} className="text-orange-400" />,
}

export default function AssetDetails({ assetId, navigate }: Props) {
  useLocale()
  const { assets, isLoading, updateAsset, deleteAsset, toggleStarAsset } = useApp()
  const asset = assets.find(a => a.id === assetId)

  const [tab, setTab] = useState<Tab>('overview')
  const [moreOpen, setMoreOpen] = useState(false)
  const [editNotes, setEditNotes] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  if (!asset) return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <p className="text-ink-muted text-sm">{tr("Asset not found")}</p>
      <button onClick={() => navigate('assets')} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">{tr("← Back to Assets")}</button>
    </div>
  )

  const STATUS_STYLES: Record<string, string> = {
    online: 'bg-green-500/15 text-green-400 border-green-500/30',
    offline: 'bg-red-500/15 text-red-400 border-red-500/30',
    maintenance: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    unknown: 'bg-navy-500/20 text-ink-muted border-edge-default',
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    try {
      await updateAsset({ ...asset, notes })
      setEditNotes(false)
    } finally {
      setSavingNotes(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteAsset(asset.id)
      navigate('assets')
    } catch {
      setDeleting(false)
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Server size={13} /> },
    { id: 'history', label: 'History', icon: <History size={13} /> },
    { id: 'docs', label: 'Documentation', icon: <FileText size={13} /> },
    { id: 'related', label: 'Related Items', icon: <Link2 size={13} /> },
  ]

  return (
    <div className="p-6 max-w-[1100px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-ink-muted mb-5 font-mono">
        <button onClick={() => navigate('assets')} className="flex items-center gap-1 hover:text-ink-primary transition-colors">
          <ArrowLeft size={12} />  {tr("Assets")} </button>
        <span>/</span>
        <span className="text-ink-secondary">{asset.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy-700 border border-edge-default flex items-center justify-center flex-shrink-0">
            {TYPE_ICONS[asset.type] ?? <Server size={22} className="text-blue-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold font-mono text-ink-primary">{asset.name}</h1>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border ${STATUS_STYLES[asset.status]}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${asset.status === 'online' ? 'bg-green-400 animate-pulse' : asset.status === 'offline' ? 'bg-red-400' : 'bg-orange-400'}`} />
                {tr(asset.status)}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono border bg-blue-500/15 text-blue-300 border-blue-500/30">{tr(asset.type)}</span>
            </div>
            <p className="text-xs text-ink-muted mt-1 font-mono">{asset.ip} · {asset.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={() => toggleStarAsset(asset.id)}
            className={`p-2 rounded-lg border transition-all ${asset.starred ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' : 'bg-navy-800 border-edge-default text-ink-muted hover:text-yellow-400 hover:border-yellow-500/30'}`}>
            <Star size={15} fill={asset.starred ? 'currentColor' : 'none'} />
          </button>
          <button onClick={() => navigate('assets')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-navy-800 border border-edge-default text-ink-secondary text-xs hover:border-edge-strong transition-colors">
            <Edit2 size={13} />  {tr("Edit")} </button>
          <div className="relative">
            <button onClick={() => setMoreOpen(!moreOpen)} className="p-2 rounded-lg bg-navy-800 border border-edge-default text-ink-muted hover:text-ink-primary transition-colors">
              <MoreHorizontal size={15} />
            </button>
            {moreOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)} />
                <div className="absolute right-0 top-10 w-44 bg-navy-750 border border-edge-default rounded-xl shadow-2xl z-50 overflow-hidden" style={{ background: '#141d2b' }}>
                  {[
                    { label: 'Duplicate', icon: <FileText size={12} /> },
                    { label: 'Export JSON', icon: <FileText size={12} /> },
                    { label: 'View history', icon: <History size={12} /> },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setMoreOpen(false)} className="w-full px-4 py-2.5 text-left text-xs text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors flex items-center gap-2">
                      <span className="text-ink-muted">{item.icon}</span> {tr(item.label)}
                    </button>
                  ))}
                  <div className="border-t border-edge-subtle" />
                  <button onClick={() => { setMoreOpen(false); setConfirmDelete(true) }} className="w-full px-4 py-2.5 text-left text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2">
                    <Trash2 size={12} />  {tr("Delete asset")} </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-edge-subtle mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs border-b-2 transition-all -mb-px ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-ink-muted hover:text-ink-secondary'}`}>
            {t.icon} {tr(t.label)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            {/* General info */}
            <InfoCard title={tr("General Information")} icon={<Server size={14} className="text-blue-400" />}>
              <InfoRow icon={<MapPin size={12} />} label={tr("Location")} value={asset.location} />
              <InfoRow icon={<User size={12} />} label={tr("Owner")} value={asset.owner} />
              {asset.serial && <InfoRow icon={<Tag size={12} />} label={tr("Serial")} value={asset.serial} mono />}
              <InfoRow icon={<Clock size={12} />} label={tr("Last Updated")} value={asset.updated} />
            </InfoCard>

            {/* Technical details */}
            <InfoCard title={tr("Network")} icon={<Network size={14} className="text-cyan-400" />}>
              <InfoRow icon={<Network size={12} />} label={tr("IP Address")} value={asset.ip} mono />
              <InfoRow icon={<Network size={12} />} label={tr("Type")} value={tr(asset.type)} />
              <InfoRow icon={<Server size={12} />} label={tr("Status")} value={tr(asset.status)} />
            </InfoCard>

            {/* Notes — editable */}
            <div className="bg-navy-800 border border-edge-subtle rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-ink-primary flex items-center gap-2">
                  <FileText size={13} className="text-green-400" />  {tr("Notes")} </h3>
                {!editNotes ? (
                  <button onClick={() => { setNotes(asset.notes); setEditNotes(true) }} className="text-[10px] text-ink-link hover:text-blue-300 transition-colors flex items-center gap-1">
                    <Edit2 size={10} />  {tr("Edit")} </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setEditNotes(false)} disabled={savingNotes} className="text-[10px] text-ink-muted hover:text-ink-primary transition-colors flex items-center gap-1 disabled:opacity-40"><X size={10} />  {tr("Cancel")}</button>
                    <button onClick={saveNotes} disabled={savingNotes} className="text-[10px] text-green-400 hover:text-green-300 transition-colors font-medium flex items-center gap-1 disabled:opacity-60">
                      {savingNotes && <Loader2 size={10} className="animate-spin" />}
                      {savingNotes ? tr("Saving…") : tr("Save")}
                    </button>
                  </div>
                )}
              </div>
              {editNotes ? (
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} disabled={savingNotes}
                  className="w-full px-3 py-2.5 rounded-lg bg-navy-700 border border-edge-default text-ink-secondary text-xs leading-relaxed focus:border-blue-500 focus:outline-none resize-none transition-colors disabled:opacity-60" />
              ) : (
                <p className="text-xs text-ink-secondary leading-relaxed">
                  {asset.notes || <span className="text-ink-muted italic">{tr("No notes yet. Click Edit to add some.")}</span>}
                </p>
              )}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            <InfoCard title={tr("Status")} icon={<Server size={14} className="text-green-400" />}>
              <div className="space-y-3">
                {[
                  { label: 'Status', value: tr(asset.status), ok: asset.status === 'online' },
                  { label: 'Last Updated', value: asset.updated, ok: true },
                ].map((s, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-xs text-ink-muted">{tr(s.label)}</span>
                    <span className={`text-xs font-mono capitalize ${s.ok && s.label === 'Status' ? 'text-green-400' : s.label === 'Status' ? 'text-red-400' : 'text-ink-secondary'}`}>{s.value}</span>
                  </div>
                ))}
              </div>
            </InfoCard>

            <InfoCard title={tr("Tags")} icon={<Tag size={14} className="text-purple-500" />}>
              {asset.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {asset.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-md bg-navy-700 text-[11px] text-ink-secondary font-mono border border-edge-subtle">{tag}</span>
                  ))}
                </div>
              ) : <p className="text-xs text-ink-muted">{tr("No tags")}</p>}
            </InfoCard>

            <InfoCard title={tr("Related Assets")} icon={<Link2 size={14} className="text-cyan-400" />}>
              <div className="space-y-2">
                {assets.filter(a => a.id !== asset.id && a.type === 'Network').slice(0, 3).map((r, i) => (
                  <button key={i} onClick={() => navigate('asset-detail')} className="w-full flex items-center gap-2 text-[11px] hover:text-blue-300 transition-colors text-left">
                    <span className="text-ink-muted">→</span>
                    <span className="text-ink-link font-mono">{r.name}</span>
                    <span className="text-ink-muted ml-auto">{tr(r.type)}</span>
                  </button>
                ))}
              </div>
            </InfoCard>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden">
          <div className="px-5 py-8 text-center">
            <History size={20} className="text-ink-muted mx-auto mb-2 opacity-40" />
            <p className="text-xs text-ink-muted">{tr("Activity history isn't tracked yet.")}</p>
            <p className="text-[10px] text-ink-muted mt-1">{tr("This asset was last updated")} {asset.updated}.</p>
          </div>
        </div>
      )}

      {tab === 'docs' && (
        <div className="px-5 py-12 text-center">
          <FileText size={20} className="text-ink-muted mx-auto mb-2 opacity-40" />
          <p className="text-xs text-ink-muted">{tr("No documentation linked to this asset yet.")}</p>
          <button onClick={() => navigate('knowledge')} className="text-[10px] text-blue-400 hover:text-blue-300 mt-2 transition-colors">{tr("Browse knowledge base →")}</button>
        </div>
      )}

      {tab === 'related' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {assets.filter(a => a.id !== asset.id).length === 0 ? (
            <p className="text-xs text-ink-muted col-span-full text-center py-8">{tr("No other assets to relate.")}</p>
          ) : assets.filter(a => a.id !== asset.id).slice(0, 6).map((r, i) => (
            <button key={i} onClick={() => navigate('asset-detail')} className="bg-navy-800 border border-edge-subtle rounded-xl p-4 hover:border-edge-default transition-colors text-left">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-sm text-ink-link">{r.name}</span>
                <span className="text-[10px] bg-navy-700 text-ink-muted px-1.5 py-0.5 rounded border border-edge-subtle">{tr(r.type)}</span>
              </div>
              <p className="text-xs text-ink-muted">{r.location}</p>
            </button>
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => !deleting && setConfirmDelete(false)}>
          <div className="relative bg-navy-800 border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-sm p-6" style={{ animation: 'modalIn 0.15s ease-out' }} onClick={e => e.stopPropagation()}>
            <style>{"@keyframes modalIn { from { opacity:0; transform:scale(0.95) translateY(4px); } to { opacity:1; transform:scale(1) translateY(0); } }"}</style>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4"><Trash2 size={18} className="text-red-400" /></div>
            <h3 className="text-sm font-semibold text-ink-primary text-center mb-1">{tr("Delete Asset")}</h3>
            <p className="text-xs text-ink-muted text-center mb-5">{tr("Delete")} <span className="text-ink-primary font-mono">{asset.name}</span>{tr("? This cannot be undone.")}</p>
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

function InfoCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  useLocale()
  return (
    <div className="bg-navy-800 border border-edge-subtle rounded-xl p-5">
      <h3 className="text-xs font-semibold text-ink-primary mb-4 flex items-center gap-2">{icon} {title}</h3>
      {children}
    </div>
  )
}

function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string; mono?: boolean }) {
  useLocale()
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-edge-subtle last:border-0">
      <span className="text-ink-muted mt-0.5 flex-shrink-0">{icon}</span>
      <span className="text-xs text-ink-muted w-24 flex-shrink-0">{label}</span>
      <span className={`text-xs text-ink-secondary ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  )
}