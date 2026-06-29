'use client'

import { useTheme } from '@/lib/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

const order = ['light', 'dark', 'system'] as const
const icons = { light: Sun, dark: Moon, system: Monitor }
const labels = {
  light: 'Tema claro',
  dark: 'Tema escuro',
  system: 'Tema do sistema',
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = icons[theme]

  function cycle() {
    const i = order.indexOf(theme)
    setTheme(order[(i + 1) % order.length])
  }

  return (
    <button
      onClick={cycle}
      title={labels[theme]}
      className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90 shrink-0"
    >
      <Icon size={18} />
    </button>
  )
}
