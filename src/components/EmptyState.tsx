import { ShoppingBag } from 'lucide-react'

type Props = {
  message: string
}

export default function EmptyState({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        <ShoppingBag size={28} className="text-slate-300" />
      </div>
      <p className="text-sm text-slate-400">{message}</p>
    </div>
  )
}
