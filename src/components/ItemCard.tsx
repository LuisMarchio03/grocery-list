'use client'

import { useState } from 'react'
import { Tag, Camera, Eye, Pencil, Trash2 } from 'lucide-react'

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
}

export default function ItemCard({
  item,
  onToggleCheck,
  onTogglePromotion,
  onEdit,
  onDelete,
  onPhoto,
}: Props) {
  const [showPhoto, setShowPhoto] = useState(false)

  return (
    <div
      className={`bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center gap-3 transition-all duration-200 ${
        item.is_checked ? 'opacity-40' : 'animate-slide-up'
      }`}
    >
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
              item.is_checked ? 'line-through text-slate-400' : 'text-slate-800'
            }`}
          >
            {item.name}
          </span>
          {item.quantity && (
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {item.quantity}
            </span>
          )}
          {!!item.is_promotion && (
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-full">
              PROMO
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <IconButton
          icon={<Tag size={14} />}
          active={!!item.is_promotion}
          activeClass="text-orange-500 bg-orange-50 border-orange-200"
          onClick={onTogglePromotion}
          title="Promoção"
        />
        <IconButton
          icon={<Camera size={14} />}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.capture = 'environment'
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
            icon={<Eye size={14} />}
            active={showPhoto}
            activeClass="text-blue-500 bg-blue-50 border-blue-200"
            onClick={() => setShowPhoto(!showPhoto)}
            title="Ver foto"
          />
        )}
        <IconButton
          icon={<Pencil size={14} />}
          onClick={onEdit}
          title="Editar"
        />
        <IconButton
          icon={<Trash2 size={14} />}
          onClick={onDelete}
          title="Excluir"
        />
      </div>

      {showPhoto && item.photo_base64 && (
        <div className="absolute top-full right-0 z-10 mt-2 animate-fadeIn">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-2">
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
      className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150 active:scale-90 ${
        active
          ? activeClass
          : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
      onClick={onClick}
      title={title}
    >
      {icon}
    </button>
  )
}
