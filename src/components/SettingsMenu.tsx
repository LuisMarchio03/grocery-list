'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings, Moon, Sun, Check } from 'lucide-react'
import { useFontSize } from '@/lib/FontSizeContext'
import { useTheme } from '@/lib/ThemeContext'
import IconButton from '@/components/IconButton'

const SIZES = [
  { value: 'sm' as const, label: 'P', name: 'Pequena' },
  { value: 'md' as const, label: 'M', name: 'Média' },
  { value: 'lg' as const, label: 'G', name: 'Grande' },
  { value: 'xl' as const, label: 'XG', name: 'Extra grande' },
]

// min-w além do min-h: sem isto o grid de 4 colunas espreme cada botão abaixo
// do piso físico de 44px em fontes menores (o popover encolhe com a raiz em rem).
const ITEM =
  'min-h-[max(2.75rem,44px)] min-w-[max(2.75rem,44px)] flex items-center justify-center rounded-lg text-sm font-medium transition-all ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

export default function SettingsMenu() {
  const { size, setSize } = useFontSize()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        // Devolve o foco para a engrenagem: sem isto o foco cai para o
        // document.body e o usuário de teclado perde o lugar. IconButton não
        // repassa ref, então busca-se o botão pelo DOM — ele é o primeiro
        // <button> dentro de rootRef, antes do popover condicional.
        rootRef.current?.querySelector('button')?.focus()
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <IconButton
        icon={<Settings className="w-4 h-4" />}
        label="Ajustes de exibição"
        onClick={() => setOpen(o => !o)}
        active={open}
        expanded={open}
      />

      {open && (
        <div
          role="group"
          aria-label="Ajustes de exibição"
          className="absolute top-full right-0 mt-2 w-[max(14rem,224px)] max-w-[calc(100vw-2rem)] z-20 p-3
            bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
            rounded-xl shadow-lg dark:shadow-slate-900/50 animate-scale-in"
        >
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
            Tamanho da fonte
          </p>
          <div
            className="grid gap-1 mb-4"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(max(2.75rem,44px), 1fr))' }}
          >
            {SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => setSize(s.value)}
                aria-label={`Fonte ${s.name}`}
                aria-pressed={size === s.value}
                className={`${ITEM} ${
                  size === s.value
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
            Tema
          </p>
          <button
            onClick={toggle}
            aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            className={`${ITEM} w-full justify-between px-3 border border-slate-200 dark:border-slate-700
              text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700`}
          >
            <span className="flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'light' ? 'Claro' : 'Escuro'}
            </span>
            <Check className="w-4 h-4 text-blue-500" />
          </button>
        </div>
      )}
    </div>
  )
}
