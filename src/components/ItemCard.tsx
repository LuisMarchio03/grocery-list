'use client'

import { useState } from 'react'
import { Tag, Image, Eye, Pencil, Trash2 } from 'lucide-react'

type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  photo_base64: string
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
  const [showPhoto, setShowPhoto] = useState(false)

  return (
    <div
      className={`bg-surface rounded-xl border border-border shadow-sm px-4 py-3.5 flex items-center gap-3 transition-all duration-200 ${
        item.is_checked ? 'opacity-50' : 'animate-slide-up'
      }`}
    >
      <input
        type="checkbox"
        checked={!!item.is_checked}
        onChange={onToggleCheck}
        className="animate-check-bounce"
        title="Marcar como comprado"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-base font-medium ${
              item.is_checked ? 'line-through text-fg-muted' : 'text-fg'
            }`}
          >
            {item.name}
          </span>
          {item.quantity && (
            <span className="text-xs font-medium text-fg-muted bg-surface-2 px-2 py-0.5 rounded-full">
              {item.quantity}
            </span>
          )}
          {!!item.is_promotion && (
            <span className="text-[11px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full dark:text-orange-300 dark:bg-orange-950 dark:border-orange-900">
              PROMO
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <IconButton
          icon={<Tag size={16} />}
          active={!!item.is_promotion}
          activeClass="text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-300 dark:bg-orange-950 dark:border-orange-900"
          onClick={onTogglePromotion}
          title="Promoção"
        />
        <IconButton
          icon={<Image size={16} />}
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
          title="Foto"
        />
        {item.photo_base64 && (
          <IconButton
            icon={<Eye size={16} />}
            active={showPhoto}
            activeClass="text-accent bg-surface-2 border-border"
            onClick={() => {
              if (onViewPhoto) {
                setShowPhoto(false)
                onViewPhoto()
              } else {
                setShowPhoto(!showPhoto)
              }
            }}
            title="Ver foto"
          />
        )}
        <IconButton icon={<Pencil size={16} />} onClick={onEdit} title="Editar" />
        <IconButton icon={<Trash2 size={16} />} onClick={onDelete} title="Excluir" />
      </div>

      {showPhoto && item.photo_base64 && (
        <div className="absolute top-full right-0 z-10 mt-2 animate-fadeIn">
          <div className="bg-surface rounded-xl border border-border shadow-lg p-2">
            <img
              src={item.photo_base64}
              alt="Foto do item"
              className="max-w-40 max-h-40 rounded-lg object-cover"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function IconButton({
  icon,
  active = false,
  activeClass = '',
  onClick,
  title,
}: {
  icon: React.ReactNode
  active?: boolean
  activeClass?: string
  onClick: () => void
  title: string
}) {
  return (
    <button
      className={`w-11 h-11 flex items-center justify-center rounded-lg border transition-all duration-150 active:scale-90 ${
        active
          ? activeClass
          : 'border-border text-fg-muted hover:text-fg hover:bg-surface-2'
      }`}
      onClick={onClick}
      title={title}
    >
      {icon}
    </button>
  )
}
