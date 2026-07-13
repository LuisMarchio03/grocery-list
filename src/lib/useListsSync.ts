'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { POLL_INTERVAL_MS } from '@/lib/sync/constants'
import type { SyncStatusValue } from '@/lib/sync/types'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { useToast } from '@/lib/ToastContext'

export type ListRow = { id: string; name: string; created_at: string; item_count: number; group_id?: string | null; group_name?: string | null }

export function useListsSync() {
  const [lists, setLists] = useState<ListRow[]>([])
  const [status, setStatus] = useState<SyncStatusValue>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const online = useOnlineStatus()
  const toast = useToast()
  const pendingCount = useRef(0)
  const listsRef = useRef<ListRow[]>([])
  listsRef.current = lists

  const fetchLists = useCallback(async (manual = false) => {
    if (pendingCount.current > 0) return
    if (manual) setStatus('syncing')
    try {
      const res = await fetch('/api/lists')
      if (!res.ok) throw new Error('fetch failed')
      setLists(await res.json())
      setLastSyncedAt(Date.now())
      setStatus('synced')
    } catch {
      setStatus(navigator.onLine ? 'error' : 'offline')
      if (manual) toast.error('Não foi possível sincronizar.')
    }
  }, [toast])

  useEffect(() => { setStatus('syncing'); fetchLists() }, [fetchLists])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) fetchLists()
    }
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchLists() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible) }
  }, [fetchLists])

  const mutate = useCallback(async (fn: () => Promise<Response>, rollback: () => void) => {
    pendingCount.current += 1
    try {
      const res = await fn()
      if (!res.ok) throw new Error('mutation failed')
    } catch {
      rollback()
      toast.error('Não foi possível salvar. Tente novamente.')
    } finally {
      pendingCount.current -= 1
    }
    fetchLists()
  }, [fetchLists, toast])

  const createList = useCallback((name: string, groupId?: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const tempId = `temp-${crypto.randomUUID()}`
    const snapshot = listsRef.current
    setLists(prev => [{ id: tempId, name: trimmed, created_at: new Date().toISOString(), item_count: 0, group_id: groupId }, ...prev])
    mutate(
      () => fetch('/api/lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed, group_id: groupId }),
      }),
      () => setLists(snapshot),
    )
  }, [mutate])

  const renameList = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const snapshot = listsRef.current
    setLists(prev => prev.map(l => (l.id === id ? { ...l, name: trimmed } : l)))
    mutate(
      () => fetch(`/api/lists/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      }),
      () => setLists(snapshot),
    )
  }, [mutate])

  const deleteList = useCallback((id: string) => {
    const snapshot = listsRef.current
    setLists(prev => prev.filter(l => l.id !== id))
    mutate(
      () => fetch(`/api/lists/${id}`, { method: 'DELETE' }),
      () => setLists(snapshot),
    )
  }, [mutate])

  const syncNow = useCallback(() => fetchLists(true), [fetchLists])

  return { lists, status, lastSyncedAt, online, syncNow, createList, renameList, deleteList }
}
