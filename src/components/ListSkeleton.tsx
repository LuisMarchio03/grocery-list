export default function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando listas…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 px-4 py-3.5 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
          </div>
          {/* espelha os 2 IconButton (44px) da linha real, pra altura do skeleton
              bater com a da lista e não haver salto de layout no swap */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
            <div className="w-11 h-11 rounded-lg bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
