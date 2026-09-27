import { tr, useLocale } from './i18n'
import { lazy, Suspense, useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppProvider'
import Login from './components/Login'
import Layout from './components/Layout'
import ToastContainer from './components/ui/Toast'
import { useAuth } from './context/useAuth'
import PermissionGate from './components/PermissionGate'

const Dashboard = lazy(() => import('./components/Dashboard'))
const AssetInventory = lazy(() => import('./components/AssetInventory'))
const AssetDetails = lazy(() => import('./components/AssetDetails'))
const PasswordVault = lazy(() => import('./components/PasswordVault'))
const Networks = lazy(() => import('./components/Networks'))
const Licenses = lazy(() => import('./components/Licenses'))
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
  | 'dashboard' | 'assets' | 'asset-detail' | 'passwords' | 'files'
  | 'networks' | 'licenses' | 'contacts' | 'contracts'
  | 'plans' | 'incidents' | 'knowledge' | 'tasks' | 'settings'
  | 'groups' | 'warranty' | 'diagram' | 'adminpanel' | 'private-notes' | 'reports' | 'help'

function AuthenticatedApp() {
  useLocale()
  const { logout, user } = useAuth()
  const [view, setView] = useState<View>(user?.systemRole === 'Client' ? 'reports' : 'dashboard')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  const navigate = (v: View, id?: string) => {
    setView(v)
    if (id !== undefined) setSelectedAssetId(id)
  }

  const content = (() => {
    switch (view) {
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
    <AppProvider>
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
      <ToastContainer/>
    </AppProvider>
  )
}

function Gate() {
  useLocale()
  const { isAuthenticated, isLoading } = useAuth()

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
