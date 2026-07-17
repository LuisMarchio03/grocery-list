'use client'

type Variant = 'default' | 'danger' | 'primary'

type Props = {
  icon: React.ReactNode
  /** Obrigatório: vira aria-label e title. Sem isto o botão é mudo para leitor de tela. */
  label: string
  onClick: () => void
  variant?: Variant
  /** Estado visual de "ligado". Em botão de alternância vira também aria-pressed. */
  active?: boolean
  /**
   * Use em gatilho de disclosure (popover/painel que expande/recolhe). Emite
   * aria-expanded e SUPRIME o aria-pressed: um leitor de tela anunciando
   * "pressionado" ao abrir algo é semântica errada — quem abre é `expanded`,
   * não `pressed`. Não emite aria-haspopup: isso é para menu/listbox/dialog
   * de verdade, e presumir um deles aqui seria uma afirmação semântica que o
   * chamador nem sempre pode cumprir.
   */
  expanded?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}

// max(): o alvo cresce com a fonte mas nunca cai abaixo do mínimo físico de 44px
// (no tamanho "P" a base é 14px, então 2.75rem seria só 38.5px).
const BASE =
  'min-h-[max(2.75rem,44px)] min-w-[max(2.75rem,44px)] flex items-center justify-center rounded-lg ' +
  'transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' +
  'dark:focus-visible:ring-offset-slate-900'

const VARIANTS: Record<Variant, { idle: string; active: string }> = {
  default: {
    idle:
      'border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 ' +
      'hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 ' +
      'hover:bg-slate-50 dark:hover:bg-slate-800',
    active:
      'border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 ' +
      'bg-blue-50 dark:bg-blue-900/20',
  },
  danger: {
    idle:
      'border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 ' +
      'hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 ' +
      'hover:bg-red-50 dark:hover:bg-red-900/20',
    active:
      'border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 ' +
      'bg-red-50 dark:bg-red-900/20',
  },
  primary: {
    idle:
      'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 ' +
      'active:bg-blue-800 dark:active:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none',
    active: 'bg-blue-800 dark:bg-blue-700 text-white',
  },
}

export default function IconButton({
  icon,
  label,
  onClick,
  variant = 'default',
  active = false,
  expanded,
  type = 'button',
  disabled = false,
  className = '',
}: Props) {
  const style = VARIANTS[variant]
  const isDisclosure = expanded !== undefined
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isDisclosure ? undefined : active || undefined}
      aria-expanded={expanded}
      title={label}
      className={`${BASE} ${active ? style.active : style.idle} ${className}`}
    >
      {icon}
    </button>
  )
}
