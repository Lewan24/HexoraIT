import { auditApi } from './api/audit'
import { tr, useLocale } from './i18n'
import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppProvider'
import Login from './components/Login'
import Layout from './components/Layout'
import ToastContainer from './components/ui/Toast'
import { useAuth } from './context/useAuth'
import { useApp } from './context/useApp'
import PermissionGate from './components/PermissionGate'
import ItemContextMenu from './components/ui/ItemContextMenu'
import type { ContextResource } from './components/ui/contextItems'

const AuditStudio = lazy(() => import('./components/AuditStudio'))
const OrganizationAuditHistory = lazy(() => import('./components/OrganizationAuditHistory'))
const OrganizationDocumentation = lazy(() => import('./components/OrganizationDocumentation'))
const OrganizationHub = lazy(() => import('./components/OrganizationHub'))
const OrganizationCustomization = lazy(() => import('./components/OrganizationCustomization'))
const Dashboard = lazy(() => import('./components/Dashboard'))
const AssetInventory = lazy(() => import('./components/AssetInventory'))
const AssetDetails = lazy(() => import('./components/AssetDetails'))
const PasswordVault = lazy(() => import('./components/PasswordVault'))
const Networks = lazy(() => import('./components/Networks'))
const Licenses = lazy(() => import('./components/Licenses'))
const Operations = lazy(() => import('./components/Operations'))
const Contacts = lazy(() => import('./components/Contacts'))
const Contracts = lazy(() => import('./components/Contracts'))
const Plans = lazy(() => import('./components/Plans'))
const IncidentLog = lazy(() => import('./components/IncidentLog'))
const KnowledgeBase = lazy(() => import('./components/KnowledgeBase'))
const Tasks = lazy(() => import('./components/Tasks'))
const Groups = lazy(() => import('./components/Groups'))
const Warranty = lazy(() => import('./components/Warranty'))
const NetworkDiagram = lazy(() => import('./components/NetworkDiagram'))
const Settings = lazy(() => import('./components/Settings'))
const AdminPanel = lazy(() => import('./components/AdminPanel'))
const FileExplorer = lazy(() => import('./components/FileExplorer'))
const PrivateNotes = lazy(() => import('./components/PrivateNotes'))
const ClientReports = lazy(() => import('./components/ClientReports'))
const UserGuide = lazy(() => import('./components/UserGuide'))

export type View =
  | 'home' | 'audit-studio' | 'audit-history' | 'organization-documentation' | 'organization-customization' | 'dashboard' | 'assets' | 'asset-detail' | 'passwords' | 'files'
  | 'networks' | 'licenses' | 'contacts' | 'contracts' | 'operations'
  | 'plans' | 'incidents' | 'knowledge' | 'tasks' | 'settings'
  | 'groups' | 'warranty' | 'diagram' | 'adminpanel' | 'private-notes' | 'reports' | 'help'

const AUDIT_PATH = `${import.meta.env.BASE_URL}audyt`
const isAuditPath = (path: string) => path === AUDIT_PATH || path === AUDIT_PATH + '/'

function AuthenticatedApp() {
  useLocale()
  const { logout, user } = useAuth()
  const [view, setView] = useState<View>(user?.systemRole === 'Client' ? 'reports' : 'home')
  const [auditPage, setAuditPage] = useState<'unopened' | 'active' | 'retained'>(() =>
    isAuditPath(window.location.pathname) ? 'active' : 'unopened')
  const returningFromAudit = useRef(false)
  const inAudit = auditPage === 'active'
  const activeView = inAudit ? 'audit-studio' : view
  const draftRequest = useRef(0)
  const [operationDraft, setOperationDraft] = useState<{ organizationId: string; resources: ContextResource[]; request: number }>()
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  useEffect(() => {
    const syncAuditPath = () => {
      returningFromAudit.current = false
      setAuditPage(previous => isAuditPath(window.location.pathname) ? 'active' : previous === 'unopened' ? 'unopened' : 'retained')
    }
    window.addEventListener('popstate', syncAuditPath)
    return () => window.removeEventListener('popstate', syncAuditPath)
  }, [])

  const leaveAudit = () => {
    if (returningFromAudit.current) return
    if (window.history.state?.enteredFromHexora) {
      returningFromAudit.current = true
      window.history.back()
    } else {
      window.history.replaceState(null, '', import.meta.env.BASE_URL)
      setAuditPage('retained')
    }
  }

  const navigate = (v: View, id?: string) => {
    if (v === 'audit-studio') {
      if (!isAuditPath(window.location.pathname)) {
        auditApi.report('navigation', AUDIT_PATH)
        window.history.pushState({ enteredFromHexora: true }, '', AUDIT_PATH)
        setAuditPage('active')
      }
      return
    }
    auditApi.report('navigation', '/' + v)
    setOperationDraft(undefined)
    if (inAudit) leaveAudit()
    setView(v)
    if (id !== undefined) setSelectedAssetId(id)
  }

  const content = (() => {
    switch (view) {
      case 'home': return <OrganizationHub navigate={navigate} />
      case 'audit-history': return <OrganizationAuditHistory onStudio={() => navigate('audit-studio')} />
      case 'organization-documentation': return <OrganizationDocumentation />
      case 'organization-customization': return <div className="mx-auto max-w-4xl p-4 sm:p-6"><OrganizationCustomization onExport={() => navigate('organization-documentation')} /></div>
      case 'help': return <UserGuide />
      case 'reports': return <ClientReports />
      case 'dashboard':    return <Dashboard navigate={navigate} />
      case 'assets':       return <AssetInventory navigate={navigate} />
      case 'asset-detail': return <AssetDetails assetId={selectedAssetId} navigate={navigate} />
      case 'passwords':    return <PasswordVault />
      case 'private-notes': return <PrivateNotes />
      case 'files': return <FileExplorer />
      case 'networks':     return <Networks />
      case 'licenses':     return <Licenses />
      case 'operations':   return <Operations draft={operationDraft} />
      case 'contacts':     return <Contacts />
      case 'contracts':    return <Contracts />
      case 'plans':        return <Plans />
      case 'incidents':    return <IncidentLog />
      case 'knowledge':    return <KnowledgeBase />
      case 'tasks':        return <Tasks />
      case 'groups':       return <Groups />
      case 'warranty':     return <Warranty />
      case 'diagram':      return <NetworkDiagram />
      case 'settings':     return <Settings navigate={navigate} />
      case 'adminpanel':   return <AdminPanel />
      default:             return null
    }
  })()

  return (
    <AppProvider loadOrganizationData={['dashboard', 'assets', 'asset-detail', 'passwords', 'networks', 'licenses', 'contacts', 'contracts', 'plans', 'incidents', 'knowledge', 'tasks', 'groups', 'warranty', 'diagram', 'operations'].includes(activeView)}>
      <OrganizationLifecycleRedirect view={activeView} navigate={navigate} />
      {/* Keep Studio mounted on return so pending local saves can finish. */}
      {auditPage !== 'unopened' && <div hidden={!inAudit}>
        <Suspense fallback={(
          <div className="flex h-dvh items-center justify-center bg-navy-950">
            <span className="text-xs font-mono text-ink-muted">{tr('loading...')}</span>
          </div>
        )}>
          <AuditStudio onBack={leaveAudit} onHistory={() => navigate('audit-history')} />
        </Suspense>
      </div>}
      {!inAudit && <ItemContextMenu onCreate={(organizationId, resources) => {
        navigate('operations')
        setOperationDraft({ organizationId, resources, request: ++draftRequest.current })
      }}>
        <Layout currentView={view} navigate={navigate} onLogout={logout}>
          <PermissionGate view={view}>
            <Suspense fallback={(
              <div className="flex min-h-64 items-center justify-center">
                <span className="text-xs font-mono text-ink-muted">{tr('loading...')}</span>
              </div>
            )}>
              {content}
            </Suspense>
          </PermissionGate>
        </Layout>
      </ItemContextMenu>}
      <ToastContainer/>
    </AppProvider>
  )
}

function OrganizationLifecycleRedirect({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  const { currentOrg } = useApp()
  const { user } = useAuth()
  useEffect(() => {
    if (currentOrg?.isArchived && !['home', 'settings', 'help', 'adminpanel'].includes(view) && user?.systemRole !== 'Client') navigate('home')
  }, [currentOrg?.isArchived, view, user?.systemRole, navigate])
  return null
}

function Gate() {
  useLocale()
  const { isAuthenticated, isLoading } = useAuth()
  useEffect(() => {
    const path = window.location.pathname
    if (path !== '/' && !isAuditPath(path)) {
      const probe = /\/(?:\.env|\.git|wp-admin|wp-login|phpmyadmin|actuator|server-status)|\.\.%2f|\.\.\//i.test(path)
      auditApi.report(probe ? 'security_probe' : 'client_not_found', path)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <span className="text-xs font-mono text-ink-muted">{tr("loading...")}</span>
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return <AuthenticatedApp />
}

export default function App() {
  useLocale()
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
