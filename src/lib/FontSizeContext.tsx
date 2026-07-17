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

// ESPELHADO em src/app/layout.tsx (script inline do <head>), em porcentagem:
// 0.875 -> 87.5, 1 -> 100, 1.125 -> 112.5, 1.25 -> 125.
// Mudou aqui, mude lá. A duplicação é inevitável: o script do <head> roda antes
// de qualquer módulo carregar e não tem como importar. Se as duas divergirem, o
// tamanho salta no carregamento — exatamente o bug que aquele script existe para matar.
const scales: Record<FontSize, number> = {
  sm: 0.875,
  md: 1,
  lg: 1.125,
  xl: 1.25,
}

export function FontSizeProvider({ children }: { children: ReactNode }) {
  const [size, setSize] = useState<FontSize>('md')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('fontSize') as FontSize | null
    if (saved && saved in scales) setSize(saved)
    setHydrated(true)
  }, [])

  useEffect(() => {
    // Não reescreve no primeiro render: o script do <head> já aplicou o valor
    // correto, e reaplicar aqui reintroduziria o salto de tamanho.
    if (!hydrated) return
    localStorage.setItem('fontSize', size)
    document.documentElement.style.fontSize = `${scales[size] * 100}%`
  }, [size, hydrated])

  return (
    <FontSizeContext.Provider value={{ size, setSize, scale: scales[size] }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  return useContext(FontSizeContext)
}
