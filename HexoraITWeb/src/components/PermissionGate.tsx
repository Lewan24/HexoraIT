import { tr, useLocale } from '../i18n'
import type { ReactNode } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useApp } from '../context/useApp'
import type { View } from '../App'
import { useAuth } from '../context/useAuth'

export default function PermissionGate({ view, children }: { view: View; children: ReactNode }) {
  useLocale()
  const { user } = useAuth()
  const isClient = user?.systemRole === 'Client'
  const { access, accessError, canRead, canWrite, currentOrg, isLoading } = useApp()
  // Static application help is available independently of organization access.
  if (view === 'help') return children
  if (view === 'settings' && isClient) return children
  if (view === 'adminpanel' && user?.systemRole === 'Admin' || (!currentOrg && view === 'settings')) return children
  if (isClient && ['dashboard', 'private-notes', 'adminpanel'].includes(view)) return <p className="p-6">{tr('Access forbidden')}</p>
  if (!currentOrg) return <div className="p-6 text-ink-muted">{isClient ? tr('No organization is assigned. Contact your caretaker.') : tr("Select or create an organization in Settings.")}</div>
  if (accessError) return <div role="alert" className="p-6 text-red-400">{accessError}</div>
  if (!access) return <div className="p-6 text-ink-muted">{tr("Loading organization permissions…")}</div>
  if (view === 'reports' && isClient) return children
  if (view === 'private-notes') return children
  const resource = view === 'asset-detail' ? 'assets' : view
  if (!canRead(resource)) {
    return (
      <div role="alert" className="p-8 flex flex-col items-center gap-3 text-center text-ink-secondary">
        <ShieldAlert size={32} className="text-orange-400" />
        <h1 className="text-lg font-semibold text-ink-primary">{tr("Access forbidden")}</h1>
        <p>{tr("Your organization role does not allow access to this section. Contact an organization administrator.")}</p>
      </div>
    )
  }
  if (isLoading) return <div className="p-6 text-ink-muted">{tr("Loading organization data…")}</div>
  const hasIndividualWrite = access.permissions.some(p => p.resource === resource && p.canRead && p.canWrite)
  return <>{!canWrite(resource) && <p className="px-6 pt-3 text-xs text-ink-muted">{hasIndividualWrite ? tr("Changes are allowed only for individually authorized resources. Creating new resources is disabled.") : tr("Read-only access. Your role does not permit changes.")}</p>}{children}</>
}
