import RecordIndex from "./RecordIndex"
import MarkdownEditor from "./MarkdownEditor"
import { useDialogFocus } from "../lib/useDialogFocus"
import { tr, useLocale, locale } from "../i18n"
import { useEffect, useRef, useState } from "react"
import {
  Plus,
  Search,
  StickyNote,
  LockKeyhole,
  X,
  Trash2,
  Save,
  Loader2,
  ArrowUpRight,
} from "lucide-react"
import { http } from "../api/http"
import { orderRecords, type RecordOrderEvent } from "../lib/recordOrder"
import { renderMarkdownCompact } from "../lib/markdown"
import { useApp } from "../context/useApp"

type Note = {
  sortIndex?: number | null
  id: string
  title: string
  content: string
  updatedAt: string
}
const emptyNote = (): Note => ({
  id: "",
  title: "",
  content: "",
  updatedAt: "",
})

export default function PrivateNotes() {
  useLocale()
  const { currentOrg } = useApp()
  return currentOrg ? (
    <NotesWorkspace key={currentOrg.id} orgId={currentOrg.id} />
  ) : null
}

function NotesWorkspace({ orgId }: { orgId: string }) {
  useLocale()
  const [notes, setNotes] = useState<Note[]>([])
  const [selected, setSelected] = useState<Note | null>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState("")
  const endpoint = `/organizations/${orgId}/private-notes`
  useEffect(() => {
    let cancelled = false
    http
      .getAllPages<Note>(endpoint)
      .then((items) => {
        if (!cancelled) setNotes(orderRecords(items))
      })
      .catch((error) => {
        if (!cancelled)
          setError(
            error instanceof Error ? error.message : tr("Failed to load notes"),
          )
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [endpoint])
  useEffect(() => {
    const update = (event: Event) => {
      const detail = (event as CustomEvent<RecordOrderEvent>).detail
      if (
        detail?.organizationId !== orgId ||
        detail.resource !== "private-notes"
      )
        return
      const indices = new Map(
        detail.changes.map((change) => [change.id, change.sortIndex]),
      )
      setNotes((previous) =>
        orderRecords(
          previous.map((note) =>
            indices.has(note.id)
              ? { ...note, sortIndex: indices.get(note.id)! }
              : note,
          ),
        ),
      )
    }
    window.addEventListener("organization-record-order-changed", update)
    return () =>
      window.removeEventListener("organization-record-order-changed", update)
  }, [orgId])
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError("")
    try {
      await action()
    } catch (error) {
      setError(
        error instanceof Error ? error.message : tr("Failed to save changes"),
      )
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const save = (note: Note) =>
    run(async () => {
      const body = { title: note.title.trim(), content: note.content }
      if (!body.title) return
      const saved = note.id
        ? await http.put<Note>(`${endpoint}/${note.id}`, body)
        : await http.post<Note>(endpoint, body)
      setNotes((previous) =>
        orderRecords([
          saved,
          ...previous.filter((item) => item.id !== saved.id),
        ]),
      )
      setSelected(null)
    })
  const remove = (note: Note) =>
    run(async () => {
      await http.delete(`${endpoint}/${note.id}`)
      setNotes((previous) => previous.filter((item) => item.id !== note.id))
      setSelected(null)
    })
  const term = query.trim().toLocaleLowerCase(locale())
  const filtered = notes.filter((note) =>
    `${note.title}\n${note.content}`.toLocaleLowerCase(locale()).includes(term),
  )
  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 text-ink-primary sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <StickyNote size={20} className="text-amber-400" />
            <h1 className="text-xl font-semibold">{tr("Private notes")}</h1>
            <span className="rounded-full border border-edge-default px-2 py-0.5 text-xs text-ink-muted">
              {notes.length}
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-muted">
            <LockKeyhole size={12} />
            {tr("Only you can access these notes in this organization.")}
          </p>
        </div>
        <button
          disabled={loading || busy}
          onClick={() => {
            setError("")
            setSelected(emptyNote())
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 disabled:opacity-40"
        >
          <Plus size={15} />
          {tr("New note")}
        </button>
      </header>
      <label className="flex max-w-md items-center gap-2 rounded-xl border border-edge-default bg-navy-800 px-3 py-2.5 text-ink-muted">
        <Search size={15} />
        <input
          type="search"
          style={{ minHeight: 0 }}
          aria-label={tr("Search notes")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={tr("Search notes")}
          maxLength={200}
          className="w-full bg-transparent text-sm text-ink-primary outline-none"
        />
      </label>
      {error && !selected && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
      {loading ? (
        <div className="flex justify-center gap-2 py-16 text-sm text-ink-muted">
          <Loader2 size={18} className="animate-spin" />
          {tr("Loading notes…")}
        </div>
      ) : !filtered.length ? (
        <div className="rounded-2xl border border-dashed border-edge-default p-12 text-center">
          <StickyNote size={28} className="mx-auto mb-3 text-ink-muted" />
          <p className="text-sm text-ink-muted">
            {term ? tr("No matching notes") : tr("No private notes yet.")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((note) => (
            <article
              key={note.id}
              className="group relative flex h-52 flex-col overflow-hidden rounded-2xl border border-edge-subtle bg-navy-800 transition-colors hover:border-blue-500/40"
            >
              <div className="h-1 shrink-0 bg-amber-400/40" />
              <button
                onClick={() => {
                  setError("")
                  setSelected(note)
                }}
                className="flex min-h-0 flex-1 flex-col gap-3 p-4 text-left focus-visible:outline-2 focus-visible:outline-blue-400"
                aria-label={tr("Open note {{name}}", { name: note.title })}
              >
                <div className="flex w-full items-start gap-2">
                  <h2 className="line-clamp-2 min-w-0 flex-1 break-words text-sm font-semibold">
                    <RecordIndex index={note.sortIndex} />
                    {note.title}
                  </h2>
                  <ArrowUpRight
                    size={14}
                    className="shrink-0 text-ink-muted group-hover:text-blue-400"
                  />
                </div>
                <div className="min-h-0 w-full flex-1 overflow-hidden space-y-1">
                  {note.content.trim() ? (
                    renderMarkdownCompact(note.content, 4)
                  ) : (
                    <p className="text-xs italic text-ink-muted">
                      {tr("Empty note")}
                    </p>
                  )}
                </div>
                <time
                  dateTime={note.updatedAt}
                  className="text-[10px] text-ink-muted"
                >
                  {new Date(note.updatedAt).toLocaleString(locale(), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </time>
              </button>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <NoteDialog
          key={selected.id || "new"}
          initial={selected}
          busy={busy}
          error={error}
          onClose={() => setSelected(null)}
          onSave={save}
          onDelete={remove}
        />
      )}
    </div>
  )
}

function NoteDialog({
  initial,
  busy,
  error,
  onClose,
  onSave,
  onDelete,
}: {
  initial: Note
  busy: boolean
  error: string
  onClose: () => void
  onSave: (note: Note) => Promise<void>
  onDelete: (note: Note) => Promise<void>
}) {
  const dialogRef = useDialogFocus()
  const [draft, setDraft] = useState(initial)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const dirty =
    draft.title !== initial.title || draft.content !== initial.content
  const close = () => {
    if (
      !busy &&
      (!dirty || window.confirm(tr("Discard unsaved note changes?")))
    )
      onClose()
  }
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
      onClick={close}
      onKeyDown={(event) => {
        if (event.key === "Escape") close()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="note-title"
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-edge-default bg-navy-800 shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-edge-subtle p-4 sm:px-6">
          <StickyNote size={18} className="text-amber-400" />
          <h2 id="note-title" className="flex-1 text-sm font-semibold">
            {initial.id ? tr("Private note") : tr("New note")}
          </h2>
          <button
            disabled={busy}
            onClick={close}
            aria-label={tr("Close")}
            className="rounded-lg p-2 text-ink-muted hover:bg-navy-700"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 space-y-4 overflow-y-auto p-4 sm:p-6">
          <label className="block space-y-2 text-xs text-ink-muted">
            <span>{tr("Title")}</span>
            <input
              maxLength={200}
              disabled={busy}
              value={draft.title}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  title: event.target.value,
                }))
              }
              className="w-full rounded-xl border border-edge-default bg-navy-700 px-3 py-2.5 text-base font-semibold text-ink-primary outline-none focus:border-blue-500"
            />
          </label>
          <MarkdownEditor
            value={draft.content}
            onChange={(content) =>
              setDraft((previous) => ({ ...previous, content }))
            }
            disabled={busy}
            initialPreview={!!initial.id}
          />
        </div>
        <footer className="space-y-3 border-t border-edge-subtle p-4 sm:px-6">
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          {confirmDelete ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-secondary">
                {tr("Delete this private note?")}
              </p>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-lg border border-edge-default px-3 py-2 text-xs"
                >
                  {tr("Cancel")}
                </button>
                <button
                  disabled={busy}
                  onClick={() => void onDelete(draft)}
                  className="rounded-lg bg-red-500 px-3 py-2 text-xs text-white"
                >
                  {busy ? tr("Deleting…") : tr("Delete")}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {initial.id && (
                  <button
                    disabled={busy}
                    onClick={() => setConfirmDelete(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-ink-muted hover:text-red-400"
                  >
                    <Trash2 size={14} />
                    {tr("Delete")}
                  </button>
                )}
              </div>
              <button
                disabled={
                  busy || !draft.title.trim() || (!dirty && !!initial.id)
                }
                onClick={() => void onSave(draft)}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white disabled:opacity-40"
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {busy ? tr("Saving…") : tr("Save note")}
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  )
}
