'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CloudOff, AlertCircle } from 'lucide-react'
import type { SyncStatusValue } from '@/lib/sync/types'

type Props = {
  status: SyncStatusValue
  lastSyncedAt: number | null
  online: boolean
  onSync: () => void
  hasChanges?: boolean
}

function ago(ts: number | null): string {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 3) return 'agora'
  if (s < 60) return `há ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m}min`
  return `há ${Math.floor(m / 60)}h`
}

export default function SyncStatus({ status, lastSyncedAt, online, onSync, hasChanges }: Props) {
  const [, setNow] = useState(0)

  useEffect(() => {
    const i = setInterval(() => setNow(n => n + 1), 3000)
    return () => clearInterval(i)
  }, [])

  const isLive = status === 'synced' && online
  const isError = status === 'error'
  const isOffline = !online || status === 'offline'
  const isSyncing = status === 'syncing'

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSync}
        title="Sincronizar agora"
        className={`relative flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200 active:scale-95 ${
          isOffline
            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
            : isError
            ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900'
            : hasChanges
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 animate-pulse'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-transparent'
        }`}
      >
        {isOffline ? (
          <CloudOff size={14} />
        ) : isError ? (
          <AlertCircle size={14} />
        ) : (
          <span className="relative flex h-2.5 w-2.5">
            {isLive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isLive ? 'bg-emerald-500' : isSyncing ? 'bg-blue-400' : 'bg-slate-400'
              }`}
            />
          </span>
        )}

        <span>
          {isOffline
            ? 'Sem conexão'
            : isError
            ? 'Erro'
            : isSyncing
            ? 'Sincronizando…'
            : lastSyncedAt
            ? `Atualizado ${ago(lastSyncedAt)}`
            : 'Iniciando…'}
        </span>

        <RefreshCw
          size={12}
          className={`transition-all duration-300 ${
            isSyncing ? 'animate-spin opacity-100' : 'opacity-40 group-hover:opacity-100'
          }`}
        />
      </button>
    </div>
  )
}
