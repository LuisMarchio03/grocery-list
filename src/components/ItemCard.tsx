'use client'

import { Tag, Image, Eye, Pencil, Trash2 } from 'lucide-react'

type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  has_photo: number
}

type Props = {
  item: Item
  onToggleCheck: () => void
  onTogglePromotion: () => void
  onEdit: () => void
  onDelete: () => void
  onPhoto: (file: File) => void
  onViewPhoto?: () => void
}

export default function ItemCard({
  item,
  onToggleCheck,
  onTogglePromotion,
  onEdit,
  onDelete,
  onPhoto,
  onViewPhoto,
}: Props) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/30 px-4 py-3.5 flex flex-col gap-3 transition-all duration-200 ${
        item.is_checked ? 'opacity-40' : 'animate-slide-up'
      }`}
    >
      {/* Fileira 1: checkbox + nome do produto */}
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={!!item.is_checked}
          onChange={onToggleCheck}
          className="animate-check-bounce"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium ${
                item.is_checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {item.name}
            </span>
            {item.quantity && (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {item.quantity}
              </span>
            )}
            {!!item.is_promotion && (
              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 px-1.5 py-0.5 rounded-full">
                PROMO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fileira 2: botões de interação — largura total, alvos grandes p/ toque */}
      <div className="flex items-stretch gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/50">
        <ActionButton
          icon={<Tag size={18} />}
          label="Promoção"
          active={!!item.is_promotion}
          activeClass="text-orange-600 bg-orange-50 border-orange-200"
          onClick={onTogglePromotion}
        />
        <ActionButton
          icon={<Image size={18} />}
          label="Foto"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) onPhoto(file)
            }
            input.click()
          }}
        />
        {!!item.has_photo && onViewPhoto && (
          <ActionButton
            icon={<Eye size={18} />}
            label="Ver"
            onClick={onViewPhoto}
          />
        )}
        <ActionButton
          icon={<Pencil size={18} />}
          label="Editar"
          onClick={onEdit}
        />
        <ActionButton
          icon={<Trash2 size={18} />}
          label="Excluir"
          activeClass="text-red-500 bg-red-50 border-red-200"
          danger
          onClick={onDelete}
        />
      </div>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  active = false,
  activeClass = '',
  danger = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  activeClass?: string
  danger?: boolean
  onClick: () => void
}) {
  const base =
    'flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-lg border transition-all duration-150 active:scale-95'
  const idle = danger
    ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20'
    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
  return (
    <button
      className={`${base} ${active ? activeClass : idle}`}
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  )
}
