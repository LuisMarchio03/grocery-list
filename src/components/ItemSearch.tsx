'use client'

import { Search, X } from 'lucide-react'

type Props = { value: string; onChange: (v: string) => void }

export default function ItemSearch({ value, onChange }: Props) {
  return (
    <div className="relative mb-4">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
      <input
        className="w-full h-10 pl-9 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        placeholder="Buscar item..."
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          aria-label="Limpar busca"
          title="Limpar busca"
          className="absolute right-1 top-1/2 -translate-y-1/2 min-h-[max(2.75rem,44px)] min-w-[max(2.75rem,44px)] flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
