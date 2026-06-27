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
          className="w-full h-11 pl-4 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          placeholder="Produto..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      <input
        className="w-16 h-11 px-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center"
        placeholder="Qtd"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      <button
        className="h-11 w-11 flex items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 active:scale-95 transition-all shadow-sm shadow-blue-200"
        onClick={handleSubmit}
      >
        <Plus size={20} />
      </button>
    </div>
  )
}
