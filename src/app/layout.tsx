import type { Metadata, Viewport } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Lista de Compras',
  description: 'App simples de lista de compras pra família',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Lista Compras',
  },
  icons: {
    apple: '/icons/icon-192.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
        <script
          // Bloqueante de propósito: precisa rodar antes do primeiro paint,
          // senão a página pisca branca e a fonte salta de tamanho.
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  try {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');

    // ESPELHADO de src/lib/FontSizeContext.tsx (que usa multiplicador, não %):
    // 0.875 -> 87.5, 1 -> 100, 1.125 -> 112.5, 1.25 -> 125. Mudou lá, mude aqui.
    var scales = { sm: 87.5, md: 100, lg: 112.5, xl: 125 };
    var s = localStorage.getItem('fontSize');
    if (s && scales[s]) document.documentElement.style.fontSize = scales[s] + '%';
  } catch (e) {}
})();
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          <main className="max-w-lg mx-auto min-h-dvh px-5 py-6">
            {children}
          </main>
        </Providers>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js')
                })
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
