'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'

type ToastKind = 'error' | 'success'
type ToastItem = { id: string; message: string; kind: ToastKind }
type ToastContextType = { show: (message: string, kind?: ToastKind) => void }

const ToastContext = createContext<ToastContextType>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'error') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(t => {
          const Icon = t.kind === 'error' ? AlertCircle : CheckCircle2
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full max-w-sm flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-slide-up ${
                t.kind === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-sm flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                title="Fechar"
                className="shrink-0 w-11 h-11 -mr-1 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext).show
}
