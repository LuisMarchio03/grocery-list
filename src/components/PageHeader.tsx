'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import IconButton from '@/components/IconButton'

type Props = {
  title: string
  backTo?: string
}

export default function PageHeader({ title, backTo }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3">
      {backTo && (
        <IconButton
          icon={<ArrowLeft className="w-5 h-5" />}
          label="Voltar"
          onClick={() => router.push(backTo)}
          className="shrink-0 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        />
      )}
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 min-w-0 truncate">{title}</h1>
    </div>
  )
}
