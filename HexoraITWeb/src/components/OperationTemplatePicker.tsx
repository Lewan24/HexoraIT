import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { OperationTemplate } from '../api/operations'
import { tr, useLocale } from '../i18n'
import { searchOperationTemplates, type OperationTemplateOption } from '../lib/operationForm'
import { operationInputClass as input } from './OperationForm'

export default function OperationTemplatePicker({ options, current, disabled, onSelect }: {
  options: OperationTemplateOption<OperationTemplate>[]
  current: string
  disabled: boolean
  onSelect: (option: OperationTemplateOption<OperationTemplate>) => boolean
}) {
  const { i18n } = useLocale()
  const language = i18n.language === 'en' ? 'en' : 'pl'
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const matches = useMemo(() => searchOperationTemplates(options, search), [options, search])
  const selected = options.find(option => option.template.id === current)
  return (
    <div className="rounded-xl border border-edge-subtle bg-navy-800">
      <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:opacity-50"
        aria-expanded={open && !disabled} disabled={disabled} onClick={() => { setOpen(value => !value); setSearch('') }}>
        <span>
          <span className="block text-xs text-ink-muted">{tr('Document template')}</span>
          <span className="mt-0.5 block text-sm font-medium text-ink-primary">{selected?.schema.name[language] ?? tr('Select template')}</span>
        </span>
        <ChevronDown size={16} className={open ? 'rotate-180 text-ink-muted' : 'text-ink-muted'} />
      </button>
      {open && !disabled && (
        <div className="space-y-3 border-t border-edge-subtle p-3" onKeyDown={e => {
          if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
        }}>
          <label className="flex items-center gap-2">
            <Search size={16} className="shrink-0 text-ink-muted" />
            <input autoFocus className={input} type="search" aria-label={tr('Search templates')}
              placeholder={tr('Search templates by title or description')} value={search} onChange={event => setSearch(event.target.value)} />
          </label>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {matches.map(option => (
              <button type="button" key={option.template.id} aria-pressed={option.template.id === current}
                className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-navy-700 aria-pressed:bg-blue-500/10"
                onClick={() => { if (onSelect(option)) setOpen(false) }}>
                <span>
                  <span className="block text-sm text-ink-primary">{option.schema.name[language]} <span className="font-mono text-[10px] text-ink-muted">{option.template.key}</span></span>
                  <span className="mt-0.5 block text-xs text-ink-muted">{option.schema.description[language]}</span>
                </span>
                {option.template.id === current && <Check size={15} className="shrink-0 text-blue-400" />}
              </button>
            ))}
            {!matches.length && <p className="px-3 py-3 text-xs text-ink-muted">{tr('No templates match your search.')}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
