'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import AddItemForm from '@/components/AddItemForm'
import ItemCard from '@/components/ItemCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'

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

  async function addItem(name: string, quantity: string) {
    await fetch(`/api/lists/${id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, quantity }),
    })
    fetchItems()
  }

  async function toggleCheck(item: Item) {
    await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_checked: item.is_checked ? 0 : 1 }),
    })
    fetchItems()
  }

  async function togglePromotion(item: Item) {
    await fetch(`/api/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_promotion: item.is_promotion ? 0 : 1 }),
    })
    fetchItems()
  }

  async function updateItem(itemId: string) {
    if (!editName.trim()) return
    await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), quantity: editQty.trim() }),
    })
    setEditingId(null)
    fetchItems()
  }

  async function deleteItem() {
    if (!deleteTarget) return
    await fetch(`/api/items/${deleteTarget.id}`, { method: 'DELETE' })
    setDeleteTarget(null)
    fetchItems()
  }

  async function handlePhoto(file: File, itemId: string) {
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string
      await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_base64: base64 }),
      })
      fetchItems()
    }
    reader.readAsDataURL(file)
  }

  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)

  return (
    <div>
      <PageHeader title={listName} backTo="/" />

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
