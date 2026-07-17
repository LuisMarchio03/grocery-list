'use client'

import { useEffect } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'
import { useState } from 'react'
import IconButton from '@/components/IconButton'

type Props = {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageViewer({ src, alt, onClose }: Props) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative max-w-full max-h-full flex flex-col items-center"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute -top-12 right-0 flex gap-2">
          <IconButton
            icon={<ZoomIn className="w-[1.125rem] h-[1.125rem]" />}
            label="Aumentar zoom"
            onClick={() => setScale(s => Math.min(s + 0.5, 3))}
            className="!bg-white/20 !text-white hover:!bg-white/30 !border-0 backdrop-blur-sm"
          />
          <IconButton
            icon={<ZoomOut className="w-[1.125rem] h-[1.125rem]" />}
            label="Diminuir zoom"
            onClick={() => setScale(s => Math.max(s - 0.5, 0.5))}
            className="!bg-white/20 !text-white hover:!bg-white/30 !border-0 backdrop-blur-sm"
          />
          <IconButton
            icon={<X className="w-[1.125rem] h-[1.125rem]" />}
            label="Fechar"
            onClick={onClose}
            className="!bg-white/20 !text-white hover:!bg-white/30 !border-0 backdrop-blur-sm"
          />
        </div>
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[80vh] rounded-xl object-contain transition-transform duration-200"
          style={{ transform: `scale(${scale})` }}
        />
      </div>
    </div>
  )
}
