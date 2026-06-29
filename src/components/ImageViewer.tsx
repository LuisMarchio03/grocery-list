'use client'

import { useEffect, useState } from 'react'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

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
        <div className="absolute -top-14 right-0 flex gap-2">
          <button
            className="w-11 h-11 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all flex items-center justify-center backdrop-blur-sm"
            onClick={() => setScale(s => Math.min(s + 0.5, 3))}
            title="Aumentar zoom"
          >
            <ZoomIn size={20} />
          </button>
          <button
            className="w-11 h-11 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all flex items-center justify-center backdrop-blur-sm"
            onClick={() => setScale(s => Math.max(s - 0.5, 0.5))}
            title="Diminuir zoom"
          >
            <ZoomOut size={20} />
          </button>
          <button
            className="w-11 h-11 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-all flex items-center justify-center backdrop-blur-sm"
            onClick={onClose}
            title="Fechar"
          >
            <X size={20} />
          </button>
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
