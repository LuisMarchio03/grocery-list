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
          className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 active:bg-slate-50 dark:active:bg-slate-700 transition-all shrink-0"
          onClick={() => router.push(backTo)}
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
    </div>
  )
}
