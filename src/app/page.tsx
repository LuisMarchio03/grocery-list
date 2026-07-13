'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShoppingBag, Check, Users, LogOut, User, ChevronDown, RefreshCw } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import AccessibilityBar from '@/components/AccessibilityBar'
import SyncStatus from '@/components/SyncStatus'
import OfflineBanner from '@/components/OfflineBanner'
import { useListsSync, type ListRow } from '@/lib/useListsSync'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import { useAuth } from '@/lib/AuthContext'

type GroupOption = { id: string; name: string }

export default function Home() {
  const { lists, status, lastSyncedAt, online, externalChanges, syncNow, createList, renameList, deleteList } = useListsSync()
  const ptr = usePullToRefresh(syncNow)
  const { user, logout } = useAuth()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ListRow | null>(null)
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/groups').then(r => r.ok && r.json()).then(data => {
      if (data) setGroups(data)
    })
  }, [])

  function handleCreate() {
    if (!newName.trim()) return
    createList(newName, selectedGroup || undefined)
    setNewName('')
    setSelectedGroup('')
    setShowGroupPicker(false)
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
    <div
      onTouchStart={ptr.onTouchStart}
      onTouchMove={ptr.onTouchMove}
      onTouchEnd={ptr.onTouchEnd}
    >
      {ptr.pulling && (
        <div className="flex justify-center items-center h-16 -mt-4 mb-2 transition-all" style={{ opacity: Math.min(ptr.pullDistance / 80, 1) }}>
          <div className="flex items-center gap-2 text-xs text-blue-500 dark:text-blue-400 font-medium">
            <RefreshCw size={14} className={ptr.pullDistance >= 80 ? 'animate-spin' : ''} />
            {ptr.pullDistance >= 80 ? 'Solte para atualizar' : 'Puxe para atualizar'}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <ShoppingBag size={20} className="text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex-1">Minhas Listas</h1>
        <AccessibilityBar />
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <User size={14} />
          <span>{user?.username}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/groups')}
            className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg px-3 py-1.5"
          >
            <Users size={14} /> Grupos
          </button>
          <button
            onClick={logout}
            className="text-xs flex items-center gap-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-3 py-1.5"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>

      <div className="mb-5">
        <SyncStatus status={status} lastSyncedAt={lastSyncedAt} online={online} onSync={syncNow} hasChanges={externalChanges} />
      </div>

      <OfflineBanner online={online} />

      <div className="mb-6">
        <div className="flex gap-2">
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

        {groups.length > 0 && (
          <div className="mt-2 relative">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors px-1 py-1"
              onClick={() => setShowGroupPicker(!showGroupPicker)}
            >
              <Users size={12} />
              {selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : 'Lista privada'}
              <ChevronDown size={12} />
            </button>
            {showGroupPicker && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg dark:shadow-slate-900/50 z-10 py-1 min-w-[160px] animate-fade-in">
                <button
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${!selectedGroup ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  onClick={() => { setSelectedGroup(''); setShowGroupPicker(false) }}
                >
                  <User size={14} />
                  Privada
                </button>
                {groups.map(g => (
                  <button
                    key={g.id}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${selectedGroup === g.id ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                    onClick={() => { setSelectedGroup(g.id); setShowGroupPicker(false) }}
                  >
                    <Users size={14} />
                    {g.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {lists.map((list, i) => (
          <div
            key={list.id}
            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/30 px-4 py-3.5 flex items-center gap-3 transition-all duration-200 hover:border-slate-200 dark:hover:border-slate-600 active:scale-[0.98] animate-slide-up"
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
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{list.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                  {list.item_count} {list.item_count === 1 ? 'item' : 'itens'} · {formatDate(list.created_at)}
                  {list.group_name && (
                    <span className="ml-2 inline-flex items-center gap-1 text-blue-500 dark:text-blue-400">
                      <Users size={10} /> {list.group_name}
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="flex items-center gap-1 shrink-0">
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-90"
                onClick={() => { setEditingId(list.id); setEditName(list.name) }}
                title="Renomear"
              >
                <Pencil size={14} />
              </button>
              <button
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90"
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
