import { useState } from 'react'
import { useApp } from '../context/useApp'
import { organizationsApi } from '../api/resources'
import OrganizationModules from './OrganizationModules'
import OrganizationArchiveButton from './OrganizationArchiveButton'
import { tr, useLocale } from '../i18n'

export default function OrganizationCustomization({ onArchived, onExport }: { onArchived?: () => void; onExport?: () => void } = {}) {
  useLocale()
  const { currentOrg, hiddenModules } = useApp()
  if (!currentOrg || !['Owner', 'Admin'].includes(currentOrg.role)) return <p role="alert">{tr('Only organization owners and administrators can customize the organization.')}</p>
  return <div className="space-y-4">
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-edge-default bg-navy-800 p-5">
      <div><h1 className="text-lg font-semibold text-ink-primary">{currentOrg.name}</h1><p className="mt-1 text-xs text-ink-muted">{tr(currentOrg.isTemporary ? 'Temporary engagement' : 'Permanent organization')}</p></div>
      <div className="flex flex-wrap items-center gap-2">{onExport && <button onClick={onExport} className="rounded-lg border border-edge-default px-3 py-2 text-xs text-blue-400">{tr("Documentation PDF")}</button>}<OrganizationArchiveButton org={currentOrg} onChanged={onArchived} /></div>
    </section>
    <CustomizationEditor key={currentOrg.id + JSON.stringify(hiddenModules)} orgId={currentOrg.id} initial={hiddenModules} />
  </div>
}

function CustomizationEditor({ orgId, initial }: { orgId: string; initial: string[] }) {
  const { toast } = useApp()
  const [hidden, setHidden] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async () => {
    setSaving(true)
    setError('')
    try {
      await organizationsApi.saveCustomization(orgId, hidden)
      window.dispatchEvent(new Event('organization-access-changed'))
      toast(tr('Organization customization saved'))
    } catch (error) {
      setError(error instanceof Error ? error.message : tr('Failed to save organization customization'))
    } finally { setSaving(false) }
  }
  return <section className="rounded-xl border border-edge-default bg-navy-800 p-5 space-y-4">
    <div><h2 className="font-semibold text-ink-primary">{tr('Customize organization')}</h2>
      <p className="mt-2 text-sm text-ink-muted">{tr('Choose modules visible to all organization members in navigation and on the dashboard. Data and role permissions are preserved.')}</p></div>
    <OrganizationModules hidden={hidden} onChange={setHidden} disabled={saving} />
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    <button disabled={saving} onClick={save} className="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white disabled:opacity-50">{tr(saving ? 'Saving…' : 'Save')}</button>
  </section>
}
