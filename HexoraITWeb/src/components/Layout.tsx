import { tr, useLocale } from '../i18n'
import { useState, useEffect, useRef, useId } from 'react'
import {
  LayoutDashboard, Server, KeyRound, BookOpen,
  Network, CreditCard, Settings, ChevronLeft, ChevronRight,
  Search, Bell, LogOut, ChevronDown, X, Plus, Check, Building2, Menu,
  Users, FileSignature, Lightbulb, AlertTriangle, CheckSquare,
  ShieldCheck, Layers, Share2, Sun, Moon,
  FolderOpen, BookOpenText, FileText,
} from 'lucide-react'
import type { View } from '../App'
import { useApp } from '../context/useApp'
import { useAuth } from '../context/useAuth'
import RecordOrderButton from './RecordOrderButton'
import OrganizationCreateModal from './OrganizationCreateModal'
import { activeOrganizations, canManageOrganization } from '../lib/organizationLifecycle'
import { toggleTheme, getTheme } from '../lib/theme'
import { buildSearchResults, type SearchResult } from '../lib/search'
import logoHex from '../../public/logo/HexoraIT_HexLogoNoBg.png'
import UpdateDialog from './updateDialog'
import { useVersionCheck } from '../context/useVersionCheck'

type NavSection = { label: string; items: { id: View; label: string; icon: React.ReactNode }[] }

const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Infrastructure',
    items: [
      { id: 'dashboard', label: 'Dashboard',  icon: <LayoutDashboard size={18} /> },
      { id: 'assets',    label: 'Assets',     icon: <Server size={18} /> },
      { id: 'networks',  label: 'Networks',   icon: <Network size={18} /> },
      { id: 'licenses',  label: 'Licenses',   icon: <CreditCard size={18} /> },
      { id: 'files', label: 'Files', icon: <FolderOpen size={18} /> },
    ],
  },
  {
    label: 'Security',
    items: [
      { id: 'passwords', label: 'Passwords', icon: <KeyRound size={18} /> },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'tasks',     label: 'Tasks',      icon: <CheckSquare size={18} /> },
      { id: 'plans',     label: 'Plans',      icon: <Lightbulb size={18} /> },
      { id: 'incidents', label: 'Incidents',  icon: <AlertTriangle size={18} /> },
      { id: 'contracts', label: 'Contracts',  icon: <FileSignature size={18} /> },
    ],
  },
  {
    label: 'Assets & Infra',
    items: [
      { id: 'warranty', label: 'Warranty',    icon: <ShieldCheck size={18} /> },
      { id: 'groups',   label: 'Groups',      icon: <Layers size={18} /> },
      { id: 'diagram',  label: 'Diagram',     icon: <Share2 size={18} /> },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { id: 'knowledge', label: 'Knowledge Base', icon: <BookOpen size={18} /> },
      { id: 'private-notes', label: 'Private notes', icon: <BookOpen size={18} /> },
      { id: 'contacts',  label: 'Contacts',       icon: <Users size={18} /> },
    ],
  }
]

function NavigationSection({ label, active, compact, children, defaultExpanded = false }: {
  label: string; active: boolean; compact: boolean; children: React.ReactNode; defaultExpanded?: boolean
}) {
  const [expanded, setExpanded] = useState(active || defaultExpanded)
  const [wasActive, setWasActive] = useState(active)
  // Reveal a newly selected section, including navigation from search or the dashboard.
  if (active !== wasActive) {
    setWasActive(active)
    if (active) setExpanded(true)
  }
  const id = useId()
  return <section className={`sidebar-section ${active ? 'is-current' : ''}`}>
    {!compact && <button className="sidebar-section-toggle" aria-expanded={expanded}
      aria-controls={id} onClick={() => setExpanded(value => !value)}>
      <span className="flex-1 text-left">{tr(label)}</span>
      {active && <span className="sidebar-section-dot" aria-hidden="true" />}
      <ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
    </button>}
    <div id={id} className="sidebar-section-content" data-expanded={compact || expanded}
      inert={!compact && !expanded}>
      <div className="sidebar-section-inner">{children}</div>
    </div>
  </section>
}

interface Props {
  currentView: View
  navigate: (v: View, targetId?: string) => void
  onLogout: () => void
  children: React.ReactNode
}

// ─── New Org Modal ────────────────────────────────────────────────────────────

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
  useLocale()
  const { orgs, currentOrg, switchOrg, licenses, toast, canRead, hiddenModules } = useApp()
  const { user } = useAuth()
  const compact = collapsed && !isMobile
  const [orgOpen, setOrgOpen] = useState(false)
  const orgTriggerRef = useRef<HTMLButtonElement>(null)
  const [orgDropdownTop, setOrgDropdownTop] = useState(0)
  const toggleOrganizations = () => {
    setOrgDropdownTop((orgTriggerRef.current?.getBoundingClientRect().bottom ?? 160) + 8)
    setOrgOpen(value => !value)
  }
  useEffect(() => {
    if (!orgOpen) return
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOrgOpen(false); orgTriggerRef.current?.focus() }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [orgOpen])
  const [orgModalOpen, setOrgModalOpen] = useState(false)

  const expiring = hiddenModules.includes('licenses') ? 0 : licenses.filter(l => l.status === 'expiring' || l.status === 'expired').length

  const handleNav = (v: View) => {
    navigate(v)
    onClose?.()
  }

  if (!currentOrg || currentOrg.isArchived || currentView === 'home') {
    const showLabels = !collapsed || isMobile
    const globalLinks: { view: View; label: string; icon: React.ReactNode }[] = [
      ...(user?.systemRole === 'Client' ? [] : [{ view: 'home' as View, label: 'Organization hub', icon: <Building2 size={17} /> }]),
      ...(currentOrg && !currentOrg.isArchived ? [{ view: (user?.systemRole === 'Client' ? 'reports' : 'dashboard') as View, label: 'Return to organization', icon: <LayoutDashboard size={17} /> }] : []),
      { view: 'settings', label: 'Settings', icon: <Settings size={17} /> },
      { view: 'help', label: 'User guide', icon: <BookOpenText size={17} /> },
    ]
    return <div className="flex h-full flex-col bg-navy-900">
      <button onClick={() => handleNav(user?.systemRole === 'Client' ? 'reports' : 'home')} aria-label="HexoraIT" className={`flex items-center gap-3 py-5 ${showLabels ? 'px-5' : 'justify-center'}`}><img src={logoHex} alt="" className="h-9 w-9 shrink-0 object-contain" />{showLabels && <span className="text-xl font-semibold tracking-tight text-ink-primary">Hexora<span className="text-blue-400">IT</span></span>}</button>
      {showLabels && <p className="border-y border-edge-subtle px-5 py-4 text-xs font-medium text-ink-secondary">{tr('Your workspace')}</p>}
      <nav className="flex-1 space-y-1 overflow-y-auto p-2">{globalLinks.map(link => <button key={link.view} aria-current={currentView === link.view ? 'page' : undefined} title={tr(link.label)} onClick={() => handleNav(link.view)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${currentView === link.view ? 'bg-blue-500/10 text-ink-link font-semibold' : 'text-ink-secondary hover:bg-navy-700'} ${!showLabels ? 'justify-center' : ''}`}><span className="shrink-0">{link.icon}</span>{showLabels && <span className="truncate">{tr(link.label)}</span>}</button>)}</nav>
      <button onClick={onLogout} title={tr('Sign out')} className={`flex items-center gap-3 border-t border-edge-subtle px-5 py-4 text-sm text-ink-muted hover:text-red-400 ${!showLabels ? 'justify-center px-0' : ''}`}><LogOut size={16} />{showLabels && tr('Sign out')}</button>
      {!isMobile && <button onClick={onToggleCollapse} title={tr(collapsed ? 'Expand' : 'Collapse')} aria-label={tr(collapsed ? 'Expand' : 'Collapse')} className="flex justify-center border-t border-edge-subtle p-3 text-ink-muted hover:text-ink-primary">{collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}</button>}
    </div>
  }

  return (
    <div className="flex flex-col h-full bg-navy-900">
      <div className={`mt-2 flex items-center border-b border-edge-subtle flex-shrink-0 ${collapsed && !isMobile ? 'justify-center px-0' : 'px-4'}`}>
        {isMobile && (
          <button onClick={onClose} aria-label={tr("Close menu")} className="mr-3 p-1 rounded-md text-ink-muted hover:text-ink-primary transition-colors">
            <X size={16} />
          </button>
        )}
      </div>

      <button onClick={() => handleNav(user?.systemRole === 'Client' ? 'reports' : 'home')}
        aria-label="HexoraIT" className={`flex items-center gap-3 py-5 ${collapsed && !isMobile ? 'justify-center' : 'px-5'}`}>
        <img src={logoHex} alt="" className="h-9 w-9 object-contain" />
        {(!collapsed || isMobile) && <span className="text-xl font-semibold tracking-tight text-ink-primary">Hexora<span className="text-blue-400">IT</span></span>}
      </button>

      {user?.systemRole !== 'Client' && <div className="px-3 pb-3">
        <button className={`sidebar-link sidebar-hub ${compact ? 'is-compact' : ''}`}
          aria-label={tr('Organization hub')} title={tr('Organization hub')} onClick={() => handleNav('home')}>
          <Building2 size={20} />{!compact && <span>{tr('Organization hub')}</span>}
        </button>
      </div>}
      {/* Org switcher */}
      {(!collapsed || isMobile) ? (
        <div className="px-3 py-2.5 border-b border-edge-subtle flex-shrink-0">
          <button
            ref={orgTriggerRef} aria-label={tr("Switch Organization")} aria-expanded={orgOpen}
            onClick={e => { e.stopPropagation(); toggleOrganizations() }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-navy-700 transition-colors"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
              style={{ backgroundColor: currentOrg.color }}>{currentOrg.initials}</div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-ink-primary truncate leading-snug">{currentOrg.name}</p>
              <p className="text-xs text-ink-secondary leading-snug">{tr(currentOrg.role)}</p>
            </div>
            <ChevronDown size={12} className={`text-ink-muted transition-transform flex-shrink-0 ${orgOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="flex justify-center py-2.5 border-b border-edge-subtle flex-shrink-0">
          <button className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            ref={orgTriggerRef} aria-label={tr("Switch Organization")} aria-expanded={orgOpen}
            onClick={e => { e.stopPropagation(); toggleOrganizations() }}
            style={{ backgroundColor: currentOrg.color }} title={currentOrg.name}>
            {currentOrg.initials}
          </button>
        </div>
      )}

      <nav aria-label={tr('Main navigation')} className={`sidebar-nav flex-1 min-h-0 overflow-y-auto overflow-x-hidden ${compact ? 'is-compact' : ''}`}>
        {user?.systemRole === 'Client' && <button className="sidebar-link" aria-label={tr('Report a problem')}
          aria-current={currentView === 'reports' ? 'page' : undefined} onClick={() => handleNav('reports')}>
          <AlertTriangle size={18} />{!compact && <span>{tr('Report a problem')}</span>}
        </button>}
        {NAV_SECTIONS.map(section => ({ ...section, items: section.items.filter(item => !(item.id === 'private-notes' && currentOrg.isTemporary) && !hiddenModules.includes(item.id) && (user?.systemRole !== 'Client' || canRead(item.id))) })).filter(section => section.items.length > 0).map(section => (
          <NavigationSection key={section.label} label={section.label} compact={compact}
            active={section.items.some(item => currentView === item.id || (currentView === 'asset-detail' && item.id === 'assets'))}>
            {section.items.map(item => <button key={item.id} onClick={() => handleNav(item.id)}
              title={tr(item.label)} aria-label={tr(item.label)} className="sidebar-link"
              aria-current={currentView === item.id || (currentView === 'asset-detail' && item.id === 'assets') ? 'page' : undefined}>
              {item.icon}{!compact && <><span className="flex-1">{tr(item.label)}</span>
                {item.id === 'licenses' && expiring > 0 && <span className="sidebar-badge">{expiring}</span>}</>}
            </button>)}
          </NavigationSection>
        ))}
        {canManageOrganization(currentOrg) && <NavigationSection label="Organization tools" compact={compact} defaultExpanded
          active={currentView === 'organization-customization' || currentView === 'organization-documentation'}>
          {([{ id: 'organization-customization', label: 'Customize organization', icon: <Settings size={18} /> },
            { id: 'organization-documentation', label: 'Documentation PDF', icon: <FileText size={18} /> }] as const).map(item => (
            <button key={item.id} className="sidebar-link" onClick={() => handleNav(item.id)}
              title={tr(item.label)} aria-label={tr(item.label)} aria-current={currentView === item.id ? 'page' : undefined}>
              {item.icon}{!compact && <span>{tr(item.label)}</span>}
            </button>))}
        </NavigationSection>}
        <NavigationSection label="Preferences and support" compact={compact}
          active={currentView === 'settings' || currentView === 'adminpanel' || currentView === 'help'}>
          <button className="sidebar-link" title={tr('Settings')} aria-label={tr('Settings')}
            aria-current={currentView === 'settings' ? 'page' : undefined} onClick={() => handleNav('settings')}>
            <Settings size={18} />{!compact && <span>{tr('Settings')}</span>}
          </button>
          {user?.systemRole === 'Admin' && <button className="sidebar-link" title={tr('Admin Panel')} aria-label={tr('Admin Panel')}
            aria-current={currentView === 'adminpanel' ? 'page' : undefined} onClick={() => handleNav('adminpanel')}>
            <ShieldCheck size={18} />{!compact && <span>{tr('Admin Panel')}</span>}
          </button>}
        </NavigationSection>
      </nav>

      <div className="border-t border-edge-subtle p-2 flex-shrink-0">
        <button onClick={() => handleNav('help')} title={tr('User guide')} aria-label={tr('User guide')}
          aria-current={currentView === 'help' ? 'page' : undefined}
          className={`w-full flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-sm transition-colors ${collapsed && !isMobile ? 'justify-center' : ''} ${currentView === 'help' ? 'bg-blue-500/10 text-ink-primary' : 'text-ink-secondary hover:bg-navy-700 hover:text-ink-primary'}`}>
          <BookOpenText size={18} className="flex-shrink-0" />
          {(!collapsed || isMobile) && <span>{tr('User guide')}</span>}
        </button>
      </div>

      {/* User footer */}
      {(!collapsed || isMobile) && (
        <div className="border-t border-edge-subtle px-3 py-3 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold text-white flex-shrink-0">
              {(user?.displayName ?? '?').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-ink-primary truncate">{user?.displayName ?? tr('Unknown user')}</p>
              <p className="text-[10px] text-ink-muted truncate">{user?.email ?? ''}</p>
            </div>
            <button onClick={onLogout} className="text-ink-muted hover:text-red-400 transition-colors" title={tr("Sign out")}>
              <LogOut size={13} />
            </button>
          </div>
        </div>
      )}
      {collapsed && !isMobile && (
        <div className="flex justify-center py-3 border-t border-edge-subtle flex-shrink-0">
          <button onClick={onLogout} className="text-ink-muted hover:text-red-400 transition-colors" title={tr("Sign out")}>
            <LogOut size={14} />
          </button>
        </div>
      )}

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <div className={`border-t border-edge-subtle flex-shrink-0 ${collapsed ? 'flex justify-center py-2' : ''}`}>
          <button onClick={onToggleCollapse} aria-label={tr(collapsed ? 'Expand' : 'Collapse')}
            className={`flex items-center gap-1.5 text-ink-muted hover:text-ink-primary transition-colors text-xs py-2 px-3 w-full hover:bg-navy-700 ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <ChevronRight size={14} /> : (<><ChevronLeft size={14} /><span>{tr("Collapse")}</span></>)}
          </button>
        </div>
      )}

      {/* Org dropdown — rendered inside Sidebar, fixed-position so it escapes overflow */}
      {orgOpen && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setOrgOpen(false)} />
          <div className="fixed left-3 z-[60] w-64 max-h-[70vh] overflow-y-auto bg-navy-750 border border-edge-default rounded-xl shadow-2xl"
            style={{ top: orgDropdownTop, maxHeight: `calc(100dvh - ${orgDropdownTop + 16}px)` }}
            onClick={e => e.stopPropagation()}>
            <div className="px-3 py-2 border-b border-edge-subtle">
              <p className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">{tr("Switch Organization")}</p>
            </div>
            {canManageOrganization(currentOrg) && <button onClick={() => { setOrgOpen(false); handleNav('organization-customization') }} className="flex w-full items-center gap-2 border-b border-edge-subtle px-3 py-3 text-xs text-blue-400 hover:bg-navy-700"><Settings size={14} />{tr('Customize organization')}</button>}
            {user?.systemRole !== 'Client' && <button onClick={() => { setOrgOpen(false); handleNav('home') }} className="flex w-full items-center gap-2 border-b border-edge-subtle px-3 py-3 text-xs text-ink-secondary hover:bg-navy-700"><Building2 size={14} />{tr('Organizations and archive')}</button>}
            {activeOrganizations(orgs).map(org => (
              <button key={org.id}
                onClick={() => {
                  switchOrg(org.id)
                  setOrgOpen(false)
                  navigate(user?.systemRole === 'Client' ? 'reports' : 'dashboard')
                  toast(tr("Switched to {{value1}}", { value1: org.name }), 'info')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-navy-700 transition-colors text-left">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white"
                  style={{ backgroundColor: org.color }}>{org.initials}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink-primary truncate">{org.name}</p>
                  {org.description && <p className="text-xs text-ink-secondary truncate">{org.description}</p>}
                </div>
                {org.id === currentOrg.id && <Check size={11} className="text-blue-400 flex-shrink-0" />}
              </button>
            ))}
            <div className="border-t border-edge-subtle">
              <button hidden={user?.systemRole === 'Client'} onClick={() => { setOrgOpen(false); setOrgModalOpen(true) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-ink-muted hover:text-ink-primary hover:bg-navy-700 transition-colors">
                <Plus size={12} />  {tr("New Organization")} </button>
            </div>
          </div>
        </>
      )}

      {orgModalOpen && user?.systemRole !== 'Client' && <OrganizationCreateModal onClose={() => setOrgModalOpen(false)} onCreated={org => { switchOrg(org.id); handleNav('dashboard') }} />}
    </div>
  )
}

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function Layout({ currentView, navigate, onLogout, children }: Props) {
  useLocale()
  const {
    currentOrg, licenses, assets, passwords, contacts, contracts, plans,
    incidents, knowledgeArticles, tasks, groups, warrantyItems, subnets, hiddenModules
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

  const expiring = hiddenModules.includes('licenses') ? 0 : licenses.filter(l => l.status === 'expiring' || l.status === 'expired').length

  const results = buildSearchResults(
    { assets, passwords, contacts, licenses, contracts, plans, incidents, knowledgeArticles, tasks, groups, warrantyItems, subnets },
    searchQuery, tr
  ).filter(result => !hiddenModules.includes(result.view === 'asset-detail' ? 'assets' : result.view))

  // ⌘K / Ctrl+K opens search from anywhere; Escape closes it
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (currentView === 'home') return
        e.preventDefault()
        setSearchOpen(true)
      } else if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchOpen, currentView])

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
    <div className="app-shell flex h-screen bg-navy-950 overflow-hidden font-sans">
      <UpdateDialog
                open={updateAvailable}
                currentVersion={currentVersion}
                latestVersion={latestVersion}
                onClose={closeUpdateDialog}
            />

      {/* Desktop sidebar */}
      <aside
        className="hidden md:block flex-shrink-0 border-r border-edge-subtle transition-[width] duration-200"
        style={{ width: collapsed ? 76 : 292 }}>
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[min(320px,calc(100vw-24px))] border-r border-edge-subtle shadow-2xl"
            style={{ animation: 'slideInLeft 0.2s ease-out' }}>
            <Sidebar {...sidebarProps} isMobile collapsed={false} onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Topbar */}
        <header className="workspace-header h-16 border-b border-edge-subtle bg-navy-900 flex items-center px-3 sm:px-4 gap-2 sm:gap-3 flex-shrink-0">

          {/* Hamburger */}
          <button aria-label={tr("Open menu")} onClick={() => setMobileOpen(true)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors flex-shrink-0">
            <Menu size={18} />
          </button>

          {/* Org badge */}
          {currentOrg && !currentOrg.isArchived && currentView !== 'home' && (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-navy-800 border border-edge-subtle flex-shrink-0">
              <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: currentOrg.color }}>{currentOrg.initials}</div>
              <span className="text-xs text-ink-secondary font-medium hidden lg:block">{currentOrg.name}</span>
              <Building2 size={11} className="text-ink-muted" />
            </div>
          )}

          {/* Search */}
          {currentView !== 'home' && <button onClick={openSearch}
            className="flex items-center gap-2 flex-1 min-w-0 max-w-sm px-3 py-1.5 rounded-lg bg-navy-700 border border-edge-default hover:border-edge-strong text-ink-muted transition-colors">
            <Search size={13} className="flex-shrink-0" />
            <span className="text-xs truncate hidden sm:block">{tr("Search assets, docs…")}</span>
            <span className="ml-auto text-[10px] font-mono bg-navy-600 text-ink-muted px-1.5 py-0.5 rounded border border-edge-default hidden md:block flex-shrink-0">{tr("⌘K")}</span>
          </button>}

          <div className="flex-1" />

          {/* Bell */}
          {currentView !== 'home' && <div className="relative">
            <button onClick={() => setNotifOpen(v => !v)}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors">
              <Bell size={16} />
              {expiring > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500" />}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 bg-navy-750 border border-edge-default rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-edge-subtle">
                  <span className="text-xs font-semibold text-ink-primary">{tr("Notifications")}</span>
                  <button onClick={() => setNotifOpen(false)}><X size={13} className="text-ink-muted" /></button>
                </div>
                {expiring > 0 ? (
                  <div className="px-4 py-3 hover:bg-navy-700 cursor-pointer border-b border-edge-subtle" onClick={() => { navigate('licenses'); setNotifOpen(false) }}>
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full mt-1.5 bg-orange-500 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-ink-primary">{expiring}  {tr("license")}{expiring > 1 ? tr("s") : ''}  {tr("expiring or expired")}</p>
                        <p className="text-[10px] text-ink-muted mt-0.5 font-mono">{currentOrg?.name ?? ''}  {tr("· click to view")}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="px-4 py-4 text-center">
                  <p className="text-[10px] text-ink-muted">{tr("No other notifications")}</p>
                </div>
              </div>
            )}
          </div>}

          {/* Theme toggle */}
          <button
            onClick={() => { const t = toggleTheme(); setThemeState(t) }}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-secondary hover:text-ink-primary hover:bg-navy-700 transition-colors flex-shrink-0"
            title={theme === 'dark' ? tr("Switch to light mode") : tr("Switch to dark mode")}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Mobile logout */}
          <button onClick={onLogout}
            className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-ink-muted hover:text-red-400 hover:bg-navy-700 transition-colors flex-shrink-0"
            title={tr("Sign out")}>
            <LogOut size={15} />
          </button>
        </header>

        <main className="workspace-main flex-1 overflow-y-auto">
          {currentOrg && ['assets', 'passwords', 'networks', 'licenses', 'contacts', 'contracts', 'plans', 'incidents', 'knowledge', 'tasks', 'groups', 'warranty', 'files', 'private-notes', 'diagram'].includes(currentView) && <aside className="flex justify-end px-4 pt-3 sm:px-6"><RecordOrderButton key={`${currentOrg.id}:${currentView}`} resources={currentView === 'tasks' ? ['tasks', 'projects'] : currentView === 'files' ? ['files', 'folders'] : [currentView]} /></aside>}
          {children}
        </main>
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
                placeholder={tr("Search assets, documents, passwords…")}
              />
              <button onClick={() => setSearchOpen(false)}><X size={14} className="text-ink-muted hover:text-ink-primary" /></button>
            </div>
            <div className="p-2 max-h-[60vh] overflow-y-auto">
              {searchQuery.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-xs text-ink-muted">{tr("Type at least 2 characters to search")}</p>
              ) : results.length === 0 ? (
                <p className="px-3 py-8 text-center text-xs text-ink-muted">{tr("No results for \"")}{searchQuery}"</p>
              ) : (
                results.map((r, i) => (
                  <button
                    key={r.id}
                    onClick={() => openResult(r)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${i === activeIndex ? 'bg-navy-700' : 'hover:bg-navy-700/60'}`}
                  >
                    <span className="text-[10px] font-mono bg-navy-600 text-ink-muted px-1.5 py-0.5 rounded flex-shrink-0">{tr(r.type)}</span>
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
