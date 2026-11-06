import { tr, useLocale } from '../i18n'
import { CUSTOMIZABLE_MODULES } from '../lib/organizationLifecycle'

export default function OrganizationModules({ hidden, onChange, disabled = false }: {
  hidden: string[]; onChange: (hidden: string[]) => void; disabled?: boolean
}) {
  useLocale()
  return <fieldset disabled={disabled} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    <legend className="mb-3 text-sm font-medium text-ink-primary">{tr('Visible modules')}</legend>
    {CUSTOMIZABLE_MODULES.map(resource => <label key={resource} className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-xs transition-colors ${hidden.includes(resource) ? 'border-edge-subtle text-ink-muted' : 'border-blue-500/25 bg-blue-500/5 text-ink-primary'}`}>
      <input type="checkbox" checked={!hidden.includes(resource)} onChange={e => onChange(e.target.checked ? hidden.filter(item => item !== resource) : [...hidden, resource])} className="accent-blue-500" />
      <span className="capitalize">{tr(resource)}</span>
    </label>)}
  </fieldset>
}
