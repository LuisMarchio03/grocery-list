import { test, expect, type Page } from '@playwright/test'
import { readFileSync } from 'fs'

/**
 * Lê o id da lista de teste SOB DEMANDA, nunca no escopo do módulo.
 * O Playwright carrega todos os specs na fase de coleta, ANTES de qualquer
 * projeto rodar — inclusive o `setup`, que é quem cria este arquivo. Um
 * readFileSync no topo faz a suíte inteira abortar com ENOENT num checkout
 * limpo (e2e/.auth é gitignored), sem rodar teste nenhum.
 */
function listPath() {
  return `/lists/${readFileSync('e2e/.auth/list-id.txt', 'utf-8').trim()}`
}

const AUTHED_SCREENS = [
  { name: 'home', path: () => '/' },
  { name: 'lista', path: listPath },
  { name: 'grupos', path: () => '/groups' },
]

// 'md' = padrão; 'xl' = maior nível, o caso que o usuário relatou.
// 'sm' incluído de propósito: é o tamanho onde a raiz cai a 87.5%, então 2.75rem
// vira 38.5px — o único ponto em que um alvo em rem puro fura o piso físico de 44px.
// Sem ele, botões que só quebram no 'sm' passam despercebidos (foi o que aconteceu).
const SIZES = ['sm', 'md', 'xl'] as const

/** Crava o tamanho da fonte antes de qualquer paint, como o script anti-FOUC fará. */
async function withFontSize(page: Page, size: string) {
  await page.addInitScript(s => window.localStorage.setItem('fontSize', s), size)
}

/** Mede estouro horizontal na raiz do documento. */
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => {
    const el = document.documentElement
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }
  })
}

/** Botões visíveis menores que o mínimo físico de 44px. */
async function smallTouchTargets(page: Page) {
  return page.evaluate(() => {
    const MIN = 44
    return Array.from(document.querySelectorAll('button'))
      .map(el => ({ el, r: el.getBoundingClientRect() }))
      .filter(({ r }) => r.width > 0 && r.height > 0)
      .filter(({ r }) => r.height < MIN || r.width < MIN)
      .map(({ el, r }) => ({
        label: el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 24) || '(sem rótulo)',
        size: `${Math.round(r.width)}x${Math.round(r.height)}`,
      }))
  })
}

test.describe('telas autenticadas', () => {
  test.use({ storageState: 'e2e/.auth/state.json' })

  for (const screen of AUTHED_SCREENS) {
    for (const size of SIZES) {
      test(`${screen.name} @ fonte ${size} — sem scroll horizontal`, async ({ page }) => {
        await withFontSize(page, size)
        await page.goto(screen.path())
        await page.waitForLoadState('networkidle')

        const { scrollWidth, clientWidth } = await horizontalOverflow(page)
        expect(
          scrollWidth,
          `a página estoura ${scrollWidth - clientWidth}px além da viewport de ${clientWidth}px`
        ).toBeLessThanOrEqual(clientWidth)
      })

      test(`${screen.name} @ fonte ${size} — alvos de toque >= 44px`, async ({ page }) => {
        await withFontSize(page, size)
        await page.goto(screen.path())
        await page.waitForLoadState('networkidle')

        expect(await smallTouchTargets(page)).toEqual([])
      })
    }
  }
})

test.describe('login (sem autenticação)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  for (const size of SIZES) {
    test(`login @ fonte ${size} — sem scroll horizontal`, async ({ page }) => {
      await withFontSize(page, size)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      const { scrollWidth, clientWidth } = await horizontalOverflow(page)
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
    })

    test(`login @ fonte ${size} — alvos de toque >= 44px`, async ({ page }) => {
      await withFontSize(page, size)
      await page.goto('/login')
      await page.waitForLoadState('networkidle')

      expect(await smallTouchTargets(page)).toEqual([])
    })
  }
})
