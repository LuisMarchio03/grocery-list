'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import AddItemForm from '@/components/AddItemForm'
import ItemCard from '@/components/ItemCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import ImageViewer from '@/components/ImageViewer'
import AccessibilityBar from '@/components/AccessibilityBar'

type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  photo_base64: string
}

export default function ListPage() {
  const { id } = useParams<{ id: string }>()
  const [listName, setListName] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/lists/${id}`)
      .then(r => r.json())
      .then(data => setListName(data.name))
    fetchItems()
  }, [id])

  async function fetchItems() {
    const res = await fetch(`/api/lists/${id}/items`)
    const data = await res.json()
    setItems(data)
  }

  const addItem = useCallback(async (name: string, quantity: string) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: Item = {
      id: tempId,
      name,
      quantity,
      is_checked: 0,
      is_promotion: 0,
      photo_base64: '',
    }
    setItems(prev => [...prev, optimistic])

    try {
      const res = await fetch(`/api/lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity }),
      })
      if (res.ok) {
        fetchItems()
      } else {
        setItems(prev => prev.filter(i => i.id !== tempId))
      }
    } catch {
      setItems(prev => prev.filter(i => i.id !== tempId))
    }
  }, [id])

  const toggleCheck = useCallback(async (item: Item) => {
    setItems(prev =>
      prev.map(i =>
        i.id === item.id ? { ...i, is_checked: i.is_checked ? 0 : 1 } : i
      )
    )

    await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_checked: item.is_checked ? 0 : 1 }),
    })
    fetchItems()
  }, [])

  const togglePromotion = useCallback(async (item: Item) => {
    setItems(prev =>
      prev.map(i =>
        i.id === item.id ? { ...i, is_promotion: i.is_promotion ? 0 : 1 } : i
      )
    )

    await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_promotion: item.is_promotion ? 0 : 1 }),
    })
    fetchItems()
  }, [])

  const updateItem = useCallback(async (itemId: string) => {
    if (!editName.trim()) return
    setEditingId(null)

    setItems(prev =>
      prev.map(i =>
        i.id === itemId ? { ...i, name: editName.trim(), quantity: editQty.trim() } : i
      )
    )

    await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), quantity: editQty.trim() }),
    })
    fetchItems()
  }, [editName, editQty])

  const deleteItem = useCallback(async () => {
    if (!deleteTarget) return
    const deleted = deleteTarget
    setDeleteTarget(null)

    setItems(prev => prev.filter(i => i.id !== deleted.id))

    await fetch(`/api/items/${deleted.id}`, { method: 'DELETE' })
    fetchItems()
  }, [deleteTarget])

  const handlePhoto = useCallback(async (file: File, itemId: string) => {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string

      setItems(prev =>
        prev.map(i => (i.id === itemId ? { ...i, photo_base64: base64 } : i))
      )

      await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_base64: base64 }),
      })
      fetchItems()
    }
    reader.readAsDataURL(file)
  }, [])

  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <PageHeader title={listName} backTo="/" />
        </div>
        <AccessibilityBar />
      </div>

      <AddItemForm onAdd={addItem} />

      <div className="space-y-2">
        {unchecked.map((item, i) => (
          <div key={item.id} className="relative" style={{ animationDelay: `${i * 30}ms` }}>
            {editingId === item.id ? (
              <EditInline
                name={editName}
                qty={editQty}
                onNameChange={setEditName}
                onQtyChange={setEditQty}
                onSave={() => updateItem(item.id)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ItemCard
                item={item}
                onToggleCheck={() => toggleCheck(item)}
                onTogglePromotion={() => togglePromotion(item)}
                onEdit={() => {
                  setEditingId(item.id)
                  setEditName(item.name)
                  setEditQty(item.quantity)
                }}
                onDelete={() => setDeleteTarget(item)}
                onPhoto={(file) => handlePhoto(file, item.id)}
                onViewPhoto={() => setViewingPhoto(item.photo_base64)}
              />
            )}
          </div>
        ))}

        {checked.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3 px-1">
              Comprados ({checked.length})
            </p>
            <div className="space-y-2">
              {checked.map((item) => (
                <div key={item.id} className="relative">
                  {editingId === item.id ? (
                    <EditInline
                      name={editName}
                      qty={editQty}
                      onNameChange={setEditName}
                      onQtyChange={setEditQty}
                      onSave={() => updateItem(item.id)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <ItemCard
                      item={item}
                      onToggleCheck={() => toggleCheck(item)}
                      onTogglePromotion={() => togglePromotion(item)}
                      onEdit={() => {
                        setEditingId(item.id)
                        setEditName(item.name)
                        setEditQty(item.quantity)
                      }}
                      onDelete={() => setDeleteTarget(item)}
                      onPhoto={(file) => handlePhoto(file, item.id)}
                      onViewPhoto={() => setViewingPhoto(item.photo_base64)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <EmptyState message="Nenhum item ainda. Adicione produtos acima!" />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir item"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />

      {viewingPhoto && (
        <ImageViewer
          src={viewingPhoto}
          alt="Foto do item"
          onClose={() => setViewingPhoto(null)}
        />
      )}
    </div>
  )
}

function EditInline({
  name,
  qty,
  onNameChange,
  onQtyChange,
  onSave,
  onCancel,
}: {
  name: string
  qty: string
  onNameChange: (v: string) => void
  onQtyChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm px-4 py-3 flex gap-2 items-center animate-fadeIn">
      <input
        className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave()
          if (e.key === 'Escape') onCancel()
        }}
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
