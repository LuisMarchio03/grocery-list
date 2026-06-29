'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
          onClick={onCancel}
          title="Fechar"
        >
          <X size={20} />
        </button>

        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          isDanger
            ? 'bg-red-100 dark:bg-red-950'
            : 'bg-blue-100 dark:bg-blue-950'
        }`}>
          <AlertTriangle size={24} className={isDanger ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'} />
        </div>

        <h2 className="text-lg font-semibold text-fg mb-2">{title}</h2>
        <p className="text-sm text-fg-muted mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-3 rounded-xl border border-border text-fg font-medium text-sm hover:bg-surface-2 transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm text-white transition-colors ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                : 'bg-accent hover:bg-accent-hover'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
