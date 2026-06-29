'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import AddItemForm from '@/components/AddItemForm'
import ItemCard from '@/components/ItemCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import ImageViewer from '@/components/ImageViewer'
import AccessibilityBar from '@/components/AccessibilityBar'
import ThemeToggle from '@/components/ThemeToggle'
import ProgressBar from '@/components/ProgressBar'
import { SkeletonList } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'
import { compressImage } from '@/lib/image'

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
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    fetch(`/api/lists/${id}`)
      .then(r => r.json())
      .then(data => setListName(data.name))
      .catch(() => toast('Não foi possível carregar a lista.'))
    fetchItems()
  }, [id])

  async function fetchItems() {
    try {
      const res = await fetch(`/api/lists/${id}/items`)
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      toast('Não foi possível carregar os itens.')
    } finally {
      setLoading(false)
    }
  }

  const addItem = useCallback(async (name: string, quantity: string) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: Item = {
      id: tempId, name, quantity,
      is_checked: 0, is_promotion: 0, photo_base64: '',
    }
    setItems(prev => [...prev, optimistic])
    try {
      const res = await fetch(`/api/lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      setItems(prev => prev.filter(i => i.id !== tempId))
      toast('Não foi possível adicionar o item.')
    }
  }, [id])

  const toggleCheck = useCallback(async (item: Item) => {
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_checked: i.is_checked ? 0 : 1 } : i
    ))
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_checked: item.is_checked ? 0 : 1 }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível atualizar o item.')
      fetchItems()
    }
  }, [])

  const togglePromotion = useCallback(async (item: Item) => {
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_promotion: i.is_promotion ? 0 : 1 } : i
    ))
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_promotion: item.is_promotion ? 0 : 1 }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível atualizar o item.')
      fetchItems()
    }
  }, [])

  const updateItem = useCallback(async (itemId: string) => {
    if (!editName.trim()) return
    setEditingId(null)
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, name: editName.trim(), quantity: editQty.trim() } : i
    ))
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), quantity: editQty.trim() }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível salvar o item.')
      fetchItems()
    }
  }, [editName, editQty])

  const deleteItem = useCallback(async () => {
    if (!deleteTarget) return
    const deleted = deleteTarget
    setDeleteTarget(null)
    setItems(prev => prev.filter(i => i.id !== deleted.id))
    try {
      const res = await fetch(`/api/items/${deleted.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível excluir o item.')
      fetchItems()
    }
  }, [deleteTarget])

  const clearChecked = useCallback(async () => {
    setClearOpen(false)
    setItems(prev => prev.filter(i => !i.is_checked))
    try {
      const res = await fetch(`/api/lists/${id}/items`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível limpar os comprados.')
      fetchItems()
    }
  }, [id])

  const handlePhoto = useCallback(async (file: File, itemId: string) => {
    try {
      const base64 = await compressImage(file)
      setItems(prev => prev.map(i => (i.id === itemId ? { ...i, photo_base64: base64 } : i)))
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_base64: base64 }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível salvar a foto.')
      fetchItems()
    }
  }, [])

  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <PageHeader title={listName} backTo="/" />
        </div>
        <ThemeToggle />
      </div>

      <div className="flex justify-end mb-5">
        <AccessibilityBar />
      </div>

      {items.length > 0 && (
        <ProgressBar done={checked.length} total={items.length} />
      )}

      <AddItemForm onAdd={addItem} />

      {loading ? (
        <SkeletonList />
      ) : (
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
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Comprados ({checked.length})
                </p>
                <button
                  className="flex items-center gap-1.5 h-11 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
                  onClick={() => setClearOpen(true)}
                  title="Limpar comprados"
                >
                  <Trash2 size={15} />
                  Limpar
                </button>
              </div>
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
      )}

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

      <ConfirmDialog
        open={clearOpen}
        title="Limpar comprados"
        message={`Remover os ${checked.length} itens já comprados desta lista?`}
        confirmLabel="Limpar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={clearChecked}
        onCancel={() => setClearOpen(false)}
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
    <div className="bg-surface rounded-xl border border-accent shadow-sm px-4 py-3 flex gap-2 items-center animate-fadeIn">
      <input
        className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-base text-fg focus:border-accent transition-colors"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
      />
      <input
        className="w-16 h-10 px-2 rounded-lg border border-border bg-surface text-base text-fg text-center focus:border-accent transition-colors"
        value={qty}
        onChange={e => onQtyChange(e.target.value)}
      />
      <button
        className="h-11 px-4 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 active:scale-95 transition-all"
        onClick={onSave}
      >
        OK
      </button>
    </div>
  )
}
