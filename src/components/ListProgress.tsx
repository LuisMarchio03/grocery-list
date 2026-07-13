'use client'

type Props = { total: number; checked: number }

export default function ListProgress({ total, checked }: Props) {
  if (total === 0) return null
  const pct = Math.round((checked / total) * 100)
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
        <span>{checked} de {total} comprados</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
