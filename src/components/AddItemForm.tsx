'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

type Props = {
  onAdd: (name: string, quantity: string) => void
}

export default function AddItemForm({ onAdd }: Props) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  function handleSubmit() {
    if (!name.trim()) return
    onAdd(name.trim(), qty.trim())
    setName('')
    setQty('')
  }

  return (
    <div className="flex gap-2 mb-6">
      <div className="flex-1 relative">
        <input
          className="w-full h-12 pl-4 pr-3 rounded-xl border border-border bg-surface text-base text-fg placeholder-fg-muted focus:border-accent transition-colors"
          placeholder="Produto..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      <input
        className="w-20 h-12 px-3 rounded-xl border border-border bg-surface text-base text-fg placeholder-fg-muted focus:border-accent transition-colors text-center"
        placeholder="Qtd"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      <button
        className="h-12 w-12 flex items-center justify-center rounded-xl bg-accent text-accent-fg hover:bg-accent-hover active:scale-95 transition-all shrink-0"
        onClick={handleSubmit}
        title="Adicionar"
      >
        <Plus size={22} />
      </button>
    </div>
  )
}
