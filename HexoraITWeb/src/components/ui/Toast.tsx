import { useEffect, useState } from 'react'
import { CheckCircle2, Info, XCircle, X } from 'lucide-react'
import { useApp } from '../../context/useApp'
import type { Toast } from '../../api/types'

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(t)
  }, [])

  const icons = {
    success: <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />,
    error: <XCircle size={14} className="text-red-400 flex-shrink-0" />,
    info: <Info size={14} className="text-blue-400 flex-shrink-0" />,
  }
  const borders = { success: 'border-green-500/30', error: 'border-red-500/30', info: 'border-blue-500/30' }

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${borders[toast.type]} shadow-2xl min-w-[260px] max-w-[340px] transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      style={{ background: 'var(--_bg-800)' }}
    >
      {icons[toast.type]}
      <span className="text-xs text-ink-primary flex-1">{toast.message}</span>
      <button onClick={onDismiss} className="text-ink-muted hover:text-ink-primary transition-colors flex-shrink-0 ml-1">
        <X size={12} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp()
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={() => dismissToast(t.id)} />
        </div>
      ))}
    </div>
  )
}
