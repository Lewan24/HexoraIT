import { useState } from 'react'
import { AuthProvider } from './context/AuthContext'
import { AppProvider } from './context/AppProvider'
import Login from './components/Login'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import AssetInventory from './components/AssetInventory'
import AssetDetails from './components/AssetDetails'
import PasswordVault from './components/PasswordVault'
import Networks from './components/Networks'
import Licenses from './components/Licenses'
import Contacts from './components/Contacts'
import Contracts from './components/Contracts'
import Plans from './components/Plans'
import IncidentLog from './components/IncidentLog'
import KnowledgeBase from './components/KnowledgeBase'
import Tasks from './components/Tasks'
import Groups from './components/Groups'
import Warranty from './components/Warranty'
import NetworkDiagram from './components/NetworkDiagram'
import Settings from './components/Settings'
import ToastContainer from './components/ui/Toast'
import { useAuth } from './context/useAuth'
import AdminPanel from './components/AdminPanel'
import FileExplorer from './components/FileExplorer'

export type View =
  | 'dashboard' | 'assets' | 'asset-detail' | 'passwords' | 'files'
  | 'networks' | 'licenses' | 'contacts' | 'contracts'
  | 'plans' | 'incidents' | 'knowledge' | 'tasks' | 'settings'
  | 'groups' | 'warranty' | 'diagram' | 'adminpanel'

function AuthenticatedApp() {
  const { logout } = useAuth()
  const [view, setView] = useState<View>('dashboard')
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null)

  const navigate = (v: View, id?: string) => {
    setView(v)
    if (id !== undefined) setSelectedAssetId(id)
  }

  const content = (() => {
    switch (view) {
      case 'dashboard':    return <Dashboard navigate={navigate} />
      case 'assets':       return <AssetInventory navigate={navigate} />
      case 'asset-detail': return <AssetDetails assetId={selectedAssetId} navigate={navigate} />
      case 'passwords':    return <PasswordVault />
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
        {content}
      </Layout>
      <ToastContainer/>
    </AppProvider>
  )
}

function Gate() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950">
        <span className="text-xs font-mono text-ink-muted">loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) return <Login />

  return <AuthenticatedApp />
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}