# UI / Acessibilidade / Usabilidade Refresh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refresh the "Lista de Compras" PWA with a token-based theme + dark mode, high-contrast / large-target accessibility, and four usability features (loading/error states, list progress counts, clear-purchased, photo compression).

**Architecture:** Introduce CSS-variable design tokens consumed by Tailwind (`darkMode: 'class'`). Add three React contexts under `Providers` (Theme, FontSize — existing, Toast). Keep the thin libSQL route-handler pattern, extending two endpoints. No new runtime dependencies.

**Tech Stack:** Next.js 14 App Router, React 18, Tailwind 3, `@libsql/client`, `lucide-react`.

## Global Constraints

- **No new runtime dependencies.** Build theme/toast/skeleton/compression from scratch.
- **No automated test runner exists.** The per-task verification cycle is `npm run build` (which type-checks) **plus** the manual dev-server checks each task lists. There is no jest/vitest; do **not** add one.
- **Not a git repo.** Commit steps assume you run `git init` first (Task 0, optional). If you skip git, treat each "Commit" step as a checkpoint and move on.
- **UI language is pt-BR.** All user-facing copy in Portuguese.
- **Accessibility scope is visual only** — large tap targets (≥44px on actionable controls), WCAG AA+ contrast, visible keyboard focus, font scaling. **No** screen-reader / `aria-live` work. Existing `title` attributes stay.
- **Theme values** (RGB triplets, used verbatim in Task 1):
  - Light: `--bg 248 250 252`, `--surface 255 255 255`, `--surface-2 241 245 249`, `--border 226 232 240`, `--fg 15 23 42`, `--fg-muted 71 85 105`, `--accent 37 99 235`, `--accent-hover 29 78 216`, `--accent-fg 255 255 255`, `--ring 37 99 235`
  - Dark: `--bg 2 6 23`, `--surface 15 23 42`, `--surface-2 30 41 59`, `--border 51 65 85`, `--fg 241 245 249`, `--fg-muted 148 163 184`, `--accent 59 130 246`, `--accent-hover 96 165 250`, `--accent-fg 255 255 255`, `--ring 96 165 250`

---

## Task 0 (Optional): Initialize git

**Files:** none

- [ ] **Step 1: Init repo so the per-task commits work**

```bash
git init
git add -A
git commit -m "chore: baseline before UI refresh"
```

If you choose not to use git, skip this task and ignore all later "Commit" steps.

---

## Task 1: Design tokens + Tailwind dark mode

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: Tailwind color utilities `bg`, `surface`, `surface-2`, `border` (color), `fg`, `fg-muted`, `accent` / `accent-hover` / `accent-fg`, `ring`. A global `:focus-visible` ring. Checkbox bumped to 24px. All later tasks style with these tokens.

- [ ] **Step 1: Replace `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        'fg-muted': 'rgb(var(--fg-muted) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          hover: 'rgb(var(--accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--accent-fg) / <alpha-value>)',
        },
        ring: 'rgb(var(--ring) / <alpha-value>)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
    },
  },
  plugins: [],
}
export default config
```

Note: default Tailwind colors (`slate`, `red`, `orange`, `emerald`, `blue`) remain available via `extend` and are still used for semantic accents (PROMO/danger/success) with `dark:` variants.

- [ ] **Step 2: Replace `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --bg: 248 250 252;
    --surface: 255 255 255;
    --surface-2: 241 245 249;
    --border: 226 232 240;
    --fg: 15 23 42;
    --fg-muted: 71 85 105;
    --accent: 37 99 235;
    --accent-hover: 29 78 216;
    --accent-fg: 255 255 255;
    --ring: 37 99 235;
  }

  .dark {
    --bg: 2 6 23;
    --surface: 15 23 42;
    --surface-2: 30 41 59;
    --border: 51 65 85;
    --fg: 241 245 249;
    --fg-muted: 148 163 184;
    --accent: 59 130 246;
    --accent-hover: 96 165 250;
    --accent-fg: 255 255 255;
    --ring: 96 165 250;
  }

  * {
    -webkit-tap-highlight-color: transparent;
  }

  html {
    @apply antialiased;
  }

  body {
    @apply bg-bg text-fg min-h-dvh;
  }

  :focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-bg;
  }

  input[type="checkbox"] {
    @apply appearance-none w-6 h-6 border-2 border-border rounded-md
      checked:bg-accent checked:border-accent
      transition-all duration-200 ease-out
      cursor-pointer shrink-0 relative;
  }

  input[type="checkbox"]:checked::after {
    content: '';
    @apply absolute inset-0 block;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E") center/70% no-repeat;
  }
}

@layer utilities {
  .animate-fade-in { animation: fadeIn 0.2s ease-out; }
  .animate-slide-up { animation: slideUp 0.25s ease-out; }
  .animate-scale-in { animation: scaleIn 0.2s ease-out; }
  .animate-check-bounce { animation: checkBounce 0.3s ease-out; }
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes checkBounce {
  0% { transform: scale(1); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds (app still renders light theme; `.dark` class not yet toggled, so no visible change yet).

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts src/app/globals.css
git commit -m "feat: add design tokens and dark-mode foundation"
```

---

## Task 2: ThemeContext + no-flash script + provider wiring

**Files:**
- Create: `src/lib/ThemeContext.tsx`
- Modify: `src/components/Providers.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `ThemeProvider` (React provider) and `useTheme()` → `{ theme: 'light'|'dark'|'system', setTheme(t), resolved: 'light'|'dark' }`. Reads/writes `localStorage['theme']`, toggles `.dark` on `<html>`.

- [ ] **Step 1: Create `src/lib/ThemeContext.tsx`**

```tsx
'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  resolved: 'light' | 'dark'
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  resolved: 'light',
})

function prefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system')
  const [resolved, setResolved] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      setTheme(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('theme', theme)
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && prefersDark())
      document.documentElement.classList.toggle('dark', dark)
      setResolved(dark ? 'dark' : 'light')
    }
    apply()
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      mq.addEventListener('change', apply)
      return () => mq.removeEventListener('change', apply)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolved }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
```

- [ ] **Step 2: Wrap `ThemeProvider` in `src/components/Providers.tsx`**

```tsx
'use client'

import { ThemeProvider } from '@/lib/ThemeContext'
import { FontSizeProvider } from '@/lib/FontSizeContext'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <FontSizeProvider>{children}</FontSizeProvider>
    </ThemeProvider>
  )
}
```

- [ ] **Step 3: Add the no-flash script to `<head>` in `src/app/layout.tsx`**

Insert this `<script>` inside `<head>`, after the existing meta/link tags (before `</head>`). It sets the `dark` class and font-size before first paint to avoid a flash:

```tsx
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('theme') || 'system';
                  var dark = t === 'dark' || (t === 'system' &&
                    window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (dark) document.documentElement.classList.add('dark');
                  var scales = { sm: 0.875, md: 1, lg: 1.125, xl: 1.25 };
                  var f = localStorage.getItem('fontSize');
                  if (f && scales[f]) document.documentElement.style.fontSize = (scales[f] * 100) + '%';
                } catch (e) {}
              })();
            `,
          }}
        />
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Manual verify**

Run `npm run dev`. In the browser devtools console: `localStorage.setItem('theme','dark'); location.reload()`. The `<html>` element should gain `class="dark"` and the page background should darken (body now uses `bg-bg`). Reset with `localStorage.setItem('theme','system')`.

- [ ] **Step 6: Commit**

```bash
git add src/lib/ThemeContext.tsx src/components/Providers.tsx src/app/layout.tsx
git commit -m "feat: theme context with persistence and no-flash init"
```

---

## Task 3: ThemeToggle button

**Files:**
- Create: `src/components/ThemeToggle.tsx`

**Interfaces:**
- Consumes: `useTheme()` from Task 2.
- Produces: default-exported `ThemeToggle` — a 44×44px button that cycles light → dark → system. Placed in headers in Tasks 10/11.

- [ ] **Step 1: Create `src/components/ThemeToggle.tsx`**

```tsx
'use client'

import { useTheme } from '@/lib/ThemeContext'
import { Sun, Moon, Monitor } from 'lucide-react'

const order = ['light', 'dark', 'system'] as const
const icons = { light: Sun, dark: Moon, system: Monitor }
const labels = {
  light: 'Tema claro',
  dark: 'Tema escuro',
  system: 'Tema do sistema',
}

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const Icon = icons[theme]

  function cycle() {
    const i = order.indexOf(theme)
    setTheme(order[(i + 1) % order.length])
  }

  return (
    <button
      onClick={cycle}
      title={labels[theme]}
      className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90 shrink-0"
    >
      <Icon size={18} />
    </button>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds (component not yet mounted; verified visually in Tasks 10/11).

- [ ] **Step 3: Commit**

```bash
git add src/components/ThemeToggle.tsx
git commit -m "feat: theme toggle button"
```

---

## Task 4: Toast system (loading/error feedback)

**Files:**
- Create: `src/components/Toast.tsx`
- Modify: `src/components/Providers.tsx`

**Interfaces:**
- Produces: `ToastProvider` (provider that renders the toast stack) and `useToast()` → `show(message: string, kind?: 'error' | 'success')`. Consumed by pages in Tasks 10/11.

- [ ] **Step 1: Create `src/components/Toast.tsx`**

```tsx
'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { X, AlertCircle, CheckCircle2 } from 'lucide-react'

type ToastKind = 'error' | 'success'
type ToastItem = { id: string; message: string; kind: ToastKind }
type ToastContextType = { show: (message: string, kind?: ToastKind) => void }

const ToastContext = createContext<ToastContextType>({ show: () => {} })

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const show = useCallback((message: string, kind: ToastKind = 'error') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, kind }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismiss = (id: string) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 inset-x-0 z-50 flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map(t => {
          const Icon = t.kind === 'error' ? AlertCircle : CheckCircle2
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full max-w-sm flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg animate-slide-up ${
                t.kind === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-900 dark:text-red-200'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-900 dark:text-emerald-200'
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="text-sm flex-1">{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                title="Fechar"
                className="shrink-0 w-8 h-8 -mr-1 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext).show
}
```

- [ ] **Step 2: Wrap `ToastProvider` (innermost) in `src/components/Providers.tsx`**

```tsx
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
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/Toast.tsx src/components/Providers.tsx
git commit -m "feat: toast system for action feedback"
```

---

## Task 5: Skeleton + ProgressBar presentational components

**Files:**
- Create: `src/components/Skeleton.tsx`
- Create: `src/components/ProgressBar.tsx`

**Interfaces:**
- Produces: `SkeletonList` (named) → renders N skeleton cards (default 4); `ProgressBar` (default) with props `{ done: number; total: number }`. Consumed in Tasks 10/11.

- [ ] **Step 1: Create `src/components/Skeleton.tsx`**

```tsx
export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl border border-border px-4 py-3.5 flex items-center gap-3 animate-pulse">
      <div className="w-6 h-6 rounded-md bg-surface-2" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-1/2 rounded bg-surface-2" />
        <div className="h-2.5 w-1/4 rounded bg-surface-2" />
      </div>
    </div>
  )
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/ProgressBar.tsx`**

```tsx
export default function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-fg-muted">
          {done} de {total} comprados
        </span>
        <span className="text-sm font-semibold text-accent">{pct}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/Skeleton.tsx src/components/ProgressBar.tsx
git commit -m "feat: skeleton and progress bar components"
```

---

## Task 6: Image compression utility

**Files:**
- Create: `src/lib/image.ts`

**Interfaces:**
- Produces: `compressImage(file: File): Promise<string>` — returns a resized (longest side ≤ 1024px) JPEG data URL (quality 0.7). Consumed in Task 11.

- [ ] **Step 1: Create `src/lib/image.ts`**

```ts
const MAX_DIM = 1024
const QUALITY = 0.7

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export async function compressImage(file: File): Promise<string> {
  const dataUrl = await readFile(file)
  const img = await loadImage(dataUrl)

  let { width, height } = img
  if (width >= height && width > MAX_DIM) {
    height = Math.round((height * MAX_DIM) / width)
    width = MAX_DIM
  } else if (height > width && height > MAX_DIM) {
    width = Math.round((width * MAX_DIM) / height)
    height = MAX_DIM
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return dataUrl
  ctx.drawImage(img, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', QUALITY)
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/lib/image.ts
git commit -m "feat: client-side image compression util"
```

---

## Task 7: API — list counts + bulk delete of purchased items

**Files:**
- Modify: `src/app/api/lists/route.ts`
- Modify: `src/app/api/lists/[id]/items/route.ts`

**Interfaces:**
- Produces: `GET /api/lists` rows now include numeric `total` and `checked`. New `DELETE /api/lists/[id]/items` removes checked items for the list. Consumed in Tasks 10/11.

- [ ] **Step 1: Update `GET` in `src/app/api/lists/route.ts`**

Replace the `GET` function (leave `POST` unchanged):

```ts
export async function GET() {
  const db = getDb()
  const result = await db.execute(`
    SELECT
      l.id,
      l.name,
      l.created_at,
      COUNT(i.id) AS total,
      COALESCE(SUM(i.is_checked), 0) AS checked
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    GROUP BY l.id, l.name, l.created_at
    ORDER BY l.created_at DESC
  `)
  return NextResponse.json(result.rows)
}
```

- [ ] **Step 2: Add `DELETE` to `src/app/api/lists/[id]/items/route.ts`**

Append (keep existing `GET` and `POST`):

```ts
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const db = getDb()
  await db.execute({
    sql: 'DELETE FROM items WHERE list_id = ? AND is_checked = 1',
    args: [params.id],
  })
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Manual verify**

With `npm run dev` and the Turso env vars set: `curl localhost:3000/api/lists` returns rows each having `total` and `checked` numbers. (Bulk delete is exercised via the UI in Task 11.)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/lists/route.ts src/app/api/lists/[id]/items/route.ts
git commit -m "feat: list item counts and bulk delete of purchased items"
```

---

## Task 8: Refresh shared components (tokens + targets + contrast)

**Files:**
- Modify: `src/components/PageHeader.tsx`
- Modify: `src/components/EmptyState.tsx`
- Modify: `src/components/AddItemForm.tsx`
- Modify: `src/components/ConfirmDialog.tsx`
- Modify: `src/components/ImageViewer.tsx`
- Modify: `src/components/AccessibilityBar.tsx`

**Interfaces:**
- Props/exports unchanged for every component; only classes change (neutrals → tokens, accent colors get `dark:` variants, controls grow to ≥44px where actionable). Relies on global `:focus-visible` from Task 1 (per-element `focus:*` ring classes removed).

- [ ] **Step 1: Replace `src/components/PageHeader.tsx`**

```tsx
'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Props = {
  title: string
  backTo?: string
}

export default function PageHeader({ title, backTo }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3">
      {backTo && (
        <button
          className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-2 active:scale-90 transition-all shrink-0"
          onClick={() => router.push(backTo)}
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>
      )}
      <h1 className="text-xl font-semibold text-fg truncate">{title}</h1>
    </div>
  )
}
```

- [ ] **Step 2: Replace `src/components/EmptyState.tsx`**

```tsx
import { ShoppingBag } from 'lucide-react'

type Props = {
  message: string
}

export default function EmptyState({ message }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 animate-fadeIn">
      <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4">
        <ShoppingBag size={28} className="text-fg-muted" />
      </div>
      <p className="text-sm text-fg-muted text-center">{message}</p>
    </div>
  )
}
```

- [ ] **Step 3: Replace `src/components/AddItemForm.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'

type Props = {
  onAdd: (name: string, quantity: string) => void
}

export default function AddItemForm({ onAdd }: Props) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState('')

  function handleSubmit() {
    if (!name.trim()) return
    onAdd(name.trim(), qty.trim())
    setName('')
    setQty('')
  }

  return (
    <div className="flex gap-2 mb-6">
      <div className="flex-1 relative">
        <input
          className="w-full h-12 pl-4 pr-3 rounded-xl border border-border bg-surface text-base text-fg placeholder-fg-muted focus:border-accent transition-colors"
          placeholder="Produto..."
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
      </div>
      <input
        className="w-20 h-12 px-3 rounded-xl border border-border bg-surface text-base text-fg placeholder-fg-muted focus:border-accent transition-colors text-center"
        placeholder="Qtd"
        value={qty}
        onChange={e => setQty(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
      />
      <button
        className="h-12 w-12 flex items-center justify-center rounded-xl bg-accent text-accent-fg hover:bg-accent-hover active:scale-95 transition-all shrink-0"
        onClick={handleSubmit}
        title="Adicionar"
      >
        <Plus size={22} />
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Replace `src/components/ConfirmDialog.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'default'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: Props) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) confirmRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])

  if (!open) return null

  const isDanger = variant === 'danger'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn"
      onClick={onCancel}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-2 transition-colors"
          onClick={onCancel}
          title="Fechar"
        >
          <X size={20} />
        </button>

        <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
          isDanger
            ? 'bg-red-100 dark:bg-red-950'
            : 'bg-blue-100 dark:bg-blue-950'
        }`}>
          <AlertTriangle size={24} className={isDanger ? 'text-red-500 dark:text-red-400' : 'text-blue-500 dark:text-blue-400'} />
        </div>

        <h2 className="text-lg font-semibold text-fg mb-2">{title}</h2>
        <p className="text-sm text-fg-muted mb-6 leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button
            className="flex-1 px-4 py-3 rounded-xl border border-border text-fg font-medium text-sm hover:bg-surface-2 transition-colors"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`flex-1 px-4 py-3 rounded-xl font-medium text-sm text-white transition-colors ${
              isDanger
                ? 'bg-red-500 hover:bg-red-600 active:bg-red-700'
                : 'bg-accent hover:bg-accent-hover'
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Replace `src/components/ImageViewer.tsx`** (zoom buttons grow to 44px; backdrop already dark — keep)

```tsx
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
```

- [ ] **Step 6: Replace `src/components/AccessibilityBar.tsx`** (tokens + larger size chips)

```tsx
'use client'

import { useFontSize } from '@/lib/FontSizeContext'
import { Minus, Plus } from 'lucide-react'

const sizes = [
  { value: 'sm' as const, label: 'P' },
  { value: 'md' as const, label: 'M' },
  { value: 'lg' as const, label: 'G' },
  { value: 'xl' as const, label: 'XG' },
]

export default function AccessibilityBar() {
  const { size, setSize } = useFontSize()
  const currentIndex = sizes.findIndex(s => s.value === size)

  function cyclePrev() {
    const next = currentIndex > 0 ? currentIndex - 1 : sizes.length - 1
    setSize(sizes[next].value)
  }

  function cycleNext() {
    const next = currentIndex < sizes.length - 1 ? currentIndex + 1 : 0
    setSize(sizes[next].value)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90 shrink-0"
        onClick={cyclePrev}
        title="Diminuir fonte"
      >
        <Minus size={16} />
      </button>
      <div className="flex items-center gap-0.5">
        {sizes.map((s) => (
          <button
            key={s.value}
            className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
              size === s.value
                ? 'bg-accent text-accent-fg'
                : 'text-fg-muted hover:text-fg hover:bg-surface-2'
            }`}
            onClick={() => setSize(s.value)}
            title={`Fonte ${s.label}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <button
        className="w-11 h-11 flex items-center justify-center rounded-xl border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90 shrink-0"
        onClick={cycleNext}
        title="Aumentar fonte"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
```

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 8: Commit**

```bash
git add src/components/PageHeader.tsx src/components/EmptyState.tsx src/components/AddItemForm.tsx src/components/ConfirmDialog.tsx src/components/ImageViewer.tsx src/components/AccessibilityBar.tsx
git commit -m "refresh: tokens, larger targets, and contrast on shared components"
```

---

## Task 9: Refresh ItemCard

**Files:**
- Modify: `src/components/ItemCard.tsx`

**Interfaces:**
- Props unchanged. Neutrals → tokens, action buttons grow to 40px (with extra row padding to stay comfortable), PROMO badge and active states get `dark:` variants.

- [ ] **Step 1: Replace `src/components/ItemCard.tsx`**

```tsx
'use client'

import { useState } from 'react'
import { Tag, Image, Eye, Pencil, Trash2 } from 'lucide-react'

type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  photo_base64: string
}

type Props = {
  item: Item
  onToggleCheck: () => void
  onTogglePromotion: () => void
  onEdit: () => void
  onDelete: () => void
  onPhoto: (file: File) => void
  onViewPhoto?: () => void
}

export default function ItemCard({
  item,
  onToggleCheck,
  onTogglePromotion,
  onEdit,
  onDelete,
  onPhoto,
  onViewPhoto,
}: Props) {
  const [showPhoto, setShowPhoto] = useState(false)

  return (
    <div
      className={`bg-surface rounded-xl border border-border shadow-sm px-4 py-3.5 flex items-center gap-3 transition-all duration-200 ${
        item.is_checked ? 'opacity-50' : 'animate-slide-up'
      }`}
    >
      <input
        type="checkbox"
        checked={!!item.is_checked}
        onChange={onToggleCheck}
        className="animate-check-bounce"
        title="Marcar como comprado"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-base font-medium ${
              item.is_checked ? 'line-through text-fg-muted' : 'text-fg'
            }`}
          >
            {item.name}
          </span>
          {item.quantity && (
            <span className="text-xs font-medium text-fg-muted bg-surface-2 px-2 py-0.5 rounded-full">
              {item.quantity}
            </span>
          )}
          {!!item.is_promotion && (
            <span className="text-[11px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded-full dark:text-orange-300 dark:bg-orange-950 dark:border-orange-900">
              PROMO
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <IconButton
          icon={<Tag size={16} />}
          active={!!item.is_promotion}
          activeClass="text-orange-600 bg-orange-100 border-orange-200 dark:text-orange-300 dark:bg-orange-950 dark:border-orange-900"
          onClick={onTogglePromotion}
          title="Promoção"
        />
        <IconButton
          icon={<Image size={16} />}
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'image/*'
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) onPhoto(file)
            }
            input.click()
          }}
          title="Foto"
        />
        {item.photo_base64 && (
          <IconButton
            icon={<Eye size={16} />}
            active={showPhoto}
            activeClass="text-accent bg-surface-2 border-border"
            onClick={() => {
              if (onViewPhoto) {
                setShowPhoto(false)
                onViewPhoto()
              } else {
                setShowPhoto(!showPhoto)
              }
            }}
            title="Ver foto"
          />
        )}
        <IconButton icon={<Pencil size={16} />} onClick={onEdit} title="Editar" />
        <IconButton icon={<Trash2 size={16} />} onClick={onDelete} title="Excluir" />
      </div>

      {showPhoto && item.photo_base64 && (
        <div className="absolute top-full right-0 z-10 mt-2 animate-fadeIn">
          <div className="bg-surface rounded-xl border border-border shadow-lg p-2">
            <img
              src={item.photo_base64}
              alt="Foto do item"
              className="max-w-40 max-h-40 rounded-lg object-cover"
            />
          </div>
        </div>
      )}
    </div>
  )
}

function IconButton({
  icon,
  active = false,
  activeClass = '',
  onClick,
  title,
}: {
  icon: React.ReactNode
  active?: boolean
  activeClass?: string
  onClick: () => void
  title: string
}) {
  return (
    <button
      className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all duration-150 active:scale-90 ${
        active
          ? activeClass
          : 'border-border text-fg-muted hover:text-fg hover:bg-surface-2'
      }`}
      onClick={onClick}
      title={title}
    >
      {icon}
    </button>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/ItemCard.tsx
git commit -m "refresh: tokens, larger action buttons, dark variants on ItemCard"
```

---

## Task 10: Home page — counts, skeleton, toasts, theme toggle, tokens

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `useToast` (Task 4), `SkeletonList` (Task 5), `ThemeToggle` (Task 3), `GET /api/lists` rows with `total`/`checked` (Task 7).

- [ ] **Step 1: Replace `src/app/page.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, ShoppingBag, Check } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import AccessibilityBar from '@/components/AccessibilityBar'
import ThemeToggle from '@/components/ThemeToggle'
import { SkeletonList } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'

type List = {
  id: string
  name: string
  created_at: string
  total: number
  checked: number
}

export default function Home() {
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<List | null>(null)
  const router = useRouter()
  const toast = useToast()

  async function fetchLists() {
    try {
      const res = await fetch('/api/lists')
      if (!res.ok) throw new Error()
      setLists(await res.json())
    } catch {
      toast('Não foi possível carregar as listas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLists() }, [])

  async function createList() {
    if (!newName.trim()) return
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (!res.ok) throw new Error()
      setNewName('')
      fetchLists()
    } catch {
      toast('Não foi possível criar a lista.')
    }
  }

  async function deleteList() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      const res = await fetch(`/api/lists/${target.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchLists()
    } catch {
      toast('Não foi possível excluir a lista.')
    }
  }

  async function renameList(id: string) {
    if (!editName.trim()) return
    try {
      const res = await fetch(`/api/lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) throw new Error()
      setEditingId(null)
      fetchLists()
    } catch {
      toast('Não foi possível renomear a lista.')
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR')
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shrink-0">
          <ShoppingBag size={22} className="text-accent-fg" />
        </div>
        <h1 className="text-xl font-semibold text-fg flex-1">Minhas Listas</h1>
        <ThemeToggle />
      </div>

      <div className="flex justify-end mb-4">
        <AccessibilityBar />
      </div>

      <div className="flex gap-2 mb-6">
        <div className="flex-1 relative">
          <input
            className="w-full h-12 pl-4 pr-3 rounded-xl border border-border bg-surface text-base text-fg placeholder-fg-muted focus:border-accent transition-colors"
            placeholder="Nova lista..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createList()}
          />
        </div>
        <button
          className="h-12 w-12 flex items-center justify-center rounded-xl bg-accent text-accent-fg hover:bg-accent-hover active:scale-95 transition-all shrink-0"
          onClick={createList}
          title="Criar lista"
        >
          <Plus size={22} />
        </button>
      </div>

      {loading ? (
        <SkeletonList />
      ) : (
        <div className="space-y-2">
          {lists.map((list, i) => (
            <div
              key={list.id}
              className="bg-surface rounded-xl border border-border shadow-sm px-4 py-3.5 flex items-center gap-3 transition-all duration-200 hover:border-fg-muted/40 active:scale-[0.98] animate-slide-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              {editingId === list.id ? (
                <div className="flex gap-2 flex-1 items-center">
                  <input
                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-base text-fg focus:border-accent transition-colors"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') renameList(list.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    autoFocus
                  />
                  <button
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
                    onClick={() => renameList(list.id)}
                    title="Salvar"
                  >
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => router.push(`/lists/${list.id}`)}
                >
                  <p className="text-base font-medium text-fg truncate">{list.name}</p>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {list.total > 0
                      ? `${list.checked} de ${list.total} comprados · ${formatDate(list.created_at)}`
                      : formatDate(list.created_at)}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-border text-fg-muted hover:text-fg hover:bg-surface-2 transition-all active:scale-90"
                  onClick={() => {
                    setEditingId(list.id)
                    setEditName(list.name)
                  }}
                  title="Renomear"
                >
                  <Pencil size={16} />
                </button>
                <button
                  className="w-10 h-10 flex items-center justify-center rounded-lg border border-border text-fg-muted hover:text-red-500 hover:border-red-300 hover:bg-red-50 dark:hover:bg-red-950 transition-all active:scale-90"
                  onClick={() => setDeleteTarget(list)}
                  title="Excluir"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {lists.length === 0 && (
            <EmptyState message="Nenhuma lista ainda. Crie uma acima!" />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir lista"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"? Todos os itens serão perdidos.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={deleteList}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual verify** (`npm run dev`)

- Initial load shows skeleton cards, then the lists.
- Each list with items shows "X de Y comprados · data".
- The theme toggle (top-right) cycles claro → escuro → sistema; colors invert and persist on reload.
- Tab through the page: every input/button shows a visible focus ring.
- Stop the dev server's DB (or break the URL) → actions surface an error toast instead of failing silently.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: home page counts, skeleton, toasts, theme toggle, tokens"
```

---

## Task 11: List page — progress bar, clear purchased, skeleton, toasts, compressed photos, tokens

**Files:**
- Modify: `src/app/lists/[id]/page.tsx`

**Interfaces:**
- Consumes: `compressImage` (Task 6), `ProgressBar` (Task 5), `SkeletonList` (Task 5), `useToast` (Task 4), `ThemeToggle` (Task 3), `DELETE /api/lists/[id]/items` (Task 7).

- [ ] **Step 1: Replace `src/app/lists/[id]/page.tsx`**

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import AddItemForm from '@/components/AddItemForm'
import ItemCard from '@/components/ItemCard'
import ConfirmDialog from '@/components/ConfirmDialog'
import EmptyState from '@/components/EmptyState'
import ImageViewer from '@/components/ImageViewer'
import AccessibilityBar from '@/components/AccessibilityBar'
import ThemeToggle from '@/components/ThemeToggle'
import ProgressBar from '@/components/ProgressBar'
import { SkeletonList } from '@/components/Skeleton'
import { useToast } from '@/components/Toast'
import { compressImage } from '@/lib/image'

type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  photo_base64: string
}

export default function ListPage() {
  const { id } = useParams<{ id: string }>()
  const [listName, setListName] = useState('')
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editQty, setEditQty] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null)
  const [clearOpen, setClearOpen] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    fetch(`/api/lists/${id}`)
      .then(r => r.json())
      .then(data => setListName(data.name))
      .catch(() => toast('Não foi possível carregar a lista.'))
    fetchItems()
  }, [id])

  async function fetchItems() {
    try {
      const res = await fetch(`/api/lists/${id}/items`)
      if (!res.ok) throw new Error()
      setItems(await res.json())
    } catch {
      toast('Não foi possível carregar os itens.')
    } finally {
      setLoading(false)
    }
  }

  const addItem = useCallback(async (name: string, quantity: string) => {
    const tempId = `temp-${crypto.randomUUID()}`
    const optimistic: Item = {
      id: tempId, name, quantity,
      is_checked: 0, is_promotion: 0, photo_base64: '',
    }
    setItems(prev => [...prev, optimistic])
    try {
      const res = await fetch(`/api/lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      setItems(prev => prev.filter(i => i.id !== tempId))
      toast('Não foi possível adicionar o item.')
    }
  }, [id])

  const toggleCheck = useCallback(async (item: Item) => {
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_checked: i.is_checked ? 0 : 1 } : i
    ))
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_checked: item.is_checked ? 0 : 1 }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível atualizar o item.')
      fetchItems()
    }
  }, [])

  const togglePromotion = useCallback(async (item: Item) => {
    setItems(prev => prev.map(i =>
      i.id === item.id ? { ...i, is_promotion: i.is_promotion ? 0 : 1 } : i
    ))
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_promotion: item.is_promotion ? 0 : 1 }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível atualizar o item.')
      fetchItems()
    }
  }, [])

  const updateItem = useCallback(async (itemId: string) => {
    if (!editName.trim()) return
    setEditingId(null)
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, name: editName.trim(), quantity: editQty.trim() } : i
    ))
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim(), quantity: editQty.trim() }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível salvar o item.')
      fetchItems()
    }
  }, [editName, editQty])

  const deleteItem = useCallback(async () => {
    if (!deleteTarget) return
    const deleted = deleteTarget
    setDeleteTarget(null)
    setItems(prev => prev.filter(i => i.id !== deleted.id))
    try {
      const res = await fetch(`/api/items/${deleted.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível excluir o item.')
      fetchItems()
    }
  }, [deleteTarget])

  const clearChecked = useCallback(async () => {
    setClearOpen(false)
    setItems(prev => prev.filter(i => !i.is_checked))
    try {
      const res = await fetch(`/api/lists/${id}/items`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível limpar os comprados.')
      fetchItems()
    }
  }, [id])

  const handlePhoto = useCallback(async (file: File, itemId: string) => {
    try {
      const base64 = await compressImage(file)
      setItems(prev => prev.map(i => (i.id === itemId ? { ...i, photo_base64: base64 } : i)))
      const res = await fetch(`/api/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_base64: base64 }),
      })
      if (!res.ok) throw new Error()
      fetchItems()
    } catch {
      toast('Não foi possível salvar a foto.')
    }
  }, [])

  const unchecked = items.filter(i => !i.is_checked)
  const checked = items.filter(i => i.is_checked)

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <PageHeader title={listName} backTo="/" />
        </div>
        <ThemeToggle />
      </div>

      <div className="flex justify-end mb-5">
        <AccessibilityBar />
      </div>

      {items.length > 0 && (
        <ProgressBar done={checked.length} total={items.length} />
      )}

      <AddItemForm onAdd={addItem} />

      {loading ? (
        <SkeletonList />
      ) : (
        <div className="space-y-2">
          {unchecked.map((item, i) => (
            <div key={item.id} className="relative" style={{ animationDelay: `${i * 30}ms` }}>
              {editingId === item.id ? (
                <EditInline
                  name={editName}
                  qty={editQty}
                  onNameChange={setEditName}
                  onQtyChange={setEditQty}
                  onSave={() => updateItem(item.id)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <ItemCard
                  item={item}
                  onToggleCheck={() => toggleCheck(item)}
                  onTogglePromotion={() => togglePromotion(item)}
                  onEdit={() => {
                    setEditingId(item.id)
                    setEditName(item.name)
                    setEditQty(item.quantity)
                  }}
                  onDelete={() => setDeleteTarget(item)}
                  onPhoto={(file) => handlePhoto(file, item.id)}
                  onViewPhoto={() => setViewingPhoto(item.photo_base64)}
                />
              )}
            </div>
          ))}

          {checked.length > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-3 px-1">
                <p className="text-xs font-medium text-fg-muted uppercase tracking-wider">
                  Comprados ({checked.length})
                </p>
                <button
                  className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950 transition-colors"
                  onClick={() => setClearOpen(true)}
                  title="Limpar comprados"
                >
                  <Trash2 size={15} />
                  Limpar
                </button>
              </div>
              <div className="space-y-2">
                {checked.map((item) => (
                  <div key={item.id} className="relative">
                    {editingId === item.id ? (
                      <EditInline
                        name={editName}
                        qty={editQty}
                        onNameChange={setEditName}
                        onQtyChange={setEditQty}
                        onSave={() => updateItem(item.id)}
                        onCancel={() => setEditingId(null)}
                      />
                    ) : (
                      <ItemCard
                        item={item}
                        onToggleCheck={() => toggleCheck(item)}
                        onTogglePromotion={() => togglePromotion(item)}
                        onEdit={() => {
                          setEditingId(item.id)
                          setEditName(item.name)
                          setEditQty(item.quantity)
                        }}
                        onDelete={() => setDeleteTarget(item)}
                        onPhoto={(file) => handlePhoto(file, item.id)}
                        onViewPhoto={() => setViewingPhoto(item.photo_base64)}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {items.length === 0 && (
            <EmptyState message="Nenhum item ainda. Adicione produtos acima!" />
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Excluir item"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={deleteItem}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={clearOpen}
        title="Limpar comprados"
        message={`Remover os ${checked.length} itens já comprados desta lista?`}
        confirmLabel="Limpar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={clearChecked}
        onCancel={() => setClearOpen(false)}
      />

      {viewingPhoto && (
        <ImageViewer
          src={viewingPhoto}
          alt="Foto do item"
          onClose={() => setViewingPhoto(null)}
        />
      )}
    </div>
  )
}

function EditInline({
  name,
  qty,
  onNameChange,
  onQtyChange,
  onSave,
  onCancel,
}: {
  name: string
  qty: string
  onNameChange: (v: string) => void
  onQtyChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="bg-surface rounded-xl border border-accent shadow-sm px-4 py-3 flex gap-2 items-center animate-fadeIn">
      <input
        className="flex-1 h-10 px-3 rounded-lg border border-border bg-surface text-base text-fg focus:border-accent transition-colors"
        value={name}
        onChange={e => onNameChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') onSave()
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
      />
      <input
        className="w-16 h-10 px-2 rounded-lg border border-border bg-surface text-base text-fg text-center focus:border-accent transition-colors"
        value={qty}
        onChange={e => onQtyChange(e.target.value)}
      />
      <button
        className="h-10 px-4 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 active:scale-95 transition-all"
        onClick={onSave}
      >
        OK
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 3: Manual verify** (`npm run dev`)

- Open a list: skeleton, then items; a progress bar shows "X de Y comprados" + percentage that updates as you check items.
- Add a photo to an item: it still displays, but the stored value is a compressed JPEG data URL (check via devtools Network/Application that it's smaller than the original).
- Check some items → "Comprados (N)" section appears with a "Limpar" button → confirm dialog → items removed.
- Toggle dark mode via the top-right button: cards, dialogs, progress bar, PROMO badge all adapt.
- Force a request failure → an error toast appears and the optimistic change reverts.

- [ ] **Step 4: Commit**

```bash
git add src/app/lists/[id]/page.tsx
git commit -m "feat: list progress, clear purchased, compressed photos, toasts, tokens"
```

---

## Self-Review (completed during planning)

- **Spec coverage:** Theme/dark mode → T1–T3, T8–T11 `dark:` variants. Accessibility (targets/contrast/focus/font) → T1 (focus + checkbox), T8/T9 (44px targets, `fg-muted` contrast), AccessibilityBar retained. Loading/error → T4 (toasts), T5 (skeleton), wired in T10/T11. Counts/progress → T7 (API), T5 (bar), T10 (home line), T11 (bar). Clear purchased → T7 (endpoint), T11 (button + dialog). Photo compression → T6, wired in T11. Structure → Providers (T2/T4), new files (T2,T3,T4,T5,T6). API → T7. All spec sections covered.
- **Placeholder scan:** none — every step ships full code/commands.
- **Type consistency:** `useTheme`/`ThemeProvider` (T2) ↔ `ThemeToggle` (T3); `useToast`→`show` (T4) ↔ pages (T10/T11); `SkeletonList`/`ProgressBar` (T5) ↔ pages; `compressImage` (T6) ↔ T11; `GET /api/lists` `total`/`checked` (T7) ↔ `List` type (T10); `DELETE /api/lists/[id]/items` (T7) ↔ `clearChecked` (T11). Consistent.

## Notes / Risk

- `body` background moves from `bg-slate-50` to `bg-bg` (token) — visually identical in light mode.
- Components still using default palette for accents (red/orange/emerald/blue) are intentional and carry `dark:` variants where they appear on surfaces.
- libSQL returns `COUNT`/`SUM` as JS numbers for small values, so `total`/`checked` serialize fine in JSON.
