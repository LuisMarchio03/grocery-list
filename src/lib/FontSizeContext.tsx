'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type FontSize = 'sm' | 'md' | 'lg' | 'xl'

type FontSizeContextType = {
  size: FontSize
  setSize: (s: FontSize) => void
  scale: number
}

const FontSizeContext = createContext<FontSizeContextType>({
  size: 'md',
  setSize: () => {},
  scale: 1,
})

const scales: Record<FontSize, number> = {
  sm: 0.875,
  md: 1,
  lg: 1.125,
  xl: 1.25,
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<FontSize>('md')

  useEffect(() => {
    const saved = localStorage.getItem('fontSize') as FontSize | null
    if (saved && saved in scales) setSize(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('fontSize', size)
    document.documentElement.style.fontSize = `${scales[size] * 100}%`
  }, [size])

  return (
    <FontSizeContext.Provider value={{ size, setSize, scale: scales[size] }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  return useContext(FontSizeContext)
}
