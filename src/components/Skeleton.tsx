export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border px-4 py-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-6 h-6 rounded-md bg-surface-2" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/2 rounded bg-surface-2" />
        <div className="h-2.5 w-1/4 rounded bg-surface-2" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
