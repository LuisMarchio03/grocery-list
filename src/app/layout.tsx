import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lista de Compras',
  description: 'App simples de lista de compras pra família',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="max-w-lg mx-auto min-h-dvh px-5 py-6">
          {children}
        </main>
      </body>
    </html>
  )
}
