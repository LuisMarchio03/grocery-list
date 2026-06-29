'use client'

import { useFontSize } from '@/lib/FontSizeContext'
import { Minus, Plus } from 'lucide-react'

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
        className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90 shrink-0"
        onClick={cyclePrev}
        title="Diminuir fonte"
      >
        <Minus size={16} />
      </button>
      <div className="flex items-center gap-0.5">
        {sizes.map((s) => (
          <button
            key={s.value}
            className={`w-11 h-11 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
              size === s.value
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface-2'
            }`}
            onClick={() => setSize(s.value)}
            title={`Fonte ${s.label}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button
        className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90 shrink-0"
        onClick={cycleNext}
        title="Aumentar fonte"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
