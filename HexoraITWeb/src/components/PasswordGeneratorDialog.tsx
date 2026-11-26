import { useState } from 'react'
import { locale, tr, type Language } from '../i18n'
import { CHARACTER_GROUPS, randomPassphrase, randomPassword, type CharacterGroup, type NumberPosition } from '../lib/passwordGenerator'
import { PasswordDialog } from './PasswordDialog'
import { passwordDialogButton, passwordDialogPrimary, passwordInput } from './passwordDialogStyles'

const groupLabels: Record<CharacterGroup, string> = {
  lowercase: 'Lowercase letters',
  uppercase: 'Uppercase letters',
  digits: 'Digits',
  symbols: 'Symbols',
}

const numberPositions: Record<NumberPosition, string> = {
  none: 'No number',
  start: 'At the beginning',
  end: 'At the end',
  random: 'Random position',
}

const wordLists = {
  // EFF Long Wordlist, Electronic Frontier Foundation (CC BY), https://www.eff.org/dice
  en: () => import('../lib/eff-large-wordlist.txt?raw'),
  // Diceware Polski by Poltrax (CC BY-SA 4.0), see /licenses/diceware-polski.txt.
  pl: () => import('../lib/diceware-pl.txt?raw'),
  'pl-diacritics': () => import('../lib/diceware-pl-ogonki.txt?raw'),
}

async function loadDictionary(language: Language, diacritics: boolean) {
  const list = language === 'pl' && diacritics ? 'pl-diacritics' : language
  const { default: source } = await wordLists[list]()
  return source.trim().split(/\r?\n/).map(line => line.split('\t')[1]).filter((word): word is string => !!word)
}

export default function PasswordGeneratorDialog({ onClose, onUse }: {
  onClose: () => void
  onUse: (password: string) => void
}) {
  const [mode, setMode] = useState<'characters' | 'words'>('characters')
  const [length, setLength] = useState('20')
  const [groups, setGroups] = useState(Object.keys(CHARACTER_GROUPS) as CharacterGroup[])
  const [excluded, setExcluded] = useState('')
  const [language, setLanguage] = useState<Language>(() => locale() === 'pl-PL' ? 'pl' : 'en')
  const [diacritics, setDiacritics] = useState(false)
  const [capitalize, setCapitalize] = useState(false)
  const [wordCount, setWordCount] = useState('6')
  const [separator, setSeparator] = useState('-')
  const [number, setNumber] = useState<NumberPosition>('none')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function change(update: () => void) {
    update()
    setPassword('')
    setError('')
  }

  async function generate() {
    setPassword('')
    setError('')
    const count = Number(wordCount)
    if (mode === 'words' && (!Number.isInteger(count) || count < 4 || count > 12)) {
      setError('Select between 4 and 12 words.')
      return
    }
    setBusy(true)
    try {
      const value = mode === 'characters'
        ? randomPassword(Number(length), groups, excluded)
        : randomPassphrase(await loadDictionary(language, diacritics), count, separator, number, capitalize)
      setPassword(value)
    } catch (error) {
      setError(error instanceof Error && mode === 'characters'
        ? error.message
        : 'The passphrase word list could not be loaded.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <PasswordDialog title={tr('Password generator')} onClose={onClose} busy={busy} footer={<>
      <button type="button" className={passwordDialogButton} onClick={onClose} disabled={busy}>{tr('Cancel')}</button>
      <button type="button" className={passwordDialogButton} onClick={generate} disabled={busy}>{tr(password ? 'Generate again' : 'Generate')}</button>
      <button type="button" className={passwordDialogPrimary} disabled={!password || busy} onClick={() => onUse(password)}>{tr('Use password')}</button>
    </>}>
      <fieldset className="space-y-4 disabled:opacity-60" disabled={busy}>
        <label className="block space-y-1">
          <span>{tr('Password type')}</span>
          <select className={passwordInput} value={mode} onChange={event => change(() => setMode(event.target.value as typeof mode))}>
            <option value="characters">{tr('Random characters')}</option>
            <option value="words">{tr('Passphrase')}</option>
          </select>
        </label>
        {mode === 'characters' ? <>
          <label className="block space-y-1">
            <span>{tr('Password length')}</span>
            <input className={passwordInput} type="number" min={8} max={128} value={length} onChange={event => change(() => setLength(event.target.value))} />
          </label>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="mb-2">{tr('Character groups')}</legend>
            {(Object.keys(CHARACTER_GROUPS) as CharacterGroup[]).map(group =>
              <label key={group} className="flex items-center gap-2">
                <input type="checkbox" checked={groups.includes(group)} onChange={event => change(() =>
                  setGroups(current => event.target.checked ? [...current, group] : current.filter(value => value !== group)))} />
                {tr(groupLabels[group])}
              </label>)}
          </fieldset>
          <label className="block space-y-1">
            <span>{tr('Excluded characters')}</span>
            <input className={`${passwordInput} font-mono`} maxLength={128} placeholder="O0Il1" value={excluded}
              onChange={event => change(() => setExcluded(event.target.value))} />
          </label>
        </> : <>
          <label className="block space-y-1">
            <span>{tr('Word language')}</span>
            <select className={passwordInput} value={language} onChange={event => change(() => setLanguage(event.target.value as Language))}>
              <option value="pl">{tr('Polish')}</option>
              <option value="en">{tr('English')}</option>
            </select>
          </label>
          {language === 'pl' && <label className="flex items-center gap-2">
            <input type="checkbox" checked={diacritics} onChange={event => change(() => setDiacritics(event.target.checked))} />
            {tr('Use Polish diacritics')}
          </label>}
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={capitalize} onChange={event => change(() => setCapitalize(event.target.checked))} />
            {tr('Capitalize each word')}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1">
              <span>{tr('Number of words')}</span>
              <input className={passwordInput} type="number" min={4} max={12} value={wordCount} onChange={event => change(() => setWordCount(event.target.value))} />
            </label>
            <label className="space-y-1">
              <span>{tr('Separator')}</span>
              <input className={`${passwordInput} font-mono`} maxLength={1} value={separator} onChange={event => change(() => setSeparator(event.target.value))} />
            </label>
          </div>
          <label className="block space-y-1">
            <span>{tr('Add a random two-digit number')}</span>
            <select className={passwordInput} value={number} onChange={event => change(() => setNumber(event.target.value as NumberPosition))}>
              {(Object.keys(numberPositions) as NumberPosition[]).map(position =>
                <option key={position} value={position}>{tr(numberPositions[position])}</option>)}
            </select>
          </label>
          <p className="text-ink-muted">{tr('Words are drawn independently from the selected list. Six words are recommended.')}</p>
        </>}
      </fieldset>
      {error && <p role="alert" className="text-red-400">{tr(error)}</p>}
      {password && <output aria-label={tr('Generated password')} className="block break-all rounded-lg border border-edge-default bg-navy-700 p-3 font-mono whitespace-pre-wrap">{password}</output>}
    </PasswordDialog>
  )
}
