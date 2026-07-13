'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { POLL_INTERVAL_MS } from '@/lib/sync/constants'
import type { Item, SyncStatusValue, QueuedMutation } from '@/lib/sync/types'
import { applySnapshot } from '@/lib/sync/reconcile'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { useToast } from '@/lib/ToastContext'

export function useListSync(listId: string) {
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<SyncStatusValue>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const [externalChanges, setExternalChanges] = useState(false)
  const online = useOnlineStatus()
  const toast = useToast()

  const pendingCount = useRef(0)
  const editingRef = useRef(false)
  const itemsRef = useRef<Item[]>([])
  const queueRef = useRef<QueuedMutation[]>([])
  const flushingRef = useRef(false)
  const externalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  itemsRef.current = items

  const fetchItems = useCallback(async (manual = false): Promise<boolean> => {
    if (pendingCount.current > 0 || editingRef.current) return false
    if (manual) setStatus('syncing')
    try {
      const res = await fetch(`/api/lists/${listId}/items`)
      if (!res.ok) throw new Error('fetch failed')
      const remote: Item[] = await res.json()
      const prevIds = new Set(itemsRef.current.map(i => i.id))
      const hasNew = remote.some(i => !prevIds.has(i.id) && !i.id.startsWith('temp-'))
      const hasRemoved = itemsRef.current.some(i => !remote.find(r => r.id === i.id) && !i.id.startsWith('temp-'))
      const hasExternalChange = hasNew || hasRemoved

      setItems(applySnapshot(itemsRef.current, remote))
      setLastSyncedAt(Date.now())
      setStatus('synced')

      if (hasExternalChange) {
        setExternalChanges(true)
        if (externalTimerRef.current) clearTimeout(externalTimerRef.current)
        externalTimerRef.current = setTimeout(() => setExternalChanges(false), 2000)
      }

      return true
    } catch {
      setStatus(navigator.onLine ? 'error' : 'offline')
      if (manual) toast.error('Não foi possível sincronizar.')
      return false
    }
  }, [listId, toast])

  useEffect(() => {
    setStatus('syncing')
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) fetchItems()
    }
    const interval = setInterval(tick, POLL_INTERVAL_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') fetchItems() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchItems])

  useEffect(() => {
    if (online) fetchItems()
  }, [online, fetchItems])

  const runMutation = useCallback(async (m: QueuedMutation): Promise<boolean> => {
    try {
      if (m.kind === 'add') {
        const res = await fetch(`/api/lists/${m.listId}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: m.name, quantity: m.quantity }),
        })
        return res.ok
      }
      if (m.kind === 'update') {
        const res = await fetch(`/api/items/${m.itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(m.patch),
        })
        return res.ok
      }
      const res = await fetch(`/api/items/${m.itemId}`, { method: 'DELETE' })
      return res.ok
    } catch {
      return false
    }
  }, [])

  const dispatch = useCallback(async (m: QueuedMutation, rollback: () => void) => {
    if (!navigator.onLine) {
      queueRef.current.push(m)
      setStatus('offline')
      return
    }
    pendingCount.current += 1
    const ok = await runMutation(m)
    pendingCount.current -= 1
    if (ok) {
      fetchItems()
    } else {
      rollback()
      toast.error('Não foi possível salvar. Tente novamente.')
    }
  }, [runMutation, fetchItems, toast])

  const flushQueue = useCallback(async () => {
    if (flushingRef.current || queueRef.current.length === 0 || !navigator.onLine) return
    flushingRef.current = true
    const pending = queueRef.current
    queueRef.current = []
    let failed = false
    for (const m of pending) {
      pendingCount.current += 1
      const ok = await runMutation(m)
      pendingCount.current -= 1
      if (!ok) { queueRef.current.push(m); failed = true }
    }
    flushingRef.current = false
    if (failed) toast.error('Algumas mudanças não foram enviadas.')
    else toast.success('Mudanças sincronizadas.')
    fetchItems()
  }, [runMutation, fetchItems, toast])

  useEffect(() => {
    if (online) flushQueue()
  }, [online, flushQueue])

  const syncNow = useCallback(() => {
    if (queueRef.current.length > 0) flushQueue()
    else fetchItems(true)
  }, [flushQueue, fetchItems])

  const setEditing = useCallback((editing: boolean) => {
    editingRef.current = editing
  }, [])

  const addItem = useCallback((name: string, quantity: string) => {
    if (!name.trim()) return
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: Item = {
      id: tempId, name: name.trim(), quantity: quantity.trim(),
      is_checked: 0, is_promotion: 0, has_photo: 0,
    }
    setItems(prev => [...prev, optimistic])
    dispatch(
      { kind: 'add', tempId, listId, name: name.trim(), quantity: quantity.trim() },
      () => setItems(prev => prev.filter(i => i.id !== tempId)),
    )
  }, [listId, dispatch])

  const updateItem = useCallback((
    itemId: string,
    patch: Partial<Pick<Item, 'name' | 'quantity' | 'is_checked' | 'is_promotion'>> & { photo_base64?: string },
  ) => {
    const prevItems = itemsRef.current
    const visual: Partial<Item> = { ...patch }
    if ('photo_base64' in patch) {
      delete (visual as Record<string, unknown>).photo_base64
      visual.has_photo = patch.photo_base64 ? 1 : 0
    }
    setItems(prev => prev.map(i => (i.id === itemId ? { ...i, ...visual } : i)))
    dispatch(
      { kind: 'update', itemId, patch },
      () => setItems(prevItems),
    )
  }, [dispatch])

  const deleteItem = useCallback((itemId: string) => {
    const prevItems = itemsRef.current
    setItems(prev => prev.filter(i => i.id !== itemId))
    dispatch(
      { kind: 'delete', itemId },
      () => setItems(prevItems),
    )
  }, [dispatch])

  const clearChecked = useCallback(() => {
    const checked = itemsRef.current.filter(i => i.is_checked && !i.id.startsWith('temp-'))
    if (checked.length === 0) return
    const prevItems = itemsRef.current
    setItems(prev => prev.filter(i => !i.is_checked))
    for (const c of checked) {
      dispatch({ kind: 'delete', itemId: c.id }, () => setItems(prevItems))
    }
  }, [dispatch])

  return {
    items, status, lastSyncedAt, online, externalChanges,
    syncNow, setEditing,
    addItem, updateItem, deleteItem, clearChecked,
  }
}
