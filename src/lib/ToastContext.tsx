'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ToastKind = 'success' | 'error' | 'info'
export type Toast = { id: string; kind: ToastKind; message: string }

type ToastContextType = {
  toasts: Toast[]
  show: (kind: ToastKind, message: string) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  show: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts(prev => [...prev, { id, kind, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const success = useCallback((m: string) => show('success', m), [show])
  const error = useCallback((m: string) => show('error', m), [show])
  const info = useCallback((m: string) => show('info', m), [show])

  return (
    <ToastContext.Provider value={{ toasts, show, success, error, info, dismiss }}>
      {children}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
