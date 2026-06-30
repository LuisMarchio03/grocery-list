'use client'

import { FontSizeProvider } from '@/lib/FontSizeContext'
import { ToastProvider } from '@/lib/ToastContext'
import Toaster from '@/components/Toaster'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FontSizeProvider>
      <ToastProvider>
        {children}
        <Toaster />
      </ToastProvider>
    </FontSizeProvider>
  )
}
