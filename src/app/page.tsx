'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShoppingBag, Check } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'

type List = {
  id: string
  name: string
  created_at: string
}

export default function Home() {
  const [lists, setLists] = useState<List[]>([])
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<List | null>(null)
  const router = useRouter()

  async function fetchLists() {
    const res = await fetch('/api/lists')
    const data = await res.json()
    setLists(data)
  }

  useEffect(() => { fetchLists() }, [])

  async function createList() {
    if (!newName.trim()) return
    await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    setNewName('')
    fetchLists()
  }

  async function deleteList() {
    if (!deleteTarget) return
    await fetch(`/api/lists/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    fetchLists()
  }

  async function renameList(id: string) {
    if (!editName.trim()) return
    await fetch(`/api/lists/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    })
    setEditingId(null)
    fetchLists()
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <ShoppingBag size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900">Minhas Listas</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <input
            className="w-full h-11 pl-4 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Nova lista..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createList()}
          />
        </div>
        <button
          className="h-11 w-11 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all shadow-sm shadow-blue-200"
          onClick={createList}
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
                  onKeyDown={e => {
                    if (e.key === 'Enter') renameList(list.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                />
                <button
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
                  onClick={() => renameList(list.id)}
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => router.push(`/lists/${list.id}`)}
              >
                <p className="text-sm font-medium text-slate-900 truncate">{list.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatDate(list.created_at)}</p>
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-90"
                onClick={() => {
                  setEditingId(list.id)
                  setEditName(list.name)
                }}
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
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={deleteList}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
