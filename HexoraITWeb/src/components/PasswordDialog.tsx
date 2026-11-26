import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { tr } from '../i18n'

export function PasswordDialog({ title, onClose, busy, children, footer, wide }: {
  title: string
  onClose: () => void
  busy?: boolean
  children: ReactNode
  footer: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const heading = useId()

  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  return (
    <dialog ref={ref} aria-labelledby={heading}
      className={`fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] rounded-2xl border border-edge-strong bg-navy-800 text-ink-primary shadow-2xl backdrop:bg-black/60 open:flex open:flex-col ${wide ? 'max-w-3xl' : 'max-w-md'}`}
      onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
      <header className="flex items-center justify-between border-b border-edge-subtle px-5 py-3">
        <h2 id={heading} className="text-sm font-semibold">{title}</h2>
        <button type="button" className="rounded-lg p-1.5 text-ink-muted hover:bg-navy-700 hover:text-ink-primary"
          aria-label={tr('Close')} disabled={busy} onClick={onClose}><X size={16} /></button>
      </header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 text-xs">{children}</div>
      <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-edge-subtle px-5 py-3">{footer}</footer>
    </dialog>
  )
}
