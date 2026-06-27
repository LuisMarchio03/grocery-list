'use client'

import { FontSizeProvider } from '@/lib/FontSizeContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return <FontSizeProvider>{children}</FontSizeProvider>
}
