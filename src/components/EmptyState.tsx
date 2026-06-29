import { ShoppingBag } from 'lucide-react'

type Props = {
  message: string
}

export default function EmptyState({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
        <ShoppingBag size={28} className="text-fg-muted" />
      </div>
      <p className="text-sm text-fg-muted text-center">{message}</p>
    </div>
  )
}
