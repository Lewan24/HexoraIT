import { useEffect, useState } from 'react'
import { http } from '../api/http'
import { useApp } from '../context/useApp'

type Note = { id: string; title: string; content: string; updatedAt: string }
const fieldClass = 'w-full rounded-lg border border-edge-default bg-navy-800 p-3 text-ink-primary'
const buttonClass = 'rounded-lg border border-edge-default px-3 py-2 text-sm disabled:opacity-50'

export default function PrivateNotes() {
  const { currentOrg } = useApp()
  return currentOrg ? <NotesEditor key={currentOrg.id} orgId={currentOrg.id} /> : null
}

function NotesEditor({ orgId }: { orgId: string }) {
  const [notes, setNotes] = useState<Note[]>([])
  const [draft, setDraft] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endpoint = `/organizations/${orgId}/private-notes`

  useEffect(() => {
    let cancelled = false
    http.get<Note[]>(endpoint)
      .then(items => { if (!cancelled) setNotes(items) })
      .catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load notes') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [endpoint])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    try { await action() }
    catch (err) { setError(err instanceof Error ? err.message : 'Failed to save changes') }
    finally { setBusy(false) }
  }

  const save = () => run(async () => {
    if (!draft) return
    const body = { title: draft.title.trim(), content: draft.content }
    const saved = draft.id
      ? await http.put<Note>(`${endpoint}/${draft.id}`, body)
      : await http.post<Note>(endpoint, body)
    setNotes(previous => [saved, ...previous.filter(n => n.id !== saved.id)])
    setDraft(null)
  })

  return <div className="space-y-5 p-6 text-ink-primary">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">Private notes</h1>
        <p className="text-sm text-ink-muted">Only you can access these notes in this organization.</p>
      </div>
      <button className={buttonClass} disabled={busy || loading || !!draft}
        onClick={() => setDraft({ id: '', title: '', content: '', updatedAt: '' })}>New note</button>
    </div>
    {error && <p role="alert" className="text-red-400">{error}</p>}
    {loading && <p>Loading notes…</p>}
    {!loading && !notes.length && !draft && <p className="text-ink-muted">No private notes yet.</p>}
    {draft && <fieldset disabled={busy} className="space-y-3">
      <label className="block">Title
        <input className={fieldClass} maxLength={200} value={draft.title}
          onChange={e => setDraft({ ...draft, title: e.target.value })} />
      </label>
      <label className="block">Note
        <textarea className={`${fieldClass} min-h-64`} maxLength={100000} value={draft.content}
          onChange={e => setDraft({ ...draft, content: e.target.value })} />
      </label>
      <div className="flex gap-2">
        <button className={buttonClass} disabled={!draft.title.trim()} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
        <button className={buttonClass} onClick={() => setDraft(null)}>Cancel</button>
      </div>
    </fieldset>}
    {notes.map(note => <article key={note.id} className="space-y-3 rounded-xl border border-edge-default p-4">
      <h2 className="font-semibold">{note.title}</h2>
      <p className="whitespace-pre-wrap break-words">{note.content}</p>
      <p className="text-xs text-ink-muted">{new Date(note.updatedAt).toLocaleString()}</p>
      <div className="flex gap-2">
        <button className={buttonClass} disabled={busy || !!draft} onClick={() => setDraft({ ...note })}>Edit</button>
        <button className={buttonClass} disabled={busy || !!draft} onClick={() => {
          if (window.confirm('Delete this private note?')) void run(async () => {
            await http.delete(`${endpoint}/${note.id}`)
            setNotes(previous => previous.filter(n => n.id !== note.id))
          })
        }}>Delete</button>
      </div>
    </article>)}
  </div>
}
