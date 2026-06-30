'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Check, CloudOff, AlertCircle } from 'lucide-react'
import type { SyncStatusValue } from '@/lib/sync/types'

type Props = {
  status: SyncStatusValue
  lastSyncedAt: number | null
  online: boolean
  onSync: () => void
}

function ago(ts: number | null): string {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 5) return 'agora'
  if (s < 60) return `há ${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m}min`
  return `há ${Math.floor(m / 60)}h`
}

export default function SyncStatus({ status, lastSyncedAt, online, onSync }: Props) {
  const [, setNow] = useState(0)
  useEffect(() => {
    const i = setInterval(() => setNow(n => n + 1), 5000)
    return () => clearInterval(i)
  }, [])

  let label = ''
  let color = 'text-slate-400'
  let Icon = Check

  if (!online || status === 'offline') {
    label = 'Sem conexão'; color = 'text-amber-600'; Icon = CloudOff
  } else if (status === 'syncing') {
    label = 'Sincronizando…'; color = 'text-blue-500'; Icon = RefreshCw
  } else if (status === 'error') {
    label = 'Erro ao sincronizar'; color = 'text-red-500'; Icon = AlertCircle
  } else {
    label = `Atualizado ${ago(lastSyncedAt)}`; color = 'text-slate-400'; Icon = Check
  }

  return (
    <button
      onClick={onSync}
      title="Sincronizar agora"
      className={`flex items-center gap-1.5 text-xs ${color} hover:text-slate-700 transition-colors active:scale-95`}
    >
      <Icon size={14} className={status === 'syncing' ? 'animate-spin' : ''} />
      <span className="whitespace-nowrap">{label}</span>
      <RefreshCw size={14} className="ml-0.5 opacity-70" />
    </button>
  )
}
