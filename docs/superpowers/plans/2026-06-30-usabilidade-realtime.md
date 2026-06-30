# Melhorias de Usabilidade + Sync em Tempo Real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar sincronização em tempo real entre dispositivos (polling inteligente) e melhorias gerais de usabilidade (status de sync, botão sincronizar, feedback de erro/offline com fila de reenvio, progresso, busca, limpar comprados) ao app de lista de compras.

**Architecture:** Next.js 14 App Router + libsql/Turso. Tempo real via polling leve (~4s, pausado em background, refetch em focus/reconnect). Foto sai do payload da lista (passa a `has_photo`) e é buscada sob demanda, tornando o polling barato. Toda a lógica de itens/sync/fila vive em hooks (`useListSync`, `useListsSync`) sobre funções puras isoladas em `src/lib/sync/`. Feedback ao usuário via `ToastProvider` próprio (sem dependência nova).

**Tech Stack:** Next.js 14, React 18, TypeScript, Tailwind, @libsql/client, lucide-react.

## Global Constraints

- Sem dependências novas (npm). Só o que já está no `package.json`.
- Sem migração de banco. `schema.sql` permanece intacto; usar colunas existentes (`created_at`, `photo_base64`) com computação na query (`photo_base64 != '' AS has_photo`, `COUNT(*)`).
- Serverless (Vercel): nada de WebSocket/conexão persistente. Tempo real = polling.
- Idioma da UI: português (pt-BR), seguindo os textos já existentes.
- Padrões existentes: componentes `'use client'`, Tailwind utilitário, ícones lucide-react, Context no estilo de `src/lib/FontSizeContext.tsx`.
- **Projeto não é repositório git e não tem runner de testes.** Ciclo de verificação por tarefa = `npx tsc --noEmit` (typecheck) + verificação manual no `npm run dev`. Passos "Checkpoint" são opcionais (rodar `git init` primeiro se quiser versionar).
- Intervalo de polling configurável por constante `POLL_INTERVAL_MS = 4000` em `src/lib/sync/constants.ts`.

---

## File Structure

**Criar:**
- `src/lib/sync/constants.ts` — constantes (`POLL_INTERVAL_MS`).
- `src/lib/sync/types.ts` — tipos compartilhados (`Item`, `SyncState`, `QueuedMutation`).
- `src/lib/sync/reconcile.ts` — funções puras (`applySnapshot`).
- `src/lib/useOnlineStatus.ts` — hook online/offline.
- `src/lib/ToastContext.tsx` — `ToastProvider` + `useToast`.
- `src/lib/useListSync.ts` — hook de itens de uma lista (polling + mutações + fila).
- `src/lib/useListsSync.ts` — hook da coleção de listas (home).
- `src/components/Toaster.tsx` — render dos toasts.
- `src/components/SyncStatus.tsx` — badge de status + botão sincronizar.
- `src/components/OfflineBanner.tsx` — banner de offline.
- `src/components/ListProgress.tsx` — progresso "X de Y comprados".
- `src/components/ItemSearch.tsx` — campo de busca.
- `src/app/api/items/[id]/photo/route.ts` — GET foto sob demanda.

**Modificar:**
- `src/app/api/lists/[id]/items/route.ts` — GET devolve `has_photo` no lugar de `photo_base64`.
- `src/app/api/lists/route.ts` — GET inclui `item_count`.
- `src/components/Providers.tsx` — envolver com `ToastProvider` + render `Toaster`.
- `src/components/ItemCard.tsx` — tipo `has_photo`; "Ver foto" via callback assíncrono.
- `src/components/AddItemForm.tsx` — `autoFocus` + aviso de duplicado.
- `src/app/lists/[id]/page.tsx` — consumir `useListSync`; usar `SyncStatus`, `OfflineBanner`, `ListProgress`, `ItemSearch`, "Limpar comprados".
- `src/app/page.tsx` — consumir `useListsSync`; `SyncStatus`; mostrar `item_count`.

---

## Task 1: Backend — payload leve, foto sob demanda, contagem

**Files:**
- Modify: `src/app/api/lists/[id]/items/route.ts` (GET)
- Create: `src/app/api/items/[id]/photo/route.ts`
- Modify: `src/app/api/lists/route.ts` (GET)

**Interfaces:**
- Produces:
  - `GET /api/lists/:id/items` → `Array<{ id, name, quantity, is_checked, is_promotion, has_photo }>` (sem `photo_base64`).
  - `GET /api/items/:id/photo` → `{ photo_base64: string }` (string vazia se sem foto / item inexistente).
  - `GET /api/lists` → `Array<{ id, name, created_at, item_count }>`.

- [ ] **Step 1: Alterar o GET de itens para não devolver o base64**

Em `src/app/api/lists/[id]/items/route.ts`, troque o `SELECT *` do GET:

```ts
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT id, list_id, name, quantity, is_checked, is_promotion,
                 CASE WHEN photo_base64 IS NOT NULL AND photo_base64 != '' THEN 1 ELSE 0 END AS has_photo,
                 created_at
          FROM items WHERE list_id = ?
          ORDER BY is_checked ASC, created_at ASC`,
    args: [params.id],
  })
  return NextResponse.json(result.rows)
}
```

(O `POST` do mesmo arquivo permanece inalterado.)

- [ ] **Step 2: Criar o endpoint de foto sob demanda**

Crie `src/app/api/items/[id]/photo/route.ts`:

```ts
import getDb from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT photo_base64 FROM items WHERE id = ?',
    args: [params.id],
  })
  const photo = result.rows.length ? (result.rows[0].photo_base64 as string) : ''
  return NextResponse.json({ photo_base64: photo || '' })
}
```

- [ ] **Step 3: Incluir contagem de itens no GET de listas**

Em `src/app/api/lists/route.ts`, troque o GET:

```ts
export async function GET() {
  const db = getDb()
  const result = await db.execute(
    `SELECT l.id, l.name, l.created_at,
            (SELECT COUNT(*) FROM items i WHERE i.list_id = l.id) AS item_count
     FROM lists l
     ORDER BY l.created_at DESC`
  )
  return NextResponse.json(result.rows)
}
```

(O `POST` permanece inalterado.)

- [ ] **Step 4: Verificar (typecheck + manual)**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run dev`, então em outro terminal:
`curl -s localhost:3000/api/lists | head` → cada lista tem `item_count` e nenhum `photo_base64`.
`curl -s "localhost:3000/api/lists/<ID>/items"` → itens têm `has_photo` (0/1), sem `photo_base64`.
`curl -s localhost:3000/api/items/<ITEM_ID>/photo` → `{"photo_base64":"..."}`.

- [ ] **Step 5: Checkpoint (opcional)** — `git add -A && git commit -m "feat(api): payload leve de itens, foto sob demanda, contagem de listas"` (se git inicializado).

---

## Task 2: Tipos, constantes e reconciliação pura

**Files:**
- Create: `src/lib/sync/constants.ts`
- Create: `src/lib/sync/types.ts`
- Create: `src/lib/sync/reconcile.ts`

**Interfaces:**
- Produces:
  - `POLL_INTERVAL_MS: number`
  - `type Item`, `type SyncStatusValue`, `type QueuedMutation`
  - `applySnapshot(local: Item[], remote: Item[]): Item[]` — devolve `remote`, mas preserva itens locais com id `temp-*` que ainda não existem no remoto (ordenando-os ao fim).

- [ ] **Step 1: Constantes**

Crie `src/lib/sync/constants.ts`:

```ts
export const POLL_INTERVAL_MS = 4000
```

- [ ] **Step 2: Tipos**

Crie `src/lib/sync/types.ts`:

```ts
export type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  has_photo: number
}

export type SyncStatusValue = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'

export type QueuedMutation =
  | { kind: 'add'; tempId: string; listId: string; name: string; quantity: string }
  | { kind: 'update'; itemId: string; patch: Partial<Pick<Item, 'name' | 'quantity' | 'is_checked' | 'is_promotion'>> & { photo_base64?: string } }
  | { kind: 'delete'; itemId: string }
```

- [ ] **Step 3: Reconciliação pura**

Crie `src/lib/sync/reconcile.ts`:

```ts
import type { Item } from './types'

/**
 * Combina o snapshot remoto (fonte de verdade) com itens otimistas locais
 * ainda não confirmados (id `temp-*`). Itens temp permanecem ao fim até que
 * o servidor os retorne com id real.
 */
export function applySnapshot(local: Item[], remote: Item[]): Item[] {
  const pendingTemp = local.filter(i => i.id.startsWith('temp-'))
  if (pendingTemp.length === 0) return remote
  return [...remote, ...pendingTemp]
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

Raciocínio de corretude (sem runner): `applySnapshot([], remote) === remote`; com um `temp-x` local não presente no remoto, o resultado é `remote` seguido de `temp-x`. Quando o servidor confirma (POST → refetch), o temp some no próximo tick porque `pendingCount` zera e o estado é substituído pelo remoto.

- [ ] **Step 5: Checkpoint (opcional)** — commit "feat(sync): tipos, constantes e reconciliação pura".

---

## Task 3: Hook de status online/offline

**Files:**
- Create: `src/lib/useOnlineStatus.ts`

**Interfaces:**
- Produces: `useOnlineStatus(): boolean` — `true` quando online. SSR-safe (assume `true` no servidor).

- [ ] **Step 1: Implementar o hook**

Crie `src/lib/useOnlineStatus.ts`:

```ts
'use client'

import { useEffect, useState } from 'react'

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return online
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros. Verificação manual ocorre na Task 8 (banner) via DevTools → Network → Offline.

- [ ] **Step 3: Checkpoint (opcional)** — commit "feat(sync): hook useOnlineStatus".

---

## Task 4: Sistema de Toast

**Files:**
- Create: `src/lib/ToastContext.tsx`
- Create: `src/components/Toaster.tsx`
- Modify: `src/components/Providers.tsx`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `useToast(): { show, success, error, info }` onde cada método tem assinatura `(message: string) => void`.
  - `<ToastProvider>` e `<Toaster />`.

- [ ] **Step 1: Context + provider**

Crie `src/lib/ToastContext.tsx`:

```tsx
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
```

- [ ] **Step 2: Componente Toaster**

Crie `src/components/Toaster.tsx`:

```tsx
'use client'

import { useToast } from '@/lib/ToastContext'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'

const styles = {
  success: { icon: CheckCircle2, cls: 'border-emerald-200 bg-emerald-50 text-emerald-800' },
  error: { icon: AlertCircle, cls: 'border-red-200 bg-red-50 text-red-800' },
  info: { icon: Info, cls: 'border-blue-200 bg-blue-50 text-blue-800' },
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
```

- [ ] **Step 3: Ligar no Providers**

Substitua `src/components/Providers.tsx`:

```tsx
'use client'

import { FontSizeProvider } from '@/lib/FontSizeContext'
import { ToastProvider } from '@/lib/ToastContext'
import Toaster from '@/components/Toaster'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FontSizeProvider>
      <ToastProvider>
        {children}
        <Toaster />
      </ToastProvider>
    </FontSizeProvider>
  )
}
```

- [ ] **Step 4: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

Manual: adicione temporariamente um `useToast().info('teste')` num clique e confirme o toast aparecer e sumir em ~4s (remova o teste depois). Verificação real acontece nas Tasks 6–9.

- [ ] **Step 5: Checkpoint (opcional)** — commit "feat: sistema de toasts".

---

## Task 5: Hook `useListSync` (polling + mutações + fila)

**Files:**
- Create: `src/lib/useListSync.ts`

**Interfaces:**
- Consumes: `POLL_INTERVAL_MS`, `Item`, `QueuedMutation`, `SyncStatusValue`, `applySnapshot`, `useOnlineStatus`, `useToast`.
- Produces: `useListSync(listId: string)` retornando:
  ```ts
  {
    items: Item[]
    status: SyncStatusValue
    lastSyncedAt: number | null
    online: boolean
    syncNow: () => void
    setEditing: (editing: boolean) => void
    addItem: (name: string, quantity: string) => void
    updateItem: (itemId: string, patch: Partial<Pick<Item,'name'|'quantity'|'is_checked'|'is_promotion'>> & { photo_base64?: string }) => void
    deleteItem: (itemId: string) => void
    clearChecked: () => void
  }
  ```

- [ ] **Step 1: Implementar o hook**

Crie `src/lib/useListSync.ts`:

```ts
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
  const online = useOnlineStatus()
  const toast = useToast()

  // refs para evitar stale closures dentro do intervalo
  const pendingCount = useRef(0)
  const editingRef = useRef(false)
  const itemsRef = useRef<Item[]>([])
  const queueRef = useRef<QueuedMutation[]>([])
  const flushingRef = useRef(false)
  itemsRef.current = items

  const fetchItems = useCallback(async (manual = false): Promise<boolean> => {
    if (pendingCount.current > 0 || editingRef.current) return false
    if (manual) setStatus('syncing')
    try {
      const res = await fetch(`/api/lists/${listId}/items`)
      if (!res.ok) throw new Error('fetch failed')
      const remote: Item[] = await res.json()
      setItems(applySnapshot(itemsRef.current, remote))
      setLastSyncedAt(Date.now())
      setStatus('synced')
      return true
    } catch {
      setStatus(navigator.onLine ? 'error' : 'offline')
      if (manual) toast.error('Não foi possível sincronizar.')
      return false
    }
  }, [listId, toast])

  // carga inicial
  useEffect(() => {
    setStatus('syncing')
    fetchItems()
  }, [fetchItems])

  // polling, pausado em background
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

  // executa uma mutação contra a API (sem otimismo — já aplicado por quem chama)
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

  // tenta enviar uma mutação agora; se offline ou falhar, enfileira
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

  // flush da fila ao reconectar / sincronizar
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

  // ---- API otimista para os componentes ----

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
    items, status, lastSyncedAt, online,
    syncNow, setEditing,
    addItem, updateItem, deleteItem, clearChecked,
  }
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

Verificação funcional acontece junto da Task 7 (página usa o hook). Aqui só garantimos compilação e assinaturas.

- [ ] **Step 3: Checkpoint (opcional)** — commit "feat(sync): hook useListSync com polling e fila".

---

## Task 6: Componentes `SyncStatus` e `OfflineBanner`

**Files:**
- Create: `src/components/SyncStatus.tsx`
- Create: `src/components/OfflineBanner.tsx`

**Interfaces:**
- Consumes: `SyncStatusValue`.
- Produces:
  - `<SyncStatus status, lastSyncedAt, online, onSync />`
  - `<OfflineBanner online, queued? />`

- [ ] **Step 1: SyncStatus**

Crie `src/components/SyncStatus.tsx`:

```tsx
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
      <span className="hidden xs:inline whitespace-nowrap">{label}</span>
      <RefreshCw size={14} className="xs:ml-0.5" />
    </button>
  )
}
```

- [ ] **Step 2: OfflineBanner**

Crie `src/components/OfflineBanner.tsx`:

```tsx
'use client'

import { CloudOff } from 'lucide-react'

type Props = { online: boolean }

export default function OfflineBanner({ online }: Props) {
  if (online) return null
  return (
    <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800 animate-fade-in">
      <CloudOff size={16} className="shrink-0" />
      <span>Você está offline. As mudanças serão enviadas quando a conexão voltar.</span>
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

- [ ] **Step 4: Checkpoint (opcional)** — commit "feat: componentes SyncStatus e OfflineBanner".

---

## Task 7: Página da lista usando o hook + progresso + busca + limpar comprados

**Files:**
- Modify: `src/app/lists/[id]/page.tsx`
- Create: `src/components/ListProgress.tsx`
- Create: `src/components/ItemSearch.tsx`
- Modify: `src/components/ItemCard.tsx`

**Interfaces:**
- Consumes: `useListSync`, `SyncStatus`, `OfflineBanner`, `ListProgress`, `ItemSearch`, callback de foto on-demand.
- Produces: nada para tarefas posteriores.

- [ ] **Step 1: ListProgress**

Crie `src/components/ListProgress.tsx`:

```tsx
'use client'

type Props = { total: number; checked: number }

export default function ListProgress({ total, checked }: Props) {
  if (total === 0) return null
  const pct = Math.round((checked / total) * 100)
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-slate-500 mb-1.5">
        <span>{checked} de {total} comprados</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: ItemSearch**

Crie `src/components/ItemSearch.tsx`:

```tsx
'use client'

import { Search, X } from 'lucide-react'

type Props = { value: string; onChange: (v: string) => void }

export default function ItemSearch({ value, onChange }: Props) {
  return (
    <div className="relative mb-4">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        placeholder="Buscar item..."
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Atualizar ItemCard para `has_photo` + foto sob demanda**

Em `src/components/ItemCard.tsx`: troque o tipo `Item` (campo `photo_base64: string` → `has_photo: number`), troque a prop `onViewPhoto` para opcional `onViewPhoto?: () => void` (já é), e ajuste o botão "Ver foto" e o preview inline para usar `has_photo` e o callback (o base64 não está mais no item). Substitua o tipo e o bloco de ações de foto:

```tsx
type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  has_photo: number
}
```

E o trecho do botão "Ver foto" + preview inline passa a depender de `item.has_photo` e delegar tudo ao `onViewPhoto` (remova o estado `showPhoto` e o preview inline, que dependiam do base64 local):

```tsx
        {!!item.has_photo && onViewPhoto && (
          <IconButton
            icon={<Eye size={14} />}
            onClick={onViewPhoto}
            title="Ver foto"
          />
        )}
```

Remova o `useState` `showPhoto`, o `import { useState }` se não usado, e o bloco `{showPhoto && item.photo_base64 && (...)}` ao fim do componente.

- [ ] **Step 4: Reescrever a página da lista**

Substitua `src/app/lists/[id]/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import AddItemForm from '@/components/AddItemForm'
import ItemCard from '@/components/ItemCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import ImageViewer from '@/components/ImageViewer'
import AccessibilityBar from '@/components/AccessibilityBar'
import SyncStatus from '@/components/SyncStatus'
import OfflineBanner from '@/components/OfflineBanner'
import ListProgress from '@/components/ListProgress'
import ItemSearch from '@/components/ItemSearch'
import { useListSync } from '@/lib/useListSync'
import { useToast } from '@/lib/ToastContext'
import type { Item } from '@/lib/sync/types'

export default function ListPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const {
    items, status, lastSyncedAt, online, syncNow, setEditing,
    addItem, updateItem, deleteItem, clearChecked,
  } = useListSync(id)

  const [listName, setListName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch(`/api/lists/${id}`).then(r => r.json()).then(d => setListName(d.name))
  }, [id])

  useEffect(() => { setEditing(editingId !== null) }, [editingId, setEditing])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? items.filter(i => i.name.toLowerCase().includes(q)) : items
  }, [items, query])

  const unchecked = filtered.filter(i => !i.is_checked)
  const checked = filtered.filter(i => i.is_checked)
  const totalChecked = items.filter(i => i.is_checked).length

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditName(item.name)
    setEditQty(item.quantity)
  }

  function saveEdit(itemId: string) {
    if (!editName.trim()) return
    updateItem(itemId, { name: editName.trim(), quantity: editQty.trim() })
    setEditingId(null)
  }

  async function openPhoto(itemId: string) {
    try {
      const res = await fetch(`/api/items/${itemId}/photo`)
      const data = await res.json()
      if (data.photo_base64) setViewingPhoto(data.photo_base64)
      else toast.info('Este item não tem foto.')
    } catch {
      toast.error('Não foi possível carregar a foto.')
    }
  }

  function handlePhoto(file: File, itemId: string) {
    const reader = new FileReader()
    reader.onload = () => updateItem(itemId, { photo_base64: reader.result as string })
    reader.readAsDataURL(file)
  }

  function renderCard(item: Item) {
    if (editingId === item.id) {
      return (
        <EditInline
          name={editName} qty={editQty}
          onNameChange={setEditName} onQtyChange={setEditQty}
          onSave={() => saveEdit(item.id)} onCancel={() => setEditingId(null)}
        />
      )
    }
    return (
      <ItemCard
        item={item}
        onToggleCheck={() => updateItem(item.id, { is_checked: item.is_checked ? 0 : 1 })}
        onTogglePromotion={() => updateItem(item.id, { is_promotion: item.is_promotion ? 0 : 1 })}
        onEdit={() => startEdit(item)}
        onDelete={() => setDeleteTarget(item)}
        onPhoto={(file) => handlePhoto(file, item.id)}
        onViewPhoto={() => openPhoto(item.id)}
      />
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <PageHeader title={listName} backTo="/" />
        </div>
        <AccessibilityBar />
      </div>

      <div className="flex items-center justify-between mb-5">
        <SyncStatus status={status} lastSyncedAt={lastSyncedAt} online={online} onSync={syncNow} />
        {totalChecked > 0 && (
          <button
            onClick={() => setClearOpen(true)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors active:scale-95"
          >
            <Trash2 size={14} /> Limpar comprados
          </button>
        )}
      </div>

      <OfflineBanner online={online} />

      <AddItemForm
        onAdd={addItem}
        existingNames={items.map(i => i.name)}
        onDuplicate={(name) => toast.info(`"${name}" já está na lista — adicionado mesmo assim.`)}
      />

      <ListProgress total={items.length} checked={totalChecked} />

      {items.length > 8 && <ItemSearch value={query} onChange={setQuery} />}

      <div className="space-y-2">
        {unchecked.map((item, i) => (
          <div key={item.id} className="relative" style={{ animationDelay: `${i * 30}ms` }}>
            {renderCard(item)}
          </div>
        ))}

        {checked.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 px-1">
              Comprados ({checked.length})
            </p>
            <div className="space-y-2">
              {checked.map(item => (
                <div key={item.id} className="relative">{renderCard(item)}</div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <EmptyState message="Nenhum item ainda. Adicione produtos acima!" />
        )}
        {items.length > 0 && filtered.length === 0 && (
          <EmptyState message="Nenhum item encontrado para a busca." />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir item"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir" cancelLabel="Cancelar" variant="danger"
        onConfirm={() => { if (deleteTarget) deleteItem(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={clearOpen}
        title="Limpar comprados"
        message={`Remover os ${totalChecked} itens já comprados desta lista?`}
        confirmLabel="Limpar" cancelLabel="Cancelar" variant="danger"
        onConfirm={() => { clearChecked(); setClearOpen(false) }}
        onCancel={() => setClearOpen(false)}
      />

      {viewingPhoto && (
        <ImageViewer src={viewingPhoto} alt="Foto do item" onClose={() => setViewingPhoto(null)} />
      )}
    </div>
  )
}

function EditInline({
  name, qty, onNameChange, onQtyChange, onSave, onCancel,
}: {
  name: string; qty: string
  onNameChange: (v: string) => void; onQtyChange: (v: string) => void
  onSave: () => void; onCancel: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm px-4 py-3 flex gap-2 items-center animate-fade-in">
      <input
        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        autoFocus
      />
      <input
        className="w-16 h-9 px-2 rounded-lg border border-slate-200 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        value={qty}
        onChange={e => onQtyChange(e.target.value)}
      />
      <button
        className="h-9 px-3 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 active:scale-95 transition-all"
        onClick={onSave}
      >
        OK
      </button>
    </div>
  )
}
```

> Nota: `animate-fadeIn` foi corrigido para `animate-fade-in` (classe real definida no globals.css).

- [ ] **Step 5: Verificar (typecheck + manual com dois navegadores)**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run dev`. Abra a mesma lista em duas abas/dispositivos:
- Marcar item na aba A aparece na aba B em ≤ ~5s.
- Adicionar/editar/excluir propaga.
- `SyncStatus` mostra "Atualizado agora/há Xs" e o spinner em ação manual.
- Barra de progresso reflete comprados/total.
- "Limpar comprados" remove os marcados (com confirmação).
- Com > 8 itens, a busca filtra.
- Clicar no olho carrega a foto sob demanda.

- [ ] **Step 6: Checkpoint (opcional)** — commit "feat: lista em tempo real com progresso, busca e limpar comprados".

---

## Task 8: AddItemForm — autofocus + aviso de duplicado

**Files:**
- Modify: `src/components/AddItemForm.tsx`

**Interfaces:**
- Consumes: nada novo.
- Produces: `<AddItemForm onAdd existingNames? onDuplicate? />`
  - `onAdd: (name: string, quantity: string) => void`
  - `existingNames?: string[]`
  - `onDuplicate?: (name: string) => void`

- [ ] **Step 1: Atualizar o componente**

Substitua `src/components/AddItemForm.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

type Props = {
  onAdd: (name: string, quantity: string) => void
  existingNames?: string[]
  onDuplicate?: (name: string) => void
}

export default function AddItemForm({ onAdd, existingNames = [], onDuplicate }: Props) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const dup = existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase())
    if (dup && onDuplicate) onDuplicate(trimmed)
    onAdd(trimmed, qty.trim())
    setName('')
    setQty('')
  }

  return (
    <div className="flex gap-2 mb-6">
      <div className="flex-1 relative">
        <input
          className="w-full h-11 pl-4 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="Produto..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          autoFocus
        />
      </div>
      <input
        className="w-20 h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center"
        placeholder="Qtd"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      <button
        className="h-11 w-11 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all shadow-sm shadow-blue-200"
        onClick={handleSubmit}
      >
        <Plus size={20} />
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

Manual: o campo "Produto..." recebe foco ao abrir a lista; adicionar um nome já existente mostra o toast de duplicado e ainda adiciona.

- [ ] **Step 3: Checkpoint (opcional)** — commit "feat: autofocus e aviso de duplicado no AddItemForm".

---

## Task 9: Home — `useListsSync`, status de sync e contagem de itens

**Files:**
- Create: `src/lib/useListsSync.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `POLL_INTERVAL_MS`, `useOnlineStatus`, `useToast`, `SyncStatus`, `OfflineBanner`.
- Produces: `useListsSync()` →
  ```ts
  {
    lists: Array<{ id: string; name: string; created_at: string; item_count: number }>
    status: SyncStatusValue
    lastSyncedAt: number | null
    online: boolean
    syncNow: () => void
    createList: (name: string) => void
    renameList: (id: string, name: string) => void
    deleteList: (id: string) => void
  }
  ```

- [ ] **Step 1: Implementar useListsSync**

Crie `src/lib/useListsSync.ts`:

```ts
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { POLL_INTERVAL_MS } from '@/lib/sync/constants'
import type { SyncStatusValue } from '@/lib/sync/types'
import { useOnlineStatus } from '@/lib/useOnlineStatus'
import { useToast } from '@/lib/ToastContext'

export type ListRow = { id: string; name: string; created_at: string; item_count: number }

export function useListsSync() {
  const [lists, setLists] = useState<ListRow[]>([])
  const [status, setStatus] = useState<SyncStatusValue>('idle')
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null)
  const online = useOnlineStatus()
  const toast = useToast()
  const pendingCount = useRef(0)

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

  const createList = useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const tempId = `temp-${crypto.randomUUID()}`
    setLists(prev => [{ id: tempId, name: trimmed, created_at: new Date().toISOString(), item_count: 0 }, ...prev])
    mutate(
      () => fetch('/api/lists', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      }),
      () => setLists(prev => prev.filter(l => l.id !== tempId)),
    )
  }, [mutate])

  const renameList = useCallback((id: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setLists(prev => { return prev })
    const snapshot = lists
    setLists(prev => prev.map(l => (l.id === id ? { ...l, name: trimmed } : l)))
    mutate(
      () => fetch(`/api/lists/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      }),
      () => setLists(snapshot),
    )
  }, [mutate, lists])

  const deleteList = useCallback((id: string) => {
    const snapshot = lists
    setLists(prev => prev.filter(l => l.id !== id))
    mutate(
      () => fetch(`/api/lists/${id}`, { method: 'DELETE' }),
      () => setLists(snapshot),
    )
  }, [mutate, lists])

  const syncNow = useCallback(() => fetchLists(true), [fetchLists])

  return { lists, status, lastSyncedAt, online, syncNow, createList, renameList, deleteList }
}
```

- [ ] **Step 2: Reescrever a home**

Substitua `src/app/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShoppingBag, Check } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import AccessibilityBar from '@/components/AccessibilityBar'
import SyncStatus from '@/components/SyncStatus'
import OfflineBanner from '@/components/OfflineBanner'
import { useListsSync, type ListRow } from '@/lib/useListsSync'

export default function Home() {
  const { lists, status, lastSyncedAt, online, syncNow, createList, renameList, deleteList } = useListsSync()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ListRow | null>(null)
  const router = useRouter()

  function handleCreate() {
    if (!newName.trim()) return
    createList(newName)
    setNewName('')
  }

  function handleRename(id: string) {
    if (!editName.trim()) return
    renameList(id, editName)
    setEditingId(null)
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <ShoppingBag size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 flex-1">Minhas Listas</h1>
        <AccessibilityBar />
      </div>

      <div className="mb-5">
        <SyncStatus status={status} lastSyncedAt={lastSyncedAt} online={online} onSync={syncNow} />
      </div>

      <OfflineBanner online={online} />

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <input
            className="w-full h-11 pl-4 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Nova lista..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
        </div>
        <button
          className="h-11 w-11 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all shadow-sm shadow-blue-200"
          onClick={handleCreate}
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-2">
        {lists.map((list, i) => (
          <div
            key={list.id}
            className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3 transition-all duration-200 hover:border-slate-200 active:scale-[0.98] animate-slide-up"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            {editingId === list.id ? (
              <div className="flex gap-2 flex-1 items-center">
                <input
                  className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(list.id); if (e.key === 'Escape') setEditingId(null) }}
                  autoFocus
                />
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
                  onClick={() => handleRename(list.id)}
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/lists/${list.id}`)}>
                <p className="text-sm font-medium text-slate-900 truncate">{list.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {list.item_count} {list.item_count === 1 ? 'item' : 'itens'} · {formatDate(list.created_at)}
                </p>
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-90"
                onClick={() => { setEditingId(list.id); setEditName(list.name) }}
                title="Renomear"
              >
                <Pencil size={14} />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all active:scale-90"
                onClick={() => setDeleteTarget(list)}
                title="Excluir"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}

        {lists.length === 0 && (
          <EmptyState message="Nenhuma lista ainda. Crie uma acima!" />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir lista"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Todos os itens serão perdidos.`}
        confirmLabel="Excluir" cancelLabel="Cancelar" variant="danger"
        onConfirm={() => { if (deleteTarget) deleteList(deleteTarget.id); setDeleteTarget(null) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 3: Verificar**

Run: `npx tsc --noEmit`
Expected: sem erros.

Run: `npm run dev`. Na home:
- Lista mostra "N itens · data".
- `SyncStatus` atualiza; criar/renomear/excluir propaga entre abas em ≤ ~5s.
- Criar lista com falha (DevTools offline) faz rollback + toast.

- [ ] **Step 4: Checkpoint (opcional)** — commit "feat: home em tempo real com contagem de itens".

---

## Task 10: Verificação final ponta a ponta

**Files:** nenhum (validação).

- [ ] **Step 1: Build de produção**

Run: `npm run build`
Expected: build conclui sem erros de tipo nem de lint.

- [ ] **Step 2: Roteiro manual completo (dois dispositivos/abas)**

- [ ] Tempo real: alterações em A aparecem em B em ≤ ~5s (toggle, add, edit, delete, promo, rename de lista, contagem na home).
- [ ] Botão sincronizar: clicar mostra spinner e atualiza imediatamente.
- [ ] Background: trocar de aba pausa o polling; voltar dispara refetch na hora.
- [ ] Offline (DevTools → Network → Offline): banner aparece; mudanças ficam otimistas; status "Sem conexão".
- [ ] Reconexão: voltar online envia a fila e mostra toast "Mudanças sincronizadas".
- [ ] Erro: forçar 500 numa mutação → rollback + toast de erro.
- [ ] Progresso, busca (> 8 itens), limpar comprados, foto sob demanda, autofocus, aviso de duplicado.

- [ ] **Step 3: Checkpoint (opcional)** — commit "chore: verificação final usabilidade + tempo real".

---

## Self-Review (preenchido)

- **Cobertura da spec:** §1 polling → Tasks 5,7,9; §2 payload leve/foto → Task 1, ItemCard/página Task 7; §3 SyncStatus → Tasks 6,7,9; §4 toast/offline/fila → Tasks 3,4,5; §5 progresso/limpar/busca/contagem → Tasks 7,9; §6 autofocus/duplicado → Task 8 (autofocus home na Task 9). ✔
- **Placeholders:** nenhum "TBD"/"TODO"; todo passo tem código completo. ✔
- **Consistência de tipos:** `Item` com `has_photo` usado igual em `types.ts`, `useListSync`, `ItemCard`, página. `SyncStatusValue` idem. Assinaturas de `addItem/updateItem/deleteItem/clearChecked` batem entre Task 5 e Task 7. `AddItemForm` props batem entre Task 7 (uso) e Task 8 (definição). `SyncStatus` props batem entre Task 6 e usos (7/9). ✔
- **Nota de risco:** `renameList` na Task 9 tira snapshot de `lists` da closure (dependência incluída no `useCallback`); aceitável para o volume da home.
