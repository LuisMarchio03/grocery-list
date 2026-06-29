'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShoppingBag, Check } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import AccessibilityBar from '@/components/AccessibilityBar'
import ThemeToggle from '@/components/ThemeToggle'
import { SkeletonList } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'

type List = {
  id: string
  name: string
  created_at: string
  total: number
  checked: number
}

export default function Home() {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<List | null>(null)
  const router = useRouter()
  const toast = useToast()

  async function fetchLists() {
    try {
      const res = await fetch('/api/lists')
      if (!res.ok) throw new Error()
      setLists(await res.json())
    } catch {
      toast('Não foi possível carregar as listas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLists() }, [])

  async function createList() {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error()
      setNewName('')
      fetchLists()
    } catch {
      toast('Não foi possível criar a lista.')
    }
  }

  async function deleteList() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      const res = await fetch(`/api/lists/${target.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchLists()
    } catch {
      toast('Não foi possível excluir a lista.')
    }
  }

  async function renameList(id: string) {
    if (!editName.trim()) return
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error()
      setEditingId(null)
      fetchLists()
    } catch {
      toast('Não foi possível renomear a lista.')
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
          <ShoppingBag size={22} className="text-accent-fg" />
        </div>
        <h1 className="text-xl font-semibold text-fg flex-1">Minhas Listas</h1>
        <ThemeToggle />
      </div>

      <div className="flex justify-end mb-4">
        <AccessibilityBar />
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <input
            className="w-full h-12 pl-4 pr-3 rounded-xl border border-border bg-surface text-base text-fg placeholder-fg-muted focus:border-accent transition-colors"
            placeholder="Nova lista..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createList()}
          />
        </div>
        <button
          className="h-12 w-12 flex items-center justify-center rounded-xl bg-accent text-accent-fg hover:bg-accent-hover active:scale-95 transition-all shrink-0"
          onClick={createList}
          title="Criar lista"
        >
          <Plus size={22} />
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : (
        <div className="space-y-2">
          {lists.map((list, i) => (
            <div
              key={list.id}
              className="bg-surface rounded-xl border border-border shadow-sm px-4 py-3.5 flex items-center gap-3 transition-all duration-200 hover:border-fg-muted/40 active:scale-[0.98] animate-slide-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {editingId === list.id ? (
                <div className="flex gap-2 flex-1 items-center">
                  <input
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-base text-fg focus:border-accent transition-colors"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameList(list.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <button
                    className="w-11 h-11 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
                    onClick={() => renameList(list.id)}
                    title="Salvar"
                  >
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/lists/${list.id}`)}
                >
                  <p className="text-base font-medium text-fg truncate">{list.name}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {list.total > 0
                      ? `${list.checked} de ${list.total} comprados · ${formatDate(list.created_at)}`
                      : formatDate(list.created_at)}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="w-11 h-11 flex items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90"
                  onClick={() => {
                    setEditingId(list.id)
                    setEditName(list.name)
                  }}
                  title="Renomear"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="w-11 h-11 flex items-center justify-center rounded-lg border border-border text-fg-muted hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950 transition-all active:scale-90"
                  onClick={() => setDeleteTarget(list)}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {lists.length === 0 && (
            <EmptyState message="Nenhuma lista ainda. Crie uma acima!" />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir lista"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Todos os itens serão perdidos.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={deleteList}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
