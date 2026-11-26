import { useMemo, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { tr } from '../i18n'
import { ApiError } from '../api/errors'
import type { PasswordEntry } from '../api/types'
import { parsePasswordFile, passwordTitle, PASSWORD_CATEGORIES, type PasswordImportEntry, type ParsedPassword } from '../lib/passwordImport'
import { PasswordDialog } from './PasswordDialog'
import { passwordDialogButton, passwordDialogPrimary, passwordInput } from './passwordDialogStyles'

type Preview = ReturnType<typeof parsePasswordFile>
type Draft = { name: string; selected: boolean; replaceId: string }

function indexVault(entries: PasswordEntry[]) {
  const byTitle = new Map<string, PasswordEntry[]>()
  for (const entry of entries) {
    const title = passwordTitle(entry.name)
    const matches = byTitle.get(title)
    if (matches) matches.push(entry)
    else byTitle.set(title, [entry])
  }
  return byTitle
}

function countByTitle(entries: { name: string }[]) {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const title = passwordTitle(entry.name)
    counts.set(title, (counts.get(title) ?? 0) + 1)
  }
  return counts
}

function validTitle(name: string) {
  return name.trim().length > 0 && name.length <= 200 && !name.includes('\0')
}

export default function PasswordImportDialog({ onClose, loadVault, onImport, canReplace }: {
  onClose: () => void
  loadVault: () => Promise<PasswordEntry[]>
  onImport: (entries: PasswordImportEntry[]) => Promise<void>
  canReplace: (id: string) => boolean
}) {
  const [preview, setPreview] = useState<Preview>()
  const [vault, setVault] = useState<PasswordEntry[]>([])
  const [drafts, setDrafts] = useState(new Map<number, Draft>())
  const [blocked, setBlocked] = useState(new Set<string>())
  const [allowSameTitle, setAllowSameTitle] = useState(false)
  const [category, setCategory] = useState('Other')
  const [revealed, setRevealed] = useState<number>()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const existingByTitle = useMemo(() => indexVault(vault), [vault])
  const rows = (preview?.entries ?? []).flatMap(entry => {
    const draft = drafts.get(entry.row)
    if (!draft) return []
    const title = passwordTitle(draft.name)
    const existing = existingByTitle.get(title) ?? []
    return [{ entry, draft, title, existing, target: existing.find(item => item.id === draft.replaceId) }]
  })
  const fileRowsByTitle = new Map<string, number[]>()
  for (const { entry, title } of rows) {
    const matching = fileRowsByTitle.get(title)
    if (matching) matching.push(entry.row)
    else fileRowsByTitle.set(title, [entry.row])
  }
  const selected = rows.filter(({ draft }) => draft.selected)
  const additions = countByTitle(selected.filter(({ target }) => !target).map(({ draft }) => draft))
  const targets = selected.flatMap(({ target }) => target ? [target.id] : [])
  const repeatedTarget = targets.length !== new Set(targets).size
  const duplicates = selected.some(({ title, existing }) => existing.length + (additions.get(title) ?? 0) > 1)
  const canSave = selected.length > 0 && !repeatedTarget && (!duplicates || allowSameTitle) &&
    selected.every(({ draft, title, target }) => validTitle(draft.name) && !blocked.has(title) &&
      (!draft.replaceId || (target && canReplace(target.id))))

  async function readFile(file: File) {
    setPreview(undefined)
    setDrafts(new Map())
    setBlocked(new Set())
    setAllowSameTitle(false)
    setRevealed(undefined)
    setError('')
    const extension = file.name.split('.').at(-1)?.toLowerCase()
    if (extension !== 'json' && extension !== 'txt') {
      setError('Choose a .json or .txt file.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('The import file must be 10 MB or smaller.')
      return
    }

    setBusy(true)
    try {
      const parsed = parsePasswordFile(await file.text(), extension)
      const existing = parsed.entries.length ? await loadVault() : []
      const fileTitles = countByTitle(parsed.entries)
      const existingTitles = indexVault(existing)
      setDrafts(new Map(parsed.entries.map(({ name, row }) => {
        const title = passwordTitle(name)
        return [row, { name, selected: fileTitles.get(title) === 1 && !existingTitles.has(title), replaceId: '' }]
      })))
      setVault(existing)
      setPreview(parsed)
    } catch (error) {
      setError(error instanceof ApiError ? 'Could not load the vault for the preview.'
        : error instanceof Error ? error.message : 'Could not read the import file.')
    } finally {
      setBusy(false)
    }
  }

  function edit(row: number, change: Partial<Draft>) {
    setDrafts(previous => {
      const draft = previous.get(row)
      return draft ? new Map(previous).set(row, { ...draft, ...change }) : previous
    })
    setAllowSameTitle(false)
  }

  function setAll(select: boolean) {
    setDrafts(new Map(rows.map(({ entry, draft, title, target }) => [entry.row, {
      ...draft,
      selected: select && validTitle(draft.name) && !blocked.has(title),
      replaceId: target && canReplace(target.id) ? target.id : '',
    }])))
    setAllowSameTitle(false)
  }

  function selectMatchingTitles(rowNumbers: number[]) {
    setDrafts(previous => {
      const next = new Map(previous)
      for (const row of rowNumbers) {
        const draft = previous.get(row)
        if (draft && validTitle(draft.name)) next.set(row, { ...draft, selected: true })
      }
      return next
    })
    setAllowSameTitle(false)
  }

  async function save() {
    if (!canSave || busy) return
    const payload: PasswordImportEntry[] = selected.map(({ entry, draft, title, existing, target }) => ({
      name: draft.name.trim(), username: entry.username, password: entry.password, category,
      ...(target && { replaceId: target.id, expectedUpdatedAt: target.updatedAt }),
      ...(existing.length + (additions.get(title) ?? 0) > 1 && { expectedTitleCount: existing.length }),
    }))
    setBusy(true)
    setError('')
    setRevealed(undefined)
    try {
      await onImport(payload)
      onClose()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        try {
          const fresh = await loadVault()
          const updatedByTitle = indexVault(fresh)
          const details = error.details as { entryIndices?: number[] } | undefined
          const indices = Array.isArray(details?.entryIndices) ? details.entryIndices : []
          const reported = new Set(indices.flatMap(index => selected[index] ? [selected[index].title] : []))
          const changed = new Set<string>()
          const unavailable = new Set(blocked)
          for (const title of new Set(rows.map(row => row.title))) {
            const before = existingByTitle.get(title) ?? []
            const after = updatedByTitle.get(title) ?? []
            const revisions = new Map(before.map(item => [item.id, item.updatedAt]))
            if (before.length !== after.length || after.some(item => revisions.get(item.id) !== item.updatedAt)) {
              changed.add(title)
              unavailable.delete(title)
            } else if (reported.has(title)) {
              unavailable.add(title)
            }
          }
          setDrafts(new Map(rows.map(({ entry, draft, title }) => [entry.row, changed.has(title) || reported.has(title)
            ? { ...draft, selected: false, replaceId: '' }
            : draft])))
          setVault(fresh)
          setBlocked(unavailable)
          setAllowSameTitle(false)
          setError('The vault contains conflicting entries. Review the refreshed preview and try again.')
        } catch {
          setError('Could not load the vault for the preview.')
        }
      } else {
        setError('Could not save the password import.')
      }
    } finally {
      setBusy(false)
    }
  }

  function renderDetails(entry: ParsedPassword) {
    return <span className="min-w-0 flex-1 break-words text-ink-muted">
      {entry.username || tr('No username')} · {tr('File entry {{row}}', { row: entry.row })}
    </span>
  }

  return (
    <PasswordDialog title={tr('Import passwords')} onClose={onClose} busy={busy} wide footer={<>
      {busy && <span role="status" className="mr-auto text-xs text-ink-muted">{tr('Processing…')}</span>}
      {preview && !busy && <span aria-live="polite" className="mr-auto text-xs text-ink-secondary">
        {tr('To add: {{added}} · To replace: {{replaced}}', { added: selected.length - targets.length, replaced: targets.length })}
      </span>}
      <button type="button" className={passwordDialogButton} onClick={onClose} disabled={busy}>{tr('Cancel')}</button>
      <button type="button" className={passwordDialogPrimary} onClick={save} disabled={busy || !canSave}>{tr('Import selected')}</button>
    </>}>
      <label className="block space-y-1">
        <span>{tr('Password file')}</span>
        <input type="file" className={passwordInput} accept=".json,.txt" disabled={busy}
          onChange={event => {
            const file = event.currentTarget.files?.[0]
            if (file) void readFile(file)
            event.currentTarget.value = ''
          }} />
      </label>
      <p className="text-ink-muted">{tr('Use an unencrypted Bitwarden JSON export or a TXT file with one entry per line.')}{' '}
        <code>{tr('Title login password')}</code>
      </p>
      {error && <p role="alert" className="text-red-400">{tr(error)}</p>}
      {preview && <>
        {preview.invalidRows.length > 0 && <p role="status" className="text-orange-400">
          {tr('Invalid file entries: {{count}}. Positions: {{rows}}', {
            count: preview.invalidRows.length,
            rows: preview.invalidRows.slice(0, 10).join(', ') + (preview.invalidRows.length > 10 ? ', …' : ''),
          })}
        </p>}
        {preview.skipped > 0 && <p className="text-ink-muted">{tr('Entries without a login password skipped: {{count}}', { count: preview.skipped })}</p>}
        {!rows.length ? <p className="text-ink-secondary">{tr('No passwords found in the file.')}</p> :
          <fieldset disabled={busy} className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label className="space-y-1">
                <span>{tr('Category for new entries')}</span>
                <select className={passwordInput} value={category} onChange={event => setCategory(event.target.value)}>
                  {PASSWORD_CATEGORIES.map(value => <option key={value} value={value}>{tr(value)}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={passwordDialogButton} onClick={() => setAll(true)}>{tr('Select all')}</button>
                <button type="button" className={passwordDialogButton} onClick={() => setAll(false)}>{tr('Deselect all')}</button>
              </div>
            </div>
            {duplicates && <label className="flex items-start gap-2 rounded-lg border border-orange-500/30 px-3 py-2.5 text-orange-400">
              <input type="checkbox" className="mt-0.5" checked={allowSameTitle} onChange={event => setAllowSameTitle(event.target.checked)} />
              {tr('Allow selected entries to share the same title')}
            </label>}
            {repeatedTarget && <p role="alert" className="text-red-400">{tr('Each vault entry can be replaced once per import.')}</p>}
            <div className="space-y-2">
              {rows.map(({ entry, draft, title, existing }) => {
                const matching = fileRowsByTitle.get(title) ?? []
                const conflict = existing.length > 0 || matching.length > 1
                const unavailable = blocked.has(title)
                return <div key={entry.row} className={`space-y-2 rounded-lg border px-3 py-2 ${conflict || unavailable ? 'border-orange-500/30' : 'border-edge-subtle'}`}>
                  <div className="flex items-center gap-2">
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input type="checkbox" checked={draft.selected} disabled={unavailable}
                        onChange={event => edit(entry.row, { selected: event.target.checked })} />
                      {renderDetails(entry)}
                    </label>
                    {(conflict || unavailable) && <span className="shrink-0 text-orange-400">{tr('Duplicate title')}</span>}
                    <button type="button" className="rounded p-1.5 text-ink-muted hover:bg-navy-700 hover:text-ink-primary"
                      aria-label={tr(revealed === entry.row ? 'Hide password' : 'Show password')} aria-pressed={revealed === entry.row}
                      onClick={() => setRevealed(current => current === entry.row ? undefined : entry.row)}>
                      {revealed === entry.row ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  <input type="text" className={passwordInput} maxLength={200} value={draft.name} placeholder={tr('Title')}
                    aria-label={tr('Title for file entry {{row}}', { row: entry.row })} aria-invalid={!validTitle(draft.name)}
                    onChange={event => {
                      const name = event.target.value
                      const changedTitle = passwordTitle(name) !== title
                      edit(entry.row, { name, ...(changedTitle && { replaceId: '' }),
                        ...(blocked.has(passwordTitle(name)) && { selected: false }) })
                    }} />
                  {!validTitle(draft.name) && <p className="text-red-400">{tr('Enter a title for this entry.')}</p>}
                  {revealed === entry.row && <p className="break-all whitespace-pre-wrap font-mono">{entry.password}</p>}
                  {unavailable && <p className="text-orange-400">{tr('Change the title to import this entry.')}</p>}
                  {matching.length > 1 && matching[0] === entry.row && !unavailable && validTitle(draft.name) &&
                    <button type="button" className={passwordDialogButton} onClick={() => selectMatchingTitles(matching)}>
                      {tr('Select all with this title')}
                    </button>}
                  {existing.length > 0 && !unavailable && <label className="block space-y-1">
                    <span className="text-ink-muted">{tr('Action for this entry')}</span>
                    <select className={passwordInput} value={draft.replaceId}
                      onChange={event => edit(entry.row, { replaceId: event.target.value })}>
                      <option value="">{tr('Add as a separate entry')}</option>
                      {existing.map(item => <option key={item.id} value={item.id} disabled={!canReplace(item.id)}>
                        {tr('Replace {{name}} ({{username}})', { name: item.name, username: item.username || tr('No username') })}
                      </option>)}
                    </select>
                  </label>}
                </div>
              })}
            </div>
          </fieldset>}
      </>}
    </PasswordDialog>
  )
}
