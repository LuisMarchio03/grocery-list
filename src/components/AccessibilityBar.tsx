'use client'

import { useFontSize } from '@/lib/FontSizeContext'
import { Type, Minus, Plus } from 'lucide-react'

const sizes = [
  { value: 'sm' as const, label: 'P' },
  { value: 'md' as const, label: 'M' },
  { value: 'lg' as const, label: 'G' },
  { value: 'xl' as const, label: 'XG' },
]

export default function AccessibilityBar() {
  const { size, setSize } = useFontSize()

  const currentIndex = sizes.findIndex(s => s.value === size)

  function cyclePrev() {
    const next = currentIndex > 0 ? currentIndex - 1 : sizes.length - 1
    setSize(sizes[next].value)
  }

  function cycleNext() {
    const next = currentIndex < sizes.length - 1 ? currentIndex + 1 : 0
    setSize(sizes[next].value)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-90"
        onClick={cyclePrev}
        title="Diminuir fonte"
      >
        <Minus size={14} />
      </button>
      <div className="flex items-center gap-0.5">
        {sizes.map((s) => (
          <button
            key={s.value}
            className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-all ${
              size === s.value
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            onClick={() => setSize(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-90"
        onClick={cycleNext}
        title="Aumentar fonte"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
