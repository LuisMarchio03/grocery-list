'use client'

import { CloudOff } from 'lucide-react'

type Props = { online: boolean }

export default function OfflineBanner({ online }: Props) {
  if (online) return null
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-300 animate-fade-in">
      <CloudOff size={16} className="shrink-0" />
      <span>Você está offline. As mudanças serão enviadas quando a conexão voltar.</span>
    </div>
  )
}
