import { tr } from '../../i18n'

export default function ContextCommand({ label, run, danger = false }: { label: string; run: () => void; danger?: boolean }) {
  return <span hidden data-context-command="" data-context-action={label} data-context-danger={danger}
    onClick={event => { event.stopPropagation(); run() }} />
}

export function ContextDelete({ name, run }: { name: string; run: () => Promise<unknown> | void }) {
  return <ContextCommand label={tr('Delete')} danger run={() => {
    if (window.confirm(tr('Delete “{{name}}”?', { name }))) void Promise.resolve(run()).catch(() => {})
  }} />
}
