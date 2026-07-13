'use client'

import { useToast } from '@/lib/ToastContext'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const styles = {
  success: { icon: CheckCircle2, cls: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300' },
  error: { icon: AlertCircle, cls: 'border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300' },
  info: { icon: Info, cls: 'border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' },
}

export default function Toaster() {
  const { toasts, dismiss } = useToast()
  if (toasts.length === 0) return null

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map(t => {
        const { icon: Icon, cls } = styles[t.kind]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-md flex items-center gap-2 rounded-xl border px-4 py-3 shadow-lg animate-slide-up ${cls}`}
            role="status"
          >
            <Icon size={18} className="shrink-0" />
            <span className="text-sm flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-60 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
