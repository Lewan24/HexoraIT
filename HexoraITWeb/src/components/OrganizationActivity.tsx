import { Download, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { organizationActivityApi, type OrganizationActivityPage } from '../api/resources'
import { locale, tr, useLocale } from '../i18n'

const button = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-edge-default px-3 py-1.5 text-xs text-ink-secondary hover:bg-navy-700 disabled:opacity-40'

export default function OrganizationActivity({ organizationId, name }: { organizationId: string; name: string }) {
  useLocale()
  const language = locale()
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [result, setResult] = useState<OrganizationActivityPage>()
  const [retentionDraft, setRetentionDraft] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [operationError, setOperationError] = useState<'save' | 'export' | null>(null)
  const [working, setWorking] = useState<'save' | 'export' | null>(null)
  const [saved, setSaved] = useState(false)
  const loading = !result && !loadError

  useEffect(() => {
    let active = true
    organizationActivityApi.getPage(organizationId, page).then(data => {
      if (!active) return
      setResult(data)
      setLoadError(false)
    }).catch(() => { if (active) setLoadError(true) })
    return () => { active = false }
  }, [organizationId, page, refresh])

  const loadPage = (target: number) => {
    setLoadError(false)
    setResult(undefined)
    setPage(target)
    setRefresh(current => current + 1)
  }

  const retention = retentionDraft ?? (result ? String(result.retentionDays) : '')
  const days = Number(retention)
  const validRetention = Number.isInteger(days) && days >= 1 && days <= 365

  const saveRetention = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validRetention || working || !result || days === result.retentionDays) return
    setWorking('save')
    setOperationError(null)
    setSaved(false)
    try {
      await organizationActivityApi.saveSettings(organizationId, days)
      setRetentionDraft(null)
      setSaved(true)
      loadPage(1)
    } catch {
      setOperationError('save')
    } finally {
      setWorking(null)
    }
  }

  const exportActivity = async () => {
    if (working) return
    setWorking('export')
    setOperationError(null)
    try {
      const blob = await organizationActivityApi.export(organizationId)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `organization-activity-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch {
      setOperationError('export')
    } finally {
      setWorking(null)
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-edge-subtle bg-navy-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-edge-subtle px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-ink-primary">{tr('Organization activity')}</h3>
          <p className="mt-0.5 text-xs text-ink-muted">{name}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => loadPage(1)} disabled={loading || !!working} className={button}><RefreshCw size={13} />{tr('Refresh')}</button>
          <button type="button" onClick={() => void exportActivity()} disabled={!!working} className={button}>
            {working === 'export' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}{tr('Export JSON')}
          </button>
        </div>
      </div>

      <div className="border-b border-edge-subtle px-5 py-4">
        <form onSubmit={saveRetention} className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-ink-secondary">
            {tr('Activity retention (days)')}
            <input type="number" min={1} max={365} step={1} required value={retention} disabled={!result || !!working}
              onChange={event => { setRetentionDraft(event.target.value); setSaved(false) }}
              className="mt-1 block w-28 rounded-lg border border-edge-default bg-navy-700 px-2 py-1.5 text-sm text-ink-primary disabled:opacity-50" />
          </label>
          <button type="submit" disabled={!validRetention || days === result?.retentionDays || !result || !!working}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-2 text-xs font-medium text-white hover:bg-blue-400 disabled:opacity-40">
            {working === 'save' && <Loader2 size={13} className="animate-spin" />}{tr('Save')}
          </button>
          {saved && <span role="status" className="pb-1.5 text-xs text-green-400">{tr('Activity retention saved')}</span>}
        </form>
        <p className="mt-2 text-xs text-ink-muted">{tr('Expired entries are removed automatically. Export the retained history to keep a copy.')}</p>
        {operationError && <p role="alert" className="mt-2 text-xs text-red-400">
          {tr(operationError === 'save' ? 'Could not save activity retention.' : 'Could not export activity history.')}
        </p>}
      </div>

      {loading && <div role="status" aria-label={tr('loading...')} className="flex justify-center p-8"><Loader2 size={18} className="animate-spin text-ink-muted" /></div>}
      {loadError && <p role="alert" className="p-5 text-sm text-red-400">{tr('Could not load activity history.')}</p>}
      {result && result.items.length === 0 && <p className="p-5 text-sm text-ink-muted">{tr('No activity in the retained period.')}</p>}
      {result && result.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-edge-subtle text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-2.5">{tr('Date and time')}</th>
                <th scope="col" className="px-4 py-2.5">{tr('User')}</th>
                <th scope="col" className="px-4 py-2.5">{tr('Action')}</th>
                <th scope="col" className="px-4 py-2.5">{tr('Resource')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-edge-subtle">
              {result.items.map(item => <tr key={item.id}>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-muted"><time dateTime={item.occurredAt}>{new Date(item.occurredAt).toLocaleString(language)}</time></td>
                <td className="px-4 py-2.5 text-ink-secondary" title={item.actorId}>{item.actorName || item.actorId}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-ink-secondary">{tr(`org-activity-action-${item.action}`)}</td>
                <td className="px-4 py-2.5 text-ink-secondary" title={item.resourceId}>
                  <span className="text-ink-muted">{tr(`org-activity-resource-${item.resource}`)}</span>
                  {item.resourceName ? <span className="block break-words text-ink-primary">
                    {item.previousName && <>{item.previousName} → </>}{item.resourceName}
                  </span> : <span className="block font-mono text-ink-secondary">{item.resourceId.slice(0, 8)}</span>}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
      {result && (page > 1 || result.hasMore) && (
        <div className="flex items-center justify-end gap-3 border-t border-edge-subtle px-5 py-3 text-xs text-ink-muted">
          <button type="button" disabled={page === 1} onClick={() => loadPage(page - 1)} className={button}>{tr('Previous')}</button>
          <span aria-live="polite">{tr('Page {{page}}', { page })}</span>
          <button type="button" disabled={!result.hasMore} onClick={() => loadPage(page + 1)} className={button}>{tr('Next')}</button>
        </div>
      )}
    </section>
  )
}
