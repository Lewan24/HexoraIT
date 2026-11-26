import { ArrowLeft } from 'lucide-react'
import { useApp } from '../context/useApp'
import { useAuth } from '../context/useAuth'
import { tr, useLocale } from '../i18n'
import { MODULE_ID } from '../lib/permissions'
import PermissionGate from './PermissionGate'

export default function AuditStudio({ onBack, onHistory }: { onBack: () => void; onHistory: () => void }) {
  useLocale()
  const { currentOrg, canRead } = useApp()
  const { user } = useAuth()
  const scope = currentOrg && user
    ? new URLSearchParams({ workspace: currentOrg.id, account: user.id, embedded: '1' })
    : null
  const src = scope ? `${import.meta.env.BASE_URL}audit-studio/index.html?${scope}` : null

  return <main className="flex h-dvh w-full flex-col bg-navy-950">
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-edge-subtle bg-navy-900 px-3 py-2 sm:px-4">
      <button type="button" onClick={onBack} className="inline-flex min-h-9 items-center gap-2 rounded-md px-2 text-sm font-medium text-ink-primary hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-blue-400">
        <ArrowLeft size={16} aria-hidden="true" />{tr('Back to HexoraIT')}
      </button>
      {currentOrg && canRead('audit-history', MODULE_ID) && <div className="flex min-w-0 items-center gap-3">
        <span className="hidden truncate text-sm text-ink-muted sm:inline" title={currentOrg.name}>{currentOrg.name}</span>
        <button type="button" onClick={onHistory} className="min-h-9 shrink-0 rounded-md px-2 text-sm text-blue-400 hover:bg-navy-700 focus-visible:outline-2 focus-visible:outline-blue-400">
          {tr('Audit history')}
        </button>
      </div>}
    </header>
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <PermissionGate view="audit-studio">
        {src && <iframe key={src} title="CyberAudit Studio" src={src} className="block min-h-0 w-full flex-1 border-0" />}
      </PermissionGate>
    </div>
  </main>
}
