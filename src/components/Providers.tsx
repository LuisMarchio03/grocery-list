'use client'

import { ThemeProvider } from '@/lib/ThemeContext'
import { FontSizeProvider } from '@/lib/FontSizeContext'
import { ToastProvider } from '@/components/Toast'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        <ToastProvider>{children}</ToastProvider>
      </FontSizeProvider>
    </ThemeProvider>
  )
}
