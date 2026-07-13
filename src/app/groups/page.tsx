'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Users, UserPlus, UserX, Trash2, X, Check, LogOut } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import { useAuth } from '@/lib/AuthContext'
import { useToast } from '@/lib/ToastContext'

type GroupMember = { id: string; username: string }

type Group = {
  id: string
  name: string
  created_by: string
  member_count: number
  created_at: string
  members?: GroupMember[]
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [creating, setCreating] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [groupDetails, setGroupDetails] = useState<Record<string, Group>>({})
  const [addMemberUsername, setAddMemberUsername] = useState('')
  const [addingMember, setAddingMember] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null)
  const { user } = useAuth()
  const router = useRouter()
  const toast = useToast()

  async function fetchGroups() {
    try {
      const res = await fetch('/api/groups')
      if (res.ok) setGroups(await res.json())
    } catch {
      toast.error('Não foi possível carregar os grupos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  async function handleCreate() {
    if (!newGroupName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName.trim() }),
      })
      if (res.ok) {
        setNewGroupName('')
        toast.success('Grupo criado!')
        fetchGroups()
      } else {
        const data = await res.json()
        toast.error(data.error)
      }
    } catch {
      toast.error('Erro ao criar grupo.')
    }
    setCreating(false)
  }

  async function toggleExpand(groupId: string) {
    if (expandedGroup === groupId) {
      setExpandedGroup(null)
      return
    }
    setExpandedGroup(groupId)
    if (!groupDetails[groupId]) {
      try {
        const res = await fetch(`/api/groups/${groupId}`)
        if (res.ok) {
          const data = await res.json()
          setGroupDetails(prev => ({ ...prev, [groupId]: data }))
        }
      } catch {
        toast.error('Erro ao carregar detalhes do grupo.')
      }
    }
  }

  async function handleAddMember(groupId: string) {
    if (!addMemberUsername.trim()) return
    setAddingMember(true)
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: addMemberUsername.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setAddMemberUsername('')
        toast.success(`${data.username} adicionado ao grupo!`)
        const res2 = await fetch(`/api/groups/${groupId}`)
        if (res2.ok) {
          const detail = await res2.json()
          setGroupDetails(prev => ({ ...prev, [groupId]: detail }))
        }
        fetchGroups()
      } else {
        toast.error(data.error)
      }
    } catch {
      toast.error('Erro ao adicionar membro.')
    }
    setAddingMember(false)
  }

  async function handleRemoveMember(groupId: string, memberId: string, username: string) {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (res.ok) {
        toast.success(`${username} removido do grupo.`)
        const res2 = await fetch(`/api/groups/${groupId}`)
        if (res2.ok) {
          const detail = await res2.json()
          setGroupDetails(prev => ({ ...prev, [groupId]: detail }))
        }
        fetchGroups()
      } else {
        toast.error('Erro ao remover membro.')
      }
    } catch {
      toast.error('Erro ao remover membro.')
    }
  }

  async function handleDelete(groupId: string) {
    try {
      const res = await fetch(`/api/groups/${groupId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Grupo excluído.')
        setDeleteTarget(null)
        fetchGroups()
      } else {
        toast.error('Erro ao excluir grupo.')
      }
    } catch {
      toast.error('Erro ao excluir grupo.')
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/')}
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Grupos</h1>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <input
            className="w-full h-11 pl-4 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            placeholder="Nome do novo grupo..."
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <button
          disabled={creating}
          className="h-11 w-11 flex items-center justify-center rounded-xl bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 active:bg-blue-800 dark:active:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 shadow-sm shadow-blue-200 dark:shadow-none"
          onClick={handleCreate}
        >
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-8">Carregando...</p>
      ) : groups.length === 0 ? (
        <EmptyState message="Nenhum grupo ainda. Crie um acima!" />
      ) : (
        <div className="space-y-2">
          {groups.map(group => {
            const isOwner = group.created_by === user?.userId
            const details = groupDetails[group.id]
            const members = details?.members || []
            const isExpanded = expandedGroup === group.id

            return (
              <div key={group.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/30 transition-all">
                <button
                  className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                  onClick={() => toggleExpand(group.id)}
                >
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{group.name}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                      {group.member_count} {group.member_count === 1 ? 'membro' : 'membros'}
                      {isOwner && <span className="ml-2 text-indigo-500 dark:text-indigo-400">· Dono</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {isOwner && (
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(group) }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                        title="Excluir grupo"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    <button
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                        isExpanded ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700/50 animate-fade-in">
                    {isOwner && (
                      <div className="flex gap-2 mt-3">
                        <input
                          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          placeholder="Adicionar membro por usuário..."
                          value={addMemberUsername}
                          onChange={e => setAddMemberUsername(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleAddMember(group.id) }}
                        />
                        <button
                          disabled={addingMember || !addMemberUsername.trim()}
                          className="h-9 w-9 flex items-center justify-center rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
                          onClick={() => handleAddMember(group.id)}
                        >
                          <UserPlus size={16} />
                        </button>
                      </div>
                    )}

                    <div className="mt-3 space-y-1">
                      {group.created_by === user?.userId && (
                        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                          <div className="flex items-center gap-2">
                            <Users size={14} className="text-indigo-500 dark:text-indigo-400" />
                            <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">{user?.username}</span>
                          </div>
                          <span className="text-xs text-indigo-400 dark:text-indigo-300 font-medium">Dono</span>
                        </div>
                      )}
                      {members.map((member: GroupMember) => (
                        <div key={member.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <span className="text-sm text-slate-700 dark:text-slate-300">{member.username}</span>
                          {isOwner && (
                            <button
                              onClick={() => handleRemoveMember(group.id, member.id, member.username)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                              title="Remover membro"
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir grupo"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? As listas compartilhadas com este grupo não serão mais acessíveis aos membros.`}
        confirmLabel="Excluir" cancelLabel="Cancelar" variant="danger"
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget.id) }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
