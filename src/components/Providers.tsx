'use client'

import { FontSizeProvider } from '@/lib/FontSizeContext'
import { ToastProvider } from '@/lib/ToastContext'
import { AuthProvider } from '@/lib/AuthContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import Toaster from '@/components/Toaster'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FontSizeProvider>
        <ToastProvider>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ToastProvider>
      </FontSizeProvider>
    </ThemeProvider>
  )
}
