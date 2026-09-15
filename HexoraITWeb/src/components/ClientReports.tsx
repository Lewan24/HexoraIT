import { useState } from 'react'
import { tr, useLocale } from '../i18n'
import { useApp } from '../context/useApp'
import { http } from '../api/http'
import type { Priority } from '../api/types'

export default function ClientReports() {
  useLocale()
  const { currentOrg } = useApp()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const input = 'w-full rounded-lg border border-edge-default bg-navy-800 p-3 text-ink-primary'
  return <div className="max-w-2xl p-6 space-y-5 text-ink-primary">
    <h1 className="text-xl font-semibold">{tr('Report a problem')}</h1>
    <p className="text-sm text-ink-muted">{currentOrg?.name} · {tr('Describe the problem. Your caretaker will receive it as a task.')}</p>
    {sent && <p role="status" className="text-green-400">{tr('Your report has been submitted.')}</p>}
    {error && <p role="alert" className="text-red-400">{error}</p>}
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault()
      if (!currentOrg || busy) return
      setBusy(true); setError(''); setSent(false)
      try {
        await http.post(`/organizations/${currentOrg.id}/reports`, { title, description, priority })
        setTitle(''); setDescription(''); setPriority('medium'); setSent(true)
      } catch (err) { setError(err instanceof Error ? err.message : tr('Operation failed')) }
      finally { setBusy(false) }
    }}>
      <fieldset disabled={busy} className="space-y-4">
        <label className="block">{tr('Title')}<input required maxLength={200} className={input} value={title} onChange={e => setTitle(e.target.value)} /></label>
        <label className="block">{tr('Description')}<textarea required maxLength={100000} rows={8} className={input} value={description} onChange={e => setDescription(e.target.value)} /></label>
        <label className="block">{tr('Priority')}<select className={input} value={priority} onChange={e => setPriority(e.target.value as Priority)}>
          {(['low', 'medium', 'high'] as const).map(p => <option key={p} value={p}>{tr(p)}</option>)}
        </select></label>
        <button disabled={!currentOrg || !title.trim() || !description.trim()} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{busy ? tr('Saving…') : tr('Submit report')}</button>
      </fieldset>
    </form>
  </div>
}
