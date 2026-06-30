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
          className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 active:bg-slate-50 transition-all shrink-0"
          onClick={() => router.push(backTo)}
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="text-xl font-semibold text-slate-900 truncate">{title}</h1>
    </div>
  )
}
