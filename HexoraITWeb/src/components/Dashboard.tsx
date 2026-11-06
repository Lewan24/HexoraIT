import { tr, useLocale, locale } from '../i18n'
import { useEffect, useRef, useState, useCallback } from 'react'
import {
  FileText, CreditCard, ArrowRight, Clock, Star, AlertTriangle, Loader2,
  CheckSquare, Users, FileSignature, CircleAlert, Target, Phone, Server,
  KeyRound, Plus, ShieldCheck, FolderKanban, GripVertical, Settings2,
  RotateCcw, Eye, EyeOff, X,
} from 'lucide-react'

import { useApp } from '../context/useApp'
import { dashboardApi } from '../api/resources'
import type { View } from '../App'
import type { Priority } from '../api/types'

interface Props {
  navigate: (v: View, id?: string) => void
}

const SECTION_TITLES: Record<string, string> = {
  'quick-actions': 'Quick Actions',
  attention: 'Attention',
  'my-tasks': 'My Tasks',
  renewals: 'Upcoming License Renewals',
  warranties: 'Expiring Warranties',
  favorites: 'Favorite Assets',
  'recent-docs': 'Recent Documents',
  roadmap: 'Roadmap',
  contracts: 'Contracts',
  contacts: 'Important Contacts',
  projects: 'Active Projects',
  statistics: 'Statistics',
}

const SECTION_MODULES: Record<string, string> = { 'my-tasks': 'tasks', renewals: 'licenses', warranties: 'warranty', favorites: 'assets', 'recent-docs': 'knowledge', roadmap: 'plans', contracts: 'contracts', contacts: 'contacts', projects: 'projects' }

const FULL_WIDTH = new Set(['quick-actions', 'attention', 'statistics'])

const DEFAULT_ORDER = [
  'quick-actions', 'attention', 'my-tasks', 'renewals', 'warranties',
  'favorites', 'recent-docs', 'projects', 'roadmap', 'contracts', 'contacts', 'statistics',
]

function AnimatedNumber({ value }: { value: number }) {
  useLocale()
  const [display, setDisplay] = useState(0)
  const previous = useRef(0)

  useEffect(() => {
    const start = previous.current
    const end = value
    if (start === end) return
    const duration = 400
    const startTime = performance.now()
    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 2)
      setDisplay(Math.round(start + (end - start) * ease))
      if (progress < 1) requestAnimationFrame(animate)
      else previous.current = end
    }
    requestAnimationFrame(animate)
  }, [value])

  return <>{display}</>
}

function Panel({ title, icon, children, action, dragHandle, footer }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  action?: React.ReactNode
  footer?: React.ReactNode
  dragHandle?: React.ReactNode
}) {
  useLocale()
  return (
    <div className="bg-navy-800 border border-edge-subtle rounded-xl overflow-hidden h-full flex flex-col">
      <div className="px-4 py-3 border-b border-edge-subtle flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary min-w-0">
          {dragHandle}
          {icon}
          <span className="truncate">{title}</span>
        </div>
        {action}
      </div>
      <div className="flex-1">{children}</div>
      {footer}
    </div>
  )
}

function StatusDot({ color }: { color: string }) {
  useLocale()
  return <span className={`w-2 h-2 rounded-full ${color}`} />
}

function PriorityBadge({ priority }: { priority: Priority }) {
  useLocale()
  const styles = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    medium: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    low: 'text-green-400 bg-green-500/10 border-green-500/20',
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border uppercase font-mono ${styles[priority]}`}>
      {tr(priority)}
    </span>
  )
}

function AttentionCard({ icon, title, value, sub, color }: {
  icon: React.ReactNode; title: string; value: number; sub: string; color: string
}) {
  useLocale()
  return (
    <div className="bg-navy-800 border border-edge-subtle rounded-xl p-3">
      <div className="flex justify-between items-center">
        <div className={`w-8 h-8 rounded-lg bg-navy-700 flex items-center justify-center ${color}`}>{icon}</div>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-mono font-semibold text-ink-primary"><AnimatedNumber value={value} /></p>
        <p className="text-xs text-ink-secondary">{title}</p>
        <p className="text-[10px] text-ink-muted">{sub}</p>
      </div>
    </div>
  )
}

function DraggableSection({ id, className, dragging, onDragStart, onDragOver, onDrop, onDragEnd, children }: {
  id: string
  className?: string
  dragging: boolean
  onDragStart: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: () => void
  children: React.ReactNode
}) {
  useLocale()
  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={e => onDragOver(e, id)}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`cursor-grab active:cursor-grabbing transition-opacity ${dragging ? 'opacity-40' : 'opacity-100'} ${className ?? ''}`}
    >
      {children}
    </div>
  )
}

const gripHandle = <GripVertical size={12} className="text-ink-muted flex-shrink-0" />

export default function Dashboard({ navigate }: Props) {
  useLocale()
  const {
    assets, licenses, knowledgeArticles, passwords, currentOrg, tasks,
    contracts, contacts, plans, incidents, warrantyItems, projects, isLoading, hiddenModules, canRead, toast,
  } = useApp()

  const [now, setNow] = useState(Date.now)
  const [maxItems, setMaxItems] = useState(5)
  const layoutOrg = useRef<string | null>(null)
  const [order, setOrder] = useState<string[]>(DEFAULT_ORDER)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragSource = useRef<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!currentOrg) return
    let cancelled = false
    layoutOrg.current = null
    dashboardApi.get(currentOrg.id).then(layout => {
      if (cancelled) return
      layoutOrg.current = currentOrg.id
      setMaxItems(Math.min(10, Math.max(1, layout?.maxItems ?? 5)))
      if (layout) {
        const known = layout.sectionOrder.filter(id => DEFAULT_ORDER.includes(id))
        const missing = DEFAULT_ORDER.filter(id => !known.includes(id))
        setOrder([...known, ...missing])
        setHidden(new Set(layout.hiddenSections.filter(id => DEFAULT_ORDER.includes(id))))
      } else {
        setOrder(DEFAULT_ORDER)
        setHidden(new Set())
      }
    }).catch(() => { if (!cancelled) toast(tr('Failed to load dashboard layout'), 'error') })
    return () => { cancelled = true; if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [currentOrg, toast])

  const persist = useCallback((nextOrder: string[], nextHidden: Set<string>, limit = maxItems) => {
    if (!currentOrg || layoutOrg.current !== currentOrg.id) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      dashboardApi.save(currentOrg.id, { sectionOrder: nextOrder, hiddenSections: Array.from(nextHidden), maxItems: limit }).catch(() => toast(tr("Failed to save dashboard layout"), "error"))
    }, 700)
  }, [currentOrg, maxItems, toast])

  const handleDragStart = (id: string) => {
    dragSource.current = id
    setDraggingId(id)
  }

  const handleDragOver = (e: React.DragEvent, overId: string) => {
    e.preventDefault()
    if (!dragSource.current || dragSource.current === overId) return
    setOrder(prev => {
      const from = prev.indexOf(dragSource.current!)
      const to = prev.indexOf(overId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      next.splice(from, 1)
      next.splice(to, 0, dragSource.current!)
      persist(next, hidden)
      return next
    })
  }

  const handleDrop = (e: React.DragEvent) => e.preventDefault()

  const handleDragEnd = () => {
    dragSource.current = null
    setDraggingId(null)
  }

  const toggleHidden = (id: string) => {
    setHidden(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      persist(order, next)
      return next
    })
  }

  const resetLayout = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setMaxItems(5)
    setOrder(DEFAULT_ORDER)
    setHidden(new Set())
    if (currentOrg) await dashboardApi.reset(currentOrg.id).catch(() => {})
  }

  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-ink-muted" />
      </div>
    )
  }

  const openIncidents = incidents.filter(x => x.status === 'open' || x.status === 'investigating').length
  const openTasks = tasks.filter(x => x.status === 'in-progress')
  const expiringLicenses = licenses.filter(x => x.status === 'expiring' || x.status === 'expired')
  const expiringWarranties = warrantyItems.filter(w => w.status === 'expiring' || w.status === 'expired')
  const expiringContracts = contracts.filter(x => daysUntil(x.endDate) <= 60)
  const favoriteAssets = assets.filter(x => x.starred).slice(0, maxItems)
  const recentDocs = [...knowledgeArticles]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, maxItems)

  function daysUntil(date: string) {
    return Math.max(0, Math.ceil((new Date(date).getTime() - now) / 86400000))
  }

  function planProgress(targetDate: string, createdAt: string) {
    const start = new Date(createdAt).getTime()
    const end = new Date(targetDate).getTime()
    const total = end - start
    const elapsed = now - start
    const progress = (elapsed / total) * 100
    return Math.min(100, Math.max(0, Math.round(progress)))
  }

  const today = new Date().toLocaleDateString(locale(), { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  const sectionCounts: Record<string, number> = { 'my-tasks': openTasks.length, renewals: expiringLicenses.length, warranties: expiringWarranties.length, favorites: assets.filter(a => a.starred).length, 'recent-docs': knowledgeArticles.length, projects: projects.length, roadmap: plans.length, contracts: contracts.length, contacts: contacts.length }
  const moduleVisible = (resource: string) => !hiddenModules.includes(resource) && canRead(resource)
  const renderSection = (id: string): React.ReactNode => {
    const module = SECTION_MODULES[id]
    const total = sectionCounts[id] ?? 0
    const footer = module && <button onClick={() => navigate((module === 'projects' ? 'tasks' : module) as View)} className="mt-auto w-full flex justify-between border-t border-edge-subtle px-4 py-2 text-[11px] text-ink-muted hover:text-blue-400">
      <span>{tr('Showing {{shown}} of {{total}}', { shown: Math.min(total, maxItems), total })}</span><span>{tr('View all')} →</span>
    </button>
    switch (id) {
      case 'quick-actions':
        return (
          <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} dragHandle={gripHandle}>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { resource: 'assets', label: 'Add Asset', icon: <Server size={14} />, action: () => navigate('assets'), color: 'text-blue-400' },
                { resource: 'knowledge', label: 'New Doc', icon: <FileText size={14} />, action: () => navigate('knowledge'), color: 'text-green-400' },
                { resource: 'passwords', label: 'Add Password', icon: <KeyRound size={14} />, action: () => navigate('passwords'), color: 'text-purple-500' },
                { resource: 'licenses', label: 'Add License', icon: <CreditCard size={14} />, action: () => navigate('licenses'), color: 'text-orange-400' },
              ].filter(a => moduleVisible(a.resource)).map((a, i) => (
                <button key={i} onClick={a.action}
                  className="cursor-pointer group flex items-center gap-2 px-3 py-2.5 rounded-lg bg-navy-700 hover:bg-navy-600 border border-edge-subtle hover:border-edge-default transition-all text-xs text-ink-secondary hover:text-ink-primary active:scale-95">
                  <span className={a.color}><Plus size={12} /></span>
                  <span className={`${a.color} flex-shrink-0`}>{a.icon}</span>
                  <span>{tr(a.label)}</span>
                </button>
              ))}
            </div>
          </Panel>
        )

      case 'attention':
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-3 text-ink-muted">
              {gripHandle}
              <h2 className="text-xs uppercase tracking-wide">{tr("Attention")}</h2>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-5 gap-3">
              {[
                { module: 'tasks', icon: <CheckSquare size={16} />, title: 'Open Tasks', value: openTasks.length, sub: 'Need attention', color: 'text-red-400' },
                { module: 'licenses', icon: <CreditCard size={16} />, title: 'Licenses', value: expiringLicenses.length, sub: 'Expiring soon', color: 'text-orange-400' },
                { module: 'warranty', icon: <ShieldCheck size={16} />, title: 'Warranties', value: expiringWarranties.length, sub: 'Expiring soon', color: 'text-cyan-400' },
                { module: 'contracts', icon: <FileSignature size={16} />, title: 'Contracts', value: expiringContracts.length, sub: 'Renewals', color: 'text-yellow-400' },
                { module: 'incidents', icon: <CircleAlert size={16} />, title: 'Open Incidents', value: openIncidents, sub: 'Check status', color: 'text-red-400' },
              ].filter(item => moduleVisible(item.module)).map(item => <button key={item.module} className="text-left" onClick={() => navigate(item.module as View)}>
                <AttentionCard icon={item.icon} title={tr(item.title)} value={item.value} sub={tr(item.sub)} color={item.color} />
              </button>)}
            </div>
          </div>
        )

      case 'my-tasks':
        return (
          <div onClick={() => navigate('tasks')} className="hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-red-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<CheckSquare size={14} className="text-red-400" />} dragHandle={gripHandle}
              action={<button onClick={() => navigate('tasks')} className="text-[10px] text-blue-400 flex items-center gap-1 cursor-pointer">{tr("View all")} <ArrowRight size={10} /></button>}>
              <div className="divide-y divide-edge-subtle">
                {openTasks.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("No open tasks")}</p>}
                {openTasks.slice(0, maxItems).map(task => (
                  <div key={task.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-navy-700/40">
                    <CircleAlert size={14} className="text-red-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink-primary truncate">{task.title}</p>
                      <p className="text-[10px] text-ink-muted">{tr("Due")} {task.dueDate} - <span className='text-red-400'>{tr("Remaining:")} <i>{daysUntil(task.dueDate) === 0 ? tr("OVERDUE") : "" + daysUntil(task.dueDate) + " days"}</i></span></p>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'renewals':
        return (
          <div onClick={() => navigate('licenses')} className="hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<Clock size={14} className="text-orange-400" />} dragHandle={gripHandle}>
              <div className="divide-y divide-edge-subtle">
                {expiringLicenses.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("Nothing expiring soon")}</p>}
                {expiringLicenses.slice(0, maxItems).map(item => (
                  <div key={item.id} className="px-4 py-2.5 flex gap-3 items-center">
                    <AlertTriangle size={13} className="text-orange-400" />
                    <span className="flex-1 text-xs text-ink-secondary truncate">{item.name}</span>
                    <span className="text-[10px] font-mono text-orange-400">{daysUntil(item.expiryDate)}{tr("d")}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'warranties':
        return (
          <div onClick={() => navigate('warranty')} className="hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<ShieldCheck size={14} className="text-cyan-400" />} dragHandle={gripHandle}
              action={<button onClick={() => navigate('warranty')} className="text-[10px] text-blue-400 flex items-center gap-1 cursor-pointer">{tr("All")} <ArrowRight size={10} /></button>}>
              <div className="divide-y divide-edge-subtle">
                {expiringWarranties.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("Nothing expiring soon")}</p>}
                {expiringWarranties.slice(0, maxItems).map(item => (
                  <div key={item.id} className="px-4 py-2.5 flex gap-3 items-center">
                    <AlertTriangle size={13} className="text-cyan-400" />
                    <span className="flex-1 text-xs text-ink-secondary truncate">{item.name}</span>
                    <span className="text-[10px] font-mono text-cyan-400">{daysUntil(item.warrantyEndDate)}{tr("d")}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'favorites':
        return (
          <div className="hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-yellow-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<Star size={14} className="text-yellow-400 fill-yellow-400" />} dragHandle={gripHandle}
              action={<button onClick={() => navigate('assets')} className="text-[10px] text-blue-400 flex items-center gap-1 cursor-pointer">{tr("All")} <ArrowRight size={10} /></button>}>
              <div className="divide-y divide-edge-subtle">
                {favoriteAssets.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("No favorite assets")}</p>}
                {favoriteAssets.map(asset => (
                  <button key={asset.id} onClick={() => navigate('asset-detail', asset.id)}
                    className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-navy-700/40 text-left cursor-pointer">
                    <StatusDot color={asset.status === 'online' ? 'bg-green-400' : 'bg-red-400'} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-ink-primary truncate">{asset.name}</p>
                      <p className="text-[10px] text-ink-muted">{tr(asset.type)}</p>
                    </div>
                    <span className="text-[10px] font-mono text-ink-muted">{tr(asset.status)}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'recent-docs':
        return (
          <div onClick={() => navigate('knowledge')} className="hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<FileText size={14} className="text-green-400" />} dragHandle={gripHandle}
              action={<button onClick={() => navigate('knowledge')} className="text-[10px] text-blue-400 flex gap-1 items-center cursor-pointer">{tr("All")} <ArrowRight size={10} /></button>}>
              <div className="divide-y divide-edge-subtle">
                {recentDocs.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("No documents yet")}</p>}
                {recentDocs.map(doc => (
                  <button key={doc.id} onClick={() => navigate('knowledge')} className="w-full px-4 py-2.5 text-left hover:bg-navy-700/40 cursor-pointer">
                    <p className="text-xs text-ink-primary truncate">{doc.title}</p>
                    <p className="text-[10px] text-ink-muted mt-1">{doc.category}</p>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'projects':
        return (
          <div onClick={() => navigate('tasks')} className="hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<FolderKanban size={14} className="text-blue-400" />} dragHandle={gripHandle}
              action={<button onClick={() => navigate('tasks')} className="text-[10px] text-blue-400 flex gap-1 items-center cursor-pointer">{tr("All")} <ArrowRight size={10} /></button>}>
              <div className="divide-y divide-edge-subtle ">
                {projects.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("No projects yet")}</p>}
                {projects.slice(0, maxItems).map(project => (
                  <button key={project.id} onClick={() => navigate('tasks')} className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-navy-700/40 text-left cursor-pointer">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: project.color }} />
                    <span className="flex-1 text-xs text-ink-primary truncate">{project.name}</span>
                    <span className="text-[10px] font-mono text-ink-muted flex-shrink-0">{project.taskCount}  {tr("tasks")}</span>
                  </button>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'roadmap':
        return (
          <div onClick={() => navigate('plans')} className="cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<Target size={14} className="text-cyan-400" />} dragHandle={gripHandle}>
              <div className="divide-y divide-edge-subtle">
                {plans.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("No plans yet")}</p>}
                {plans.slice(0, maxItems).map(plan => (
                  <div key={plan.id} className="px-4 py-2.5">
                    <div className="flex justify-between mb-2 gap-2">
                      <span className="text-xs text-ink-primary truncate">{plan.title}</span>
                      <span className="text-[10px] font-mono text-cyan-400 flex-shrink-0">{plan.targetDate}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-navy-700 overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${planProgress(plan.targetDate, plan.createdAt)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'contracts':
        return (
          <div onClick={() => navigate('contracts')} className="cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-green-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<FileSignature size={14} className="text-emerald-400" />} dragHandle={gripHandle}>
              <div className="divide-y divide-edge-subtle">
                {contracts.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("No contracts yet")}</p>}
                {contracts.slice(0, maxItems).map(contract => (
                  <div key={contract.id} className="px-4 py-2.5">
                    <p className="text-xs text-ink-primary truncate">{contract.name}</p>
                    <div className="flex justify-between mt-1 gap-2">
                      <span className="text-[10px] text-ink-muted truncate">{contract.vendor}</span>
                      <span className="text-[10px] text-orange-400 font-mono flex-shrink-0">{daysUntil(contract.endDate)}{tr("d")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'contacts':
        return (
          <div onClick={() => navigate('contacts')} className="cursor-pointer hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20 h-full">
            <Panel title={tr(SECTION_TITLES[id]!)} footer={footer} icon={<Users size={14} className="text-indigo-400" />} dragHandle={gripHandle}>
              <div className="divide-y divide-edge-subtle">
                {contacts.length === 0 && <p className="px-5 py-6 text-center text-xs text-ink-muted">{tr("No contacts yet")}</p>}
                {contacts.slice(0, maxItems).map(contact => (
                  <div key={contact.id} className="px-4 py-2.5 flex gap-3 items-center">
                    <div className="w-7 h-7 rounded-full bg-navy-700 flex items-center justify-center flex-shrink-0">
                      <Phone size={12} className="text-indigo-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-ink-primary truncate">{contact.name}</p>
                      <p className="text-[10px] text-ink-muted truncate">{contact.company} · {contact.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )

      case 'statistics':
        return (
          <div>
            <div className="flex items-center gap-1.5 mb-3 text-ink-muted">
              {gripHandle}
              <h2 className="text-xs uppercase tracking-wide">{tr("Statistics")}</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {[
                ['Assets', assets.length, 'assets'],
                ['Passwords', passwords.length, 'passwords'],
                ['Documents', knowledgeArticles.length, 'knowledge'],
                ['Licenses', licenses.length, 'licenses'],
                ['Tasks', openTasks.length, 'tasks'],
                ['Projects', projects.length, 'projects'],
                ['Plans', plans.length, 'plans'],
                ['Contracts', contracts.length, 'contracts'],
                ['Contacts', contacts.length, 'contacts'],
                ['Warranties', warrantyItems.length, 'warranty'],
              ].filter(([, , view]) => moduleVisible(String(view))).map(([label, value, view]) => (
                <div key={label} onClick={() => navigate((view === 'projects' ? 'tasks' : view) as View)}
                  className="bg-navy-800 border border-edge-subtle rounded-xl p-3 text-center cursor-pointer
                  hover:scale-[1.02] transition-all duration-300 hover:shadow-xl hover:shadow-gray-500/20 hover:outline-2 outline-blue-400">
                  <p className="text-xl font-mono text-ink-primary"><AnimatedNumber value={Number(value)} /></p>
                  <p className="text-[14px] text-ink-muted">{tr(String(label))}</p>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const availableOrder = order.filter(id => !SECTION_MODULES[id] || moduleVisible(SECTION_MODULES[id]!))
  const visibleOrder = availableOrder.filter(id => !hidden.has(id))

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-ink-primary">{tr("Dashboard")}</h1>
          <p className="text-xs text-ink-muted font-mono mt-1">{today}{currentOrg && ` · ${currentOrg.name}`}</p>
        </div>

        <div className="relative">
          <button onClick={() => setCustomizeOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 border border-edge-default text-xs text-ink-secondary hover:text-ink-primary hover:border-edge-strong transition-colors">
            <Settings2 size={13} />  {tr("Customize")} </button>
          {customizeOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setCustomizeOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-64 bg-navy-750 border border-edge-default rounded-xl shadow-2xl z-40 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-edge-subtle">
                  <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">{tr("Sections")}</p>
                  <button onClick={() => setCustomizeOpen(false)}><X size={12} className="text-ink-muted hover:text-ink-primary" /></button>
                </div>
                <label className="flex items-center justify-between gap-2 px-4 py-3 text-xs text-ink-secondary">
                  {tr('Items per card')}
                  <select aria-label={tr('Items per card')} value={maxItems} onChange={e => { const limit = Number(e.target.value); setMaxItems(limit); persist(order, hidden, limit) }} className="rounded border border-edge-default bg-navy-800 p-1">
                    {[3, 5, 8, 10].map(limit => <option key={limit} value={limit}>{limit}</option>)}
                  </select>
                </label>
                <div className="max-h-72 overflow-y-auto py-1">
                  {availableOrder.map(id => {
                    const isHidden = hidden.has(id)
                    return (
                      <button key={id} onClick={() => toggleHidden(id)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs hover:bg-navy-700 transition-colors">
                        {isHidden ? <EyeOff size={13} className="text-ink-muted flex-shrink-0" /> : <Eye size={13} className="text-blue-400 flex-shrink-0" />}
                        <span className={isHidden ? 'text-ink-muted' : 'text-ink-secondary'}>{tr(SECTION_TITLES[id] ?? id)}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="border-t border-edge-subtle">
                  <button onClick={resetLayout} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors">
                    <RotateCcw size={12} />  {tr("Reset to default")} </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleOrder.map(id => (
          <DraggableSection
            key={id}
            id={id}
            dragging={draggingId === id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            className={FULL_WIDTH.has(id) ? 'lg:col-span-2 xl:col-span-3' : ''}
          >
            {renderSection(id)}
          </DraggableSection>
        ))}
      </div>
    </div>
  )
}
