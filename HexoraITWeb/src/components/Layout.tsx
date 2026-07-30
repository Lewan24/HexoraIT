import { useState, useEffect, useRef } from 'react'
import {
  LayoutDashboard, Server, KeyRound, BookOpen,
  Network, CreditCard, Settings, ChevronLeft, ChevronRight,
  Search, Bell, LogOut, ChevronDown, X, Plus, Check, Building2, Menu,
  Users, FileSignature, Lightbulb, AlertTriangle, CheckSquare,
  ShieldCheck, Layers, Share2, Sun, Moon,
  FolderOpen,
} from 'lucide-react'
import type { View } from '../App'
import { useApp } from '../context/useApp'
import { useAuth } from '../context/useAuth'
import type { Organization } from '../api/types'
import { toggleTheme, getTheme } from '../lib/theme'
import { buildSearchResults, type SearchResult } from '../lib/search'
import logo from '../../public/logo/HexoraIT_LogoNoBg.png'
import logoWhite from '../../public/logo/HexoraIT_LogoGray.png'
import logoHex from '../../public/logo/HexoraIT_HexLogoNoBg.png'
import UpdateDialog from './updateDialog'
import { useVersionCheck } from '../context/useVersionCheck'

type NavSection = { label: string; items: { id: View; label: string; icon: React.ReactNode }[] }

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Infrastructure',
    items: [
      { id: 'dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={15} /> },
      { id: 'assets',    label: 'Assets',     icon: <Server size={15} /> },
      { id: 'networks',  label: 'Networks',   icon: <Network size={15} /> },
      { id: 'licenses',  label: 'Licenses',   icon: <CreditCard size={15} /> },
      { id: 'files', label: 'Files', icon: <FolderOpen size={15} /> },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'passwords', label: 'Passwords', icon: <KeyRound size={15} /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'tasks',     label: 'Tasks',      icon: <CheckSquare size={15} /> },
      { id: 'plans',     label: 'Plans',      icon: <Lightbulb size={15} /> },
      { id: 'incidents', label: 'Incidents',  icon: <AlertTriangle size={15} /> },
      { id: 'contracts', label: 'Contracts',  icon: <FileSignature size={15} /> },
    ],
  },
  {
    label: 'Assets & Infra',
    items: [
      { id: 'warranty', label: 'Warranty',    icon: <ShieldCheck size={15} /> },
      { id: 'groups',   label: 'Groups',      icon: <Layers size={15} /> },
      { id: 'diagram',  label: 'Diagram',     icon: <Share2 size={15} /> },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen size={15} /> },
      { id: 'contacts',  label: 'Contacts',       icon: <Users size={15} /> },
    ],
  }
]

interface Props {
  currentView: View
  navigate: (v: View, targetId?: string) => void
  onLogout: () => void
  children: React.ReactNode
}

// ─── New Org Modal ────────────────────────────────────────────────────────────

function OrgModal({ onClose, onAdd }: { onClose: () => void; onAdd: (o: Omit<Organization, 'id'>) => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState('#2563eb')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const COLORS = ['#2563eb', '#7c3aed', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d', '#374151']

  const submit = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    const initials = name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
    setSubmitting(true)
    try {
      await onAdd({ name: name.trim(), description, color, initials })
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-navy-800 border border-edge-strong rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" style={{ animation: 'modalIn 0.18s ease-out' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-edge-subtle">
          <h2 className="text-sm font-semibold text-ink-primary">New Organization</h2>
          <button onClick={onClose} className="p-1 rounded-md text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Name *</label>
            <input value={name} onChange={e => { setName(e.target.value); setError('') }} placeholder="e.g. Branch Office" autoFocus
              className={`w-full px-3 py-2 rounded-lg bg-navy-700 border text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none transition-colors ${error ? 'border-red-500/50' : 'border-edge-default focus:border-blue-500'}`} />
            {error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description"
              className="w-full px-3 py-2 rounded-lg bg-navy-700 border border-edge-default text-ink-primary text-xs placeholder:text-ink-muted focus:outline-none focus:border-blue-500 transition-colors" />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ink-secondary mb-2">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center"
                  style={{ backgroundColor: c, borderColor: color === c ? '#fff' : 'transparent' }}>
                  {color === c && <Check size={10} className="text-white" />}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-edge-subtle bg-navy-900/40">
          <button onClick={onClose} disabled={submitting} className="px-3.5 py-1.5 rounded-lg bg-navy-700 hover:bg-navy-600 text-ink-secondary text-xs border border-edge-default transition-colors disabled:opacity-50">Cancel</button>
          <button onClick={submit} disabled={submitting} className="px-3.5 py-1.5 rounded-lg text-white text-xs font-medium transition-all active:scale-95 disabled:opacity-50" style={{ backgroundColor: color, boxShadow: `0 1px 10px ${color}55` }}>
            {submitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Sidebar({
  currentView, navigate, onLogout, collapsed, onToggleCollapse, isMobile, onClose,
}: {
  currentView: View
  navigate: (v: View) => void
  onLogout: () => void
  collapsed: boolean
  onToggleCollapse: () => void
  isMobile: boolean
  onClose?: () => void
}) {
  const { orgs, currentOrg, switchOrg, licenses, addOrg, toast } = useApp()
  const { user } = useAuth()
  const [orgOpen, setOrgOpen] = useState(false)
  const [orgModalOpen, setOrgModalOpen] = useState(false)

  const expiring = licenses.filter(l => l.status === 'expiring' || l.status === 'expired').length

  const handleNav = (v: View) => {
    navigate(v)
    onClose?.()
  }

  if (!currentOrg) {
    return (
      <div className="flex flex-col h-full bg-navy-900">
        <div className="h-14 flex items-center px-4 border-b border-edge-subtle flex-shrink-0">
          <img src={logo} />
          {/* {(!collapsed || isMobile) && <span className="ml-2.5 font-semibold text-ink-primary text-sm">HexoraIT</span>} */}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-navy-900">
      <div className={`mt-2 flex items-center border-b border-edge-subtle flex-shrink-0 ${collapsed && !isMobile ? 'justify-center px-0' : 'px-4'}`}>
        {isMobile && (
          <button onClick={onClose} className="mr-3 p-1 rounded-md text-ink-muted hover:text-ink-primary transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      {(getTheme() === 'dark') && (
        (!collapsed || isMobile) && (
        <div className='mt-5 flex justify-center cursor-pointer hover:scale-[1.05] transition transition-all duration-300'>
          <img src={logo} width='75%' onClick={() => handleNav('dashboard')} />
        </div>
        )
      )}

      {(getTheme() === 'light') && (
        (!collapsed || isMobile) && (
        <div className='mt-5 flex justify-center cursor-pointer hover:scale-[1.05] transition transition-all duration-300'>
          <img src={logoWhite} width='75%' onClick={() => handleNav('dashboard')} />
        </div>
        )
      )}

      {(collapsed) && (
        <div className='mt-5 flex justify-center cursor-pointer hover:scale-[1.05] transition transition-all duration-300'>
          <img src={logoHex} width='65%' onClick={() => handleNav('dashboard')} />
        </div>
      )}

      {/* Org switcher */}
      {(!collapsed || isMobile) ? (
        <div className="px-3 py-2.5 border-b border-edge-subtle flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); setOrgOpen(v => !v) }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-navy-700 transition-colors"
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
              style={{ backgroundColor: currentOrg.color }}>{currentOrg.initials}</div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs font-medium text-ink-primary truncate leading-tight">{currentOrg.name}</p>
              <p className="text-[9px] text-ink-muted leading-tight">{currentOrg.role}</p>
            </div>
            <ChevronDown size={12} className={`text-ink-muted transition-transform flex-shrink-0 ${orgOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="flex justify-center py-2.5 border-b border-edge-subtle flex-shrink-0">
          <div className="w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white cursor-pointer"
            onClick={e => { e.stopPropagation(); setOrgOpen(v => !v) }}
            style={{ backgroundColor: currentOrg.color }} title={currentOrg.name}>
            {currentOrg.initials}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {NAV_SECTIONS.map((section, si) => (
          <div key={section.label}>
            {si > 0 && <div className="mx-3 my-1.5 border-t border-edge-subtle" />}
            {(!collapsed || isMobile) && (
              <p className="px-4 pt-1.5 pb-0.5 text-[9px] font-semibold text-ink-muted uppercase tracking-widest">{section.label}</p>
            )}
            {section.items.map(item => {
              const active = currentView === item.id
                || (currentView === 'asset-detail' && item.id === 'assets')
              const badge = item.id === 'licenses' ? (expiring || undefined) : undefined
              return (
                <button key={item.id} onClick={() => handleNav(item.id)}
                  title={collapsed && !isMobile ? item.label : undefined}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 mx-1.5 rounded-md text-sm transition-all text-left group
                    ${active ? 'bg-blue-500/10 text-blue-300' : 'text-ink-secondary hover:text-ink-primary hover:bg-navy-700'}`}
                  style={{ width: collapsed && !isMobile ? 36 : 'calc(100% - 12px)' }}>
                  <span className={`flex-shrink-0 ${active ? 'text-blue-400' : 'text-ink-muted group-hover:text-ink-secondary'}`}>{item.icon}</span>
                  {(!collapsed || isMobile) && (
                    <>
                      <span className="flex-1 whitespace-nowrap text-xs">{item.label}</span>
                      {badge != null && <span className="text-[10px] font-mono bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full">{badge}</span>}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        ))}

        <div className="my-1.5 mx-3 border-t border-edge-subtle" />

        <button onClick={() => handleNav('settings')}
          title={collapsed && !isMobile ? 'Settings' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md text-sm transition-all text-left text-ink-secondary hover:text-ink-primary hover:bg-navy-700 group ${currentView === 'settings' ? 'bg-blue-500/10 text-blue-300' : ''}`}
          style={{ width: collapsed && !isMobile ? 36 : 'calc(100% - 12px)' }}>
          <Settings size={16} className="flex-shrink-0 text-ink-muted group-hover:text-ink-secondary" />
          {(!collapsed || isMobile) && <span>Settings</span>}
        </button>
        
        {(user?.systemRole === 'Admin') && (
        <button onClick={() => handleNav('adminpanel')}
          title={collapsed && !isMobile ? 'Admin Panel' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 mx-1.5 rounded-md text-sm transition-all text-left text-ink-secondary hover:text-ink-primary hover:bg-navy-700 group ${currentView === 'settings' ? 'bg-blue-500/10 text-blue-300' : ''}`}
          style={{ width: collapsed && !isMobile ? 36 : 'calc(100% - 12px)' }}>
          <Settings size={16} className="flex-shrink-0 text-ink-muted group-hover:text-ink-secondary" />
          {(!collapsed || isMobile) && <span>Admin Panel</span>}
        </button>)}
      </nav>

      {/* User footer */}
      {(!collapsed || isMobile) && (
        <div className="border-t border-edge-subtle px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {(user?.displayName ?? '?').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-primary truncate">{user?.displayName ?? 'Unknown user'}</p>
              <p className="text-[10px] text-ink-muted truncate">{user?.email ?? ''}</p>
            </div>
            <button onClick={onLogout} className="text-ink-muted hover:text-red-400 transition-colors" title="Sign out">
              <LogOut size={13} />
            </button>
          </div>
        </div>
      )}
      {collapsed && !isMobile && (
        <div className="flex justify-center py-3 border-t border-edge-subtle flex-shrink-0">
          <button onClick={onLogout} className="text-ink-muted hover:text-red-400 transition-colors" title="Sign out">
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <div className={`border-t border-edge-subtle flex-shrink-0 ${collapsed ? 'flex justify-center py-2' : ''}`}>
          <button onClick={onToggleCollapse}
            className={`flex items-center gap-1.5 text-ink-muted hover:text-ink-primary transition-colors text-xs py-2 px-3 w-full hover:bg-navy-700 ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <ChevronRight size={14} /> : (<><ChevronLeft size={14} /><span>Collapse</span></>)}
          </button>
        </div>
      )}

      {/* Org dropdown — rendered inside Sidebar, fixed-position so it escapes overflow */}
      {orgOpen && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOrgOpen(false)} />
          <div className="fixed left-3 z-[60] w-56 bg-navy-750 border border-edge-default rounded-xl shadow-2xl overflow-hidden"
            style={{ top: isMobile ? 120 : 112 }}
            onClick={e => e.stopPropagation()}>
            <div className="px-3 py-2 border-b border-edge-subtle">
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">Switch Organization</p>
            </div>
            {orgs.map(org => (
              <button key={org.id}
                onClick={() => {
                  switchOrg(org.id)
                  setOrgOpen(false)
                  navigate('dashboard')
                  toast(`Switched to ${org.name}`, 'info')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-navy-700 transition-colors text-left">
                <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                  style={{ backgroundColor: org.color }}>{org.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink-primary truncate">{org.name}</p>
                  {org.description && <p className="text-[9px] text-ink-muted truncate">{org.description}</p>}
                </div>
                {org.id === currentOrg.id && <Check size={11} className="text-blue-400 flex-shrink-0" />}
              </button>
            ))}
            <div className="border-t border-edge-subtle">
              <button onClick={() => { setOrgOpen(false); setOrgModalOpen(true) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors">
                <Plus size={12} /> New Organization
              </button>
            </div>
          </div>
        </>
      )}

      {orgModalOpen && <OrgModal onClose={() => setOrgModalOpen(false)} onAdd={addOrg} />}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout({ currentView, navigate, onLogout, children }: Props) {
  const {
    currentOrg, licenses, assets, passwords, contacts, contracts, plans,
    incidents, knowledgeArticles, tasks, groups, warrantyItems, subnets
  } = useApp()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const [theme, setThemeState] = useState(getTheme)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const {
    currentVersion,
    latestVersion,
    updateAvailable,
    closeUpdateDialog
  } = useVersionCheck();

  const expiring = licenses.filter(l => l.status === 'expiring' || l.status === 'expired').length

  const results = buildSearchResults(
    { assets, passwords, contacts, licenses, contracts, plans, incidents, knowledgeArticles, tasks, groups, warrantyItems, subnets },
    searchQuery
  )

  // ⌘K / Ctrl+K opens search from anywhere; Escape closes it
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen])

  const openSearch = () => {
    setSearchQuery('')
    setActiveIndex(0)
    setSearchOpen(true)

    setTimeout(() => searchInputRef.current?.focus(), 0)
  }

  const openResult = (r: SearchResult) => {
    navigate(r.view, r.targetId)
    setSearchOpen(false)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()

      const result = results[activeIndex]

      if (result) {
        openResult(result)
      }
    }
  }

  const sidebarProps = {
    currentView, navigate, onLogout,
    collapsed, onToggleCollapse: () => setCollapsed(v => !v),
    isMobile: false,
  }

  return (
    <div className="flex h-screen bg-navy-950 overflow-hidden font-sans">
      <UpdateDialog
                open={updateAvailable}
                currentVersion={currentVersion}
                latestVersion={latestVersion}
                onClose={closeUpdateDialog}
            />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:block flex-shrink-0 border-r border-edge-subtle transition-all duration-200"
        style={{ width: collapsed ? 60 : 224 }}>
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 border-r border-edge-subtle shadow-2xl"
            style={{ animation: 'slideInLeft 0.2s ease-out' }}>
            <Sidebar {...sidebarProps} isMobile collapsed={false} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="h-14 border-b border-edge-subtle bg-navy-900 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 flex-shrink-0">

          {/* Hamburger */}
          <button onClick={() => setMobileOpen(true)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors flex-shrink-0">
            <Menu size={18} />
          </button>

          {/* Org badge */}
          {currentOrg && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-navy-800 border border-edge-subtle flex-shrink-0">
              <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: currentOrg.color }}>{currentOrg.initials}</div>
              <span className="text-xs text-ink-secondary font-medium hidden lg:block">{currentOrg.name}</span>
              <Building2 size={11} className="text-ink-muted" />
            </div>
          )}

          {/* Search */}
          <button onClick={openSearch}
            className="flex items-center gap-2 flex-1 min-w-0 max-w-sm px-3 py-1.5 rounded-lg bg-navy-700 border border-edge-default hover:border-edge-strong text-ink-muted transition-colors">
            <Search size={13} className="flex-shrink-0" />
            <span className="text-xs truncate hidden sm:block">Search assets, docs…</span>
            <span className="ml-auto text-[10px] font-mono bg-navy-600 text-ink-muted px-1.5 py-0.5 rounded border border-edge-default hidden md:block flex-shrink-0">⌘K</span>
          </button>

          <div className="flex-1" />

          {/* Bell */}
          <div className="relative">
            <button onClick={() => setNotifOpen(v => !v)}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors">
              <Bell size={16} />
              {expiring > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500" />}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 bg-navy-750 border border-edge-default rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-edge-subtle">
                  <span className="text-xs font-semibold text-ink-primary">Notifications</span>
                  <button onClick={() => setNotifOpen(false)}><X size={13} className="text-ink-muted" /></button>
                </div>
                {expiring > 0 ? (
                  <div className="px-4 py-3 hover:bg-navy-700 cursor-pointer border-b border-edge-subtle" onClick={() => { navigate('licenses'); setNotifOpen(false) }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-ink-primary">{expiring} license{expiring > 1 ? 's' : ''} expiring or expired</p>
                        <p className="text-[10px] text-ink-muted mt-0.5 font-mono">{currentOrg?.name ?? ''} · click to view</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="px-4 py-4 text-center">
                  <p className="text-[10px] text-ink-muted">No other notifications</p>
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => { const t = toggleTheme(); setThemeState(t) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors flex-shrink-0"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Mobile logout */}
          <button onClick={onLogout}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-red-400 hover:bg-navy-700 transition-colors flex-shrink-0"
            title="Sign out">
            <LogOut size={15} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-navy-950">{children}</main>
      </div>

      {/* Search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-xl bg-navy-800 border border-edge-strong rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-edge-subtle">
              <Search size={16} className="text-ink-muted flex-shrink-0" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={e => {
                  setSearchQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleSearchKeyDown}
                className="flex-1 bg-transparent text-ink-primary text-sm placeholder:text-ink-muted outline-none"
                placeholder="Search assets, documents, passwords…"
              />
              <button onClick={() => setSearchOpen(false)}><X size={14} className="text-ink-muted hover:text-ink-primary" /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {searchQuery.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-xs text-ink-muted">Type at least 2 characters to search</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-ink-muted">No results for "{searchQuery}"</p>
              ) : (
                results.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => openResult(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${i === activeIndex ? 'bg-navy-700' : 'hover:bg-navy-700/60'}`}
                  >
                    <span className="text-[10px] font-mono bg-navy-600 text-ink-muted px-1.5 py-0.5 rounded flex-shrink-0">{r.type}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-ink-primary truncate">{r.label}</p>
                      <p className="text-[10px] text-ink-muted truncate">{r.sub}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
    </div>
  )
}