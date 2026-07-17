'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Trash2, ShoppingBag, Check, Users, LogOut, User, ChevronDown, RefreshCw, X } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import IconButton from '@/components/IconButton'
import SettingsMenu from '@/components/SettingsMenu'
import SyncStatus from '@/components/SyncStatus'
import OfflineBanner from '@/components/OfflineBanner'
import ListSkeleton from '@/components/ListSkeleton'
import { useListsSync, type ListRow } from '@/lib/useListsSync'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import { useAuth } from '@/lib/AuthContext'

type GroupOption = { id: string; name: string }

export default function Home() {
  const { lists, status, lastSyncedAt, online, externalChanges, syncNow, createList, updateList, deleteList } = useListsSync()
  // lastSyncedAt só é preenchido após um fetch bem-sucedido (useListsSync.ts:39),
  // então null == nenhum carregamento completou. Em erro/offline mostramos o
  // estado real em vez de um skeleton eterno.
  const loadingFirst = lastSyncedAt === null && status !== 'error' && status !== 'offline'
  const ptr = usePullToRefresh(syncNow)
  const { user, logout } = useAuth()
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editGroupId, setEditGroupId] = useState<string | null | undefined>(undefined)
  const [deleteTarget, setDeleteTarget] = useState<ListRow | null>(null)
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const [showEditGroupPicker, setShowEditGroupPicker] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/groups').then(r => r.ok && r.json()).then(data => {
      if (data) setGroups(data)
    })
  }, [])

  function handleCreatePrivate() {
    if (!newName.trim()) return
    createList(newName)
    setNewName('')
  }

  function handleCreateInGroup(groupId: string) {
    if (!newName.trim()) return
    createList(newName, groupId)
    setNewName('')
    setShowGroupPicker(false)
  }

  function handleSaveEdit(id: string) {
    if (!editName.trim()) return
    updateList(id, editName, editGroupId)
    cancelEdit()
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditGroupId(undefined)
    setShowEditGroupPicker(false)
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
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 truncate">
          Minhas Listas
        </h1>
        <SettingsMenu />
      </div>

      <div className="flex items-center justify-between flex-wrap gap-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 min-w-0">
          <User size={14} />
          <span className="truncate">{user?.username}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/groups')}
            className="min-h-[max(2.75rem,44px)] text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg px-3"
          >
            <Users className="w-4 h-4" /> Grupos
          </button>
          <button
            onClick={logout}
            className="min-h-[max(2.75rem,44px)] text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-3"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </div>

      <div className="mb-5">
        <SyncStatus status={status} lastSyncedAt={lastSyncedAt} online={online} onSync={syncNow} hasChanges={externalChanges} />
      </div>

      <OfflineBanner online={online} />

      <div className="mb-6">
        <div className="flex gap-2 mb-2">
          <div className="flex-1 relative">
            <input
              className="w-full h-11 pl-4 pr-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              placeholder="Nome da lista..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !groups.length) handleCreatePrivate()
              }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreatePrivate}
            disabled={!newName.trim()}
            className="flex-1 min-h-[max(2.75rem,44px)] flex items-center justify-center gap-2 rounded-xl bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-blue-200 dark:shadow-none"
          >
            <User className="w-4 h-4" /> Criar lista privada
          </button>
          {groups.length > 0 && (
            <div className="relative flex-1">
              <button
                onClick={() => setShowGroupPicker(!showGroupPicker)}
                disabled={!newName.trim()}
                className="w-full min-h-[max(2.75rem,44px)] flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                aria-expanded={showGroupPicker}
                aria-haspopup="listbox"
              >
                <Users className="w-4 h-4" /> Criar no grupo <ChevronDown className="w-3 h-3" />
              </button>
              {showGroupPicker && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg dark:shadow-slate-900/50 z-10 py-1 animate-fade-in">
                  {groups.map(g => (
                    <button
                      key={g.id}
                      className="w-full text-left px-3 min-h-[max(2.75rem,44px)] text-sm transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      onClick={() => handleCreateInGroup(g.id)}
                    >
                      <Users className="w-4 h-4" />
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {loadingFirst ? (
        <ListSkeleton />
      ) : (
      <div className="space-y-2">
        {lists.map(list => {
          const editing = editingId === list.id
          return (
          <div
            key={list.id}
            className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm dark:shadow-slate-900/30 px-4 transition-all duration-200 animate-fade-in ${
              editing
                ? 'border-blue-200 dark:border-blue-800 py-4'
                : 'border-slate-100 dark:border-slate-700/50 py-3.5 hover:border-slate-200 dark:hover:border-slate-600 active:scale-[0.98]'
            }`}
          >
            {editing ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    className="flex-1 h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(list.id); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                  />
                  <IconButton
                    icon={<Check className="w-5 h-5" />}
                    label="Salvar alterações"
                    variant="primary"
                    onClick={() => handleSaveEdit(list.id)}
                  />
                  <IconButton
                    icon={<X className="w-5 h-5" />}
                    label="Cancelar edição"
                    onClick={cancelEdit}
                  />
                </div>

                <div className="relative">
                  <button
                    onClick={() => setShowEditGroupPicker(!showEditGroupPicker)}
                    className="w-full min-h-[max(2.5rem,44px)] flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    aria-expanded={showEditGroupPicker}
                    aria-haspopup="listbox"
                  >
                    {editGroupId === null ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                    {editGroupId ? groups.find(g => g.id === editGroupId)?.name || 'Carregando...' : 'Lista privada'}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {showEditGroupPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg dark:shadow-slate-900/50 z-10 py-1 animate-fade-in">
                      <button
                        className={`w-full text-left px-3 min-h-[max(2.5rem,44px)] text-sm transition-colors flex items-center gap-2 ${editGroupId === null ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                        onClick={() => { setEditGroupId(null); setShowEditGroupPicker(false) }}
                      >
                        <User className="w-4 h-4" /> Privada
                      </button>
                      {groups.map(g => (
                        <button
                          key={g.id}
                          className={`w-full text-left px-3 min-h-[max(2.5rem,44px)] text-sm transition-colors flex items-center gap-2 ${editGroupId === g.id ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                          onClick={() => { setEditGroupId(g.id); setShowEditGroupPicker(false) }}
                        >
                          <Users className="w-4 h-4" /> {g.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <IconButton
                    icon={<Trash2 className="w-4 h-4" />}
                    label={`Excluir lista ${list.name}`}
                    variant="danger"
                    onClick={() => { cancelEdit(); setDeleteTarget(list) }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => router.push(`/lists/${list.id}`)}>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{list.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    {list.item_count} {list.item_count === 1 ? 'item' : 'itens'} · {formatDate(list.created_at)}
                    {list.group_name ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-blue-500 dark:text-blue-400">
                        <Users size={10} /> {list.group_name}
                      </span>
                    ) : (
                      <span className="ml-2 inline-flex items-center gap-1 text-slate-400">
                        <User size={10} /> Privada
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <IconButton
                    icon={<Pencil className="w-4 h-4" />}
                    label={`Editar lista ${list.name}`}
                    onClick={() => { setEditingId(list.id); setEditName(list.name); setEditGroupId(list.group_id ?? null) }}
                  />
                  <IconButton
                    icon={<Trash2 className="w-4 h-4" />}
                    label={`Excluir lista ${list.name}`}
                    variant="danger"
                    onClick={() => setDeleteTarget(list)}
                  />
                </div>
              </div>
            )}
          </div>
          )
        })}

        {lists.length === 0 && (
          <EmptyState message="Nenhuma lista ainda. Crie uma acima!" />
        )}
      </div>
      )}

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
