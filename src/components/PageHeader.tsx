'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  title: string
  backTo?: string
}

export default function PageHeader({ title, backTo }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3">
      {backTo && (
        <button
          className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-2 active:scale-90 transition-all shrink-0"
          onClick={() => router.push(backTo)}
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="text-xl font-semibold text-fg truncate">{title}</h1>
    </div>
  )
}
