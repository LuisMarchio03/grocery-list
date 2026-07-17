'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { Trash2, Users, RefreshCw } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import AddItemForm from '@/components/AddItemForm'
import ItemCard from '@/components/ItemCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import ImageViewer from '@/components/ImageViewer'
import SettingsMenu from '@/components/SettingsMenu'
import SyncStatus from '@/components/SyncStatus'
import OfflineBanner from '@/components/OfflineBanner'
import ListProgress from '@/components/ListProgress'
import ItemSearch from '@/components/ItemSearch'
import { useListSync } from '@/lib/useListSync'
import { useToast } from '@/lib/ToastContext'
import { usePullToRefresh } from '@/lib/usePullToRefresh'
import type { Item } from '@/lib/sync/types'

export default function ListPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const {
    items, status, lastSyncedAt, online, externalChanges, syncNow, setEditing,
    addItem, updateItem, deleteItem, clearChecked,
  } = useListSync(id)
  const ptr = usePullToRefresh(syncNow)

  const [listName, setListName] = useState('')
  const [listGroup, setListGroup] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch(`/api/lists/${id}`).then(r => r.json()).then(d => {
      setListName(d.name)
      setListGroup(d.group_name || null)
    })
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
    <div
      onTouchStart={ptr.onTouchStart}
      onTouchMove={ptr.onTouchMove}
      onTouchEnd={ptr.onTouchEnd}
    >
      {ptr.pulling && (
        <div className="flex justify-center items-center h-16 -mt-4 mb-2 transition-all" style={{ opacity: Math.min(ptr.pullDistance / 80, 1) }}>
          <div className="flex items-center gap-2 text-xs text-blue-500 dark:text-blue-400 font-medium">
            <RefreshCw className={`w-4 h-4 ${ptr.pullDistance >= 80 ? 'animate-spin' : ''}`} />
            {ptr.pullDistance >= 80 ? 'Solte para atualizar' : 'Puxe para atualizar'}
          </div>
        </div>
      )}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <PageHeader title={listName} backTo="/" />
          {listGroup && (
            <p className="text-xs text-blue-500 dark:text-blue-400 flex items-center gap-1 mt-0.5 ml-10">
              <Users className="w-3 h-3" /> Compartilhada com {listGroup}
            </p>
          )}
        </div>
        <SettingsMenu />
      </div>

      <div className="flex items-center justify-between mb-5">
        <SyncStatus status={status} lastSyncedAt={lastSyncedAt} online={online} onSync={syncNow} hasChanges={externalChanges} />
        {totalChecked > 0 && (
          <button
            onClick={() => setClearOpen(true)}
            className="min-h-[max(2.75rem,44px)] px-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors active:scale-95"
          >
            <Trash2 className="w-4 h-4" /> Limpar comprados
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
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-1">
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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-blue-200 dark:border-blue-900 shadow-sm px-4 py-3 flex gap-2 items-center animate-fade-in">
      <input
        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }}
        autoFocus
      />
      <input
        className="w-16 h-9 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        value={qty}
        onChange={e => onQtyChange(e.target.value)}
      />
      <button
        className="min-h-[max(2.75rem,44px)] px-3 rounded-lg bg-emerald-500 dark:bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-600 dark:hover:bg-emerald-700 active:scale-95 transition-all"
        onClick={onSave}
      >
        OK
      </button>
    </div>
  )
}
