# Melhorias de UI, UX e Responsividade — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consertar o que quebra o app (Service Worker, flash de tema, cabeçalho estourando, dark mode) e fazer a interface funcionar de verdade quando o usuário aumenta o tamanho da fonte.

**Architecture:** Três fases sequenciais por risco. A Fase 1 cria o chão para validar (SQLite local + Playwright) e seus testes **falham de propósito**. A Fase 2 conserta os bugs que quebram e faz esses testes passarem. A Fase 3 pole (escala de fonte, reflow, acessibilidade). Cada fase termina num app melhor e verificável.

**Tech Stack:** Next.js 16.2.10 (App Router, Turbopack) · React 18.3.1 · TypeScript 5.4 · Tailwind 3.4 · @libsql/client 0.14 (Turso em prod, SQLite local em dev) · lucide-react 1.17 · Playwright (a adicionar)

## Global Constraints

Estas regras valem para **todas** as tasks. Os requisitos de cada task as incluem implicitamente.

- **SEM GIT.** Decisão explícita do usuário (2026-07-17). O projeto não é um repositório git e **não deve ser inicializado como um**. Nunca rodar `git init`, `git add`, `git commit`. Nenhuma task tem passo de commit; o gate de cada task é o teste passando.
- **Idioma:** todo texto visível ao usuário em **português do Brasil**. Identificadores de código (variáveis, funções, tipos) em **inglês**. Para **comentários**, siga o idioma do arquivo que você está editando — o repositório é misto de propósito e ambos são aceitos: `scripts/migrate.mjs` comenta em inglês (`// Create new tables`), `src/components/ItemCard.tsx` comenta em português (`{/* Fileira 1: checkbox + nome do produto */}`). Consistência **dentro do arquivo** é o que vale; não traduza comentários pré-existentes.
- **Linguagem visual preservada:** paleta slate/azul, cards `rounded-xl`, sombras suaves. Não redesenhar. Não introduzir biblioteca de UI nem design system.
- **Fora de escopo (não tocar):** CORS, CSP, rate limit, `JWT_SECRET`, migração `middleware.ts` → `proxy.ts`. Se aparecerem, apenas registrar.
- **Alvo de toque:** mínimo **44px físicos**, sempre via `max(<rem>, 44px)` — nunca `rem` puro, que encolhe abaixo de 44px no tamanho de fonte "P" (base 14px → `2.75rem` = 38.5px).
- **Escala de fonte:** nunca usar px cravado para texto, ícone ou espaçamento que deva escalar. Usar `rem` (classes Tailwind) ou `em`.
- **Sem breakpoint para problema de fonte:** breakpoints (`sm:`/`md:`) olham a viewport; onde o gatilho é o tamanho da fonte, usar CSS intrínseco (`grid auto-fit` + `minmax` em `rem`).
- **Versões verificadas em 2026-07-17:** `npm install` roda limpo (150 pacotes, sem conflito de peer) e `npm run build` passa no baseline. Não "consertar" versões.

---

## Estrutura de arquivos

### Fase 1 — Fundação
| Arquivo | Responsabilidade |
|---|---|
| `src/lib/db-config.mjs` (criar) | **Fonte única** da resolução de URL/token e da trava de produção. Consumido pelo app **e** pelos scripts |
| `src/lib/db.ts` (modificar) | Só instancia o client; importa a resolução do `db-config.mjs` |
| `scripts/migrate.mjs`, `scripts/seed.mjs`, `scripts/check.mjs` (modificar) | Consomem `src/lib/db-config.mjs` |
| `package.json` (modificar) | Scripts `migrate`, `seed`, `test`, `test:ui` |
| `.gitignore` (modificar) | `dev.db`, `e2e/.auth`, `test-results` |
| `playwright.config.ts` (criar) | Viewport 360×740, webServer, projeto `setup` + `mobile-360` |
| `e2e/global-setup.ts` (criar) | Roda migrate + seed antes de tudo (não depende do servidor) |
| `e2e/auth.setup.ts` (criar) | Loga, cria lista de teste com itens, salva `storageState` |
| `e2e/layout.spec.ts` (criar) | As asserções de layout |

### Fase 2 — Bugs que quebram
| Arquivo | Responsabilidade |
|---|---|
| `public/sw.js` (reescrever) | Estratégia de cache por tipo de recurso |
| `src/app/layout.tsx` (modificar) | Script bloqueante anti-FOUC + `suppressHydrationWarning` |
| `src/lib/ThemeContext.tsx`, `src/lib/FontSizeContext.tsx` (modificar) | Ler estado real do DOM em vez de assumir default |
| `src/components/IconButton.tsx` (criar) | Botão de ícone com `aria-label` obrigatório no tipo |
| `src/components/SettingsMenu.tsx` (criar) | Popover de engrenagem (fonte + tema) |
| `src/components/AccessibilityBar.tsx` (deletar) | Substituído pelo `SettingsMenu` |
| `src/app/globals.css` (modificar) | Corrigir seletor de input que não casa |
| `src/app/page.tsx`, `src/app/lists/[id]/page.tsx`, `src/app/groups/page.tsx`, `src/components/ItemCard.tsx` (modificar) | Header, `truncate`, dark mode |

### Fase 3 — Polimento
| Arquivo | Responsabilidade |
|---|---|
| `src/components/ItemCard.tsx` (modificar) | Reflow em grid, rem, `IconButton` |
| `src/app/globals.css` (modificar) | Alvo do checkbox, `focus-visible` |
| `src/components/ConfirmDialog.tsx` (modificar) | Foco em Cancelar no danger, aria, prisão de foco |
| `src/components/ListSkeleton.tsx` (criar) | Estado de carregamento |
| `src/app/page.tsx`, `src/components/AddItemForm.tsx` (modificar) | Remover `autoFocus`, usar skeleton |
| `README.md` (modificar) | Next 14 → 16 |

---

# FASE 1 — Fundação para poder validar

### Task 1: Resolução de URL do banco com fallback local

**Files:**
- Backup: copiar `src/lib/db.ts` para o scratchpad antes de editar (mitigação acordada na spec, já que não há git)
- Create: `src/lib/db-config.mjs`
- Modify: `src/lib/db.ts` (arquivo inteiro, 14 linhas)
- Test: validação por comando, sem framework (ver Step 3)

**Interfaces:**
- Produces: `src/lib/db-config.mjs` exporta `loadEnvLocal(): void` e `resolveDbConfig(): { url: string, authToken?: string }`. **Este é o único lugar onde a trava de produção existe** — a Task 2 importa deste mesmo arquivo.
- Produces: `src/lib/db.ts` mantém o default export `getDb(): Client` (assinatura inalterada — nenhum consumidor muda)

**Contexto:** hoje `src/lib/db.ts` faz `url: process.env.TURSO_DATABASE_URL!` — o `!` mente para o TypeScript e o app quebra em runtime se a var faltar. Os 3 scripts duplicam um `loadEnv()` idêntico de 15 linhas cada.

**Por que `.mjs` dentro de `src/lib/`:** é o único formato que o bundle do Next (via TypeScript) **e** os scripts node puros conseguem importar do mesmo arquivo. Assim a trava de produção existe uma única vez. **Viabilidade já verificada em 2026-07-17** por spike: com `allowJs: true` e `moduleResolution: "bundler"` (ambos já no `tsconfig.json`), o `npm run build` passa com o TS importando `.mjs`, e `node -e "import('./src/lib/db-config.mjs')"` funciona. Não é preciso mexer no tsconfig.

- [ ] **Step 1: Copiar o original para o scratchpad**

```bash
cp src/lib/db.ts "/tmp/claude-1000/-home-luis-promedico-Documentos-Softwares-LuisMarchio03-Projects-grocery-list-main/8c5db371-6b61-4c02-8644-f3b649942f1e/scratchpad/db.ts.original"
```
Expected: sem saída. Confirme com `ls` no destino.

- [ ] **Step 2: Criar a fonte única de configuração**

Criar `src/lib/db-config.mjs`:

```js
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * Lê .env.local para process.env. Silencioso se o arquivo não existir.
 * Só os scripts precisam chamar isto — o Next carrega .env.local sozinho.
 */
export function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(__dirname, '..', '..', '.env.local'), 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      process.env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
  } catch {}
}

/**
 * Turso quando TURSO_DATABASE_URL existe; senão SQLite local.
 * O fallback é proibido em produção: cair num arquivo efêmero do serverless
 * faria o app subir "funcionando" e perder os dados no próximo restart.
 */
export function resolveDbConfig() {
  const url = process.env.TURSO_DATABASE_URL
  if (url) {
    const authToken = process.env.TURSO_AUTH_TOKEN
    return authToken ? { url, authToken } : { url }
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'TURSO_DATABASE_URL é obrigatória em produção. ' +
      'O fallback para SQLite local existe apenas para desenvolvimento.'
    )
  }
  return { url: 'file:./dev.db' }
}
```

**Atenção ao `resolve(__dirname, '..', '..', '.env.local')`:** o arquivo mora em `src/lib/`, então são **dois** níveis até a raiz — não um. Os scripts antigos usavam `'..'` porque moravam em `scripts/`.

- [ ] **Step 3: Verificar os dois caminhos do resolvedor**

Run:
```bash
node -e "
import('./src/lib/db-config.mjs').then(m => {
  delete process.env.TURSO_DATABASE_URL
  console.log('dev  ->', JSON.stringify(m.resolveDbConfig()))
  process.env.NODE_ENV = 'production'
  try { m.resolveDbConfig(); console.log('PROD -> ERRO: deveria ter lançado!') }
  catch (e) { console.log('prod ->', e.message.slice(0, 40)) }
})
"
```
Expected:
```
dev  -> {"url":"file:./dev.db"}
prod -> TURSO_DATABASE_URL é obrigatória em pro
```

Se `prod` imprimir "ERRO: deveria ter lançado", a trava de produção não está funcionando — pare e corrija antes de seguir.

- [ ] **Step 4: Reescrever `src/lib/db.ts`**

O `db.ts` fica só com a instanciação do client; a resolução vem do módulo compartilhado. Sem `loadEnvLocal()` aqui — o Next já carrega `.env.local` sozinho.

```ts
import { createClient } from '@libsql/client'
import type { Client } from '@libsql/client'
import { resolveDbConfig } from './db-config.mjs'

let db: Client

export default function getDb(): Client {
  if (!db) db = createClient(resolveDbConfig())
  return db
}
```

- [ ] **Step 5: Verificar que o build ainda passa**

Run: `npm run build`
Expected: `✓ Compiled successfully`, `Finished TypeScript`, sem erro. O aviso sobre `middleware`/`proxy` é esperado e está fora de escopo.

---

### Task 2: Scripts consomem o resolvedor e ganham entradas no package.json

**Files:**
- Modify: `scripts/migrate.mjs:1-34` (cabeçalho) **e** `main()` (aplicar `schema.sql` — ver Step 4)
- Modify: `scripts/seed.mjs:1-37` (mesma região)
- Modify: `scripts/check.mjs:1-26` (mesma região)
- Modify: `package.json:5-9` (bloco `scripts`)
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `loadEnvLocal()`, `resolveDbConfig()` de `src/lib/db-config.mjs` (Task 1). O caminho relativo a partir de `scripts/` é `../src/lib/db-config.mjs`.
- Produces: comandos `npm run migrate` e `npm run seed` funcionando sem credenciais de nuvem

- [ ] **Step 1: Trocar o cabeçalho dos 3 scripts**

Em `scripts/migrate.mjs`, substituir da linha 1 até a linha 34 (inclusive) por:

```js
import { createClient } from '@libsql/client'
import { loadEnvLocal, resolveDbConfig } from '../src/lib/db-config.mjs'

loadEnvLocal()
const db = createClient(resolveDbConfig())
```

Em `scripts/check.mjs`, substituir da linha 1 até a linha 26 (inclusive) por exatamente o mesmo bloco de 5 linhas acima.

Em `scripts/seed.mjs`, substituir da linha 1 até a linha 37 (inclusive) pelo bloco abaixo — ele **preserva** o `import bcrypt from 'bcryptjs'` da linha 2 original, que o seed usa para gerar os hashes:

```js
import { createClient } from '@libsql/client'
import bcrypt from 'bcryptjs'
import { loadEnvLocal, resolveDbConfig } from '../src/lib/db-config.mjs'

loadEnvLocal()
const db = createClient(resolveDbConfig())
```

Em todos os três, isso remove a guarda `if (!dbUrl || !dbToken) process.exit(1)` — ela agora é responsabilidade do `resolveDbConfig()`, que só barra em produção. **Não** reintroduza a guarda nos scripts: duplicá-la é exatamente o que esta refatoração elimina.

- [ ] **Step 2: Adicionar os scripts ao `package.json`**

Substituir o bloco `"scripts"` (linhas 5-9) por:

```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "migrate": "node scripts/migrate.mjs",
    "seed": "node scripts/seed.mjs",
    "check": "node scripts/check.mjs",
    "test": "playwright test",
    "test:ui": "playwright test --ui"
  },
```

- [ ] **Step 3: Ignorar artefatos locais**

Acrescentar ao final do `.gitignore`:

```
dev.db
dev.db-journal
e2e/.auth
test-results
playwright-report
```

(O projeto não usa git hoje, mas o `.gitignore` existe e o repositório de origem no GitHub usa — manter correto.)

- [ ] **Step 4: Fazer o `migrate` aplicar o schema completo**

**Bug pré-existente, confirmado empiricamente em 2026-07-17:** `npm run migrate && npm run seed`
num banco zerado cria **apenas** `users`, `groups` e `group_members`. As tabelas `lists` e `items`
existem somente no `schema.sql` e **nunca são criadas**. O `migrate.mjs` ainda chama
`PRAGMA table_info(lists)` numa base onde `lists` não existe — isso retorna zero linhas em vez de
erro, então os `ALTER TABLE` são silenciosamente pulados e o migrate "tem sucesso" com o schema
incompleto.

Isto **bloqueia o critério de sucesso #1 da spec** ("`npm install && npm run migrate && npm run seed
&& npm run dev` sobe o app do zero"), o `global-setup` do Playwright (Task 3, que roda esses mesmos
dois comandos) e o passo a passo do README (Task 15). Por isso deixa de ser dívida e entra no escopo.

**Correção mínima** — em `scripts/migrate.mjs`, dentro de `main()`, aplicar o `schema.sql` **antes**
de tudo. Todas as suas instruções são `CREATE TABLE IF NOT EXISTS`, então é idempotente e seguro
rodar em banco novo ou já existente.

Acrescentar ao topo dos imports:
```js
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
```

E como **primeira** coisa dentro de `main()`, antes do `console.log('Aplicando migration...')`:
```js
  // schema.sql é a fonte de verdade do schema e é idempotente (CREATE TABLE IF NOT EXISTS).
  // Sem isto, as tabelas lists/items nunca são criadas num banco novo.
  console.log('Aplicando schema.sql...')
  await db.executeMultiple(readFileSync(resolve(__dirname, '..', 'schema.sql'), 'utf-8'))
```

Não remova o array `newTables` nem os `ALTER TABLE` existentes — eles são redundantes com o
`schema.sql` mas inofensivos, e removê-los é refatoração fora do escopo desta task.

- [ ] **Step 5: Verificar que o banco nasce completo do zero**

Run:
```bash
rm -f dev.db && npm run migrate && npm run seed
```
Expected: a saída termina com:
```
✅ Seed completo!

Usuários criados:
  - Ariana (senha: 12345678)
  - Liliana (senha: 12345678)
  - LuisMarchio03 (senha: LuisMarchio03)
```

Confirme que as **cinco** tabelas existem:
```bash
node -e "
import('@libsql/client').then(async ({createClient}) => {
  const db = createClient({ url: 'file:./dev.db' })
  const r = await db.execute(\"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\")
  console.log(r.rows.map(x => x.name).join(', '))
})
"
```
Expected: `group_members, groups, items, lists, users`

Se `lists` ou `items` faltarem, o Step 4 não funcionou — pare e corrija. Todo o resto do plano
depende disto.

Rode também `npm run check` e confirme que ele lista os 3 usuários e o grupo sem erro.

- [ ] **Step 6: Verificar que o app sobe do zero**

Run: `npm run dev` e, noutro terminal, `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login`
Expected: `200`. Encerre o servidor depois.

---

### Task 3: Playwright — infraestrutura e autenticação

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/global-setup.ts`
- Create: `e2e/auth.setup.ts`

**Interfaces:**
- Consumes: usuário `LuisMarchio03` / senha `LuisMarchio03` criado pelo seed (Task 2)
- Produces: `e2e/.auth/state.json` (cookie de sessão) e `e2e/.auth/list-id.txt` (id da lista de teste, consumido pela Task 4)

- [ ] **Step 1: Instalar o Playwright**

Run: `npm install -D @playwright/test && npx playwright install chromium --with-deps`
Expected: instala sem erro. (`--with-deps` pode pedir sudo; se falhar, `npx playwright install chromium` sozinho basta se o Chromium do sistema já tiver as libs.)

- [ ] **Step 2: Criar `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

const BASE_URL = 'http://localhost:3000'

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    // Piso realista de celular. Todo teste de layout roda aqui.
    viewport: { width: 360, height: 740 },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'mobile-360',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `${BASE_URL}/login`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

- [ ] **Step 3: Criar `e2e/global-setup.ts`**

Prepara o banco. Roda antes de tudo e **não** depende do servidor estar de pé.

```ts
import { execSync } from 'child_process'

export default function globalSetup() {
  execSync('npm run migrate', { stdio: 'inherit' })
  execSync('npm run seed', { stdio: 'inherit' })
}
```

- [ ] **Step 4: Criar `e2e/auth.setup.ts`**

Roda como projeto `setup`, depois que o `webServer` subiu. Loga e cria a lista de teste com itens de nome longo — nome curto não exercita o estouro de layout, que é o que estamos medindo.

```ts
import { test as setup, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'

const AUTH_DIR = 'e2e/.auth'

setup('autentica e cria dados de teste', async ({ request }) => {
  const login = await request.post('/api/auth/login', {
    data: { username: 'LuisMarchio03', password: 'LuisMarchio03' },
  })
  expect(login.ok(), 'login do seed deve funcionar').toBeTruthy()

  const list = await request.post('/api/lists', {
    data: { name: 'Compras da semana no supermercado' },
  })
  expect(list.ok(), 'criação de lista deve funcionar').toBeTruthy()
  const { id } = await list.json()

  // Nomes longos de propósito: é isso que estoura o layout no XG.
  const items = [
    { name: 'Arroz parboilizado tipo 1 pacote 5kg', quantity: '2un' },
    { name: 'Detergente líquido neutro concentrado', quantity: '3' },
    { name: 'Café torrado e moído extraforte 500g', quantity: '1' },
  ]
  for (const item of items) {
    const res = await request.post(`/api/lists/${id}/items`, { data: item })
    expect(res.ok(), `criação do item "${item.name}" deve funcionar`).toBeTruthy()
  }

  mkdirSync(AUTH_DIR, { recursive: true })
  writeFileSync(`${AUTH_DIR}/list-id.txt`, id)
  await request.storageState({ path: `${AUTH_DIR}/state.json` })
})
```

- [ ] **Step 5: Verificar que o setup roda**

Run: `npx playwright test --project=setup`
Expected: `1 passed`. Confirme que `e2e/.auth/state.json` e `e2e/.auth/list-id.txt` existem:

Run: `ls e2e/.auth/`
Expected: `list-id.txt  state.json`

Se o login falhar, o seed não rodou ou o servidor não subiu — verifique a saída do `global-setup` antes de mexer no teste.

---

### Task 4: Playwright — as asserções de layout (devem FALHAR)

**Files:**
- Create: `e2e/layout.spec.ts`

**Interfaces:**
- Consumes: `e2e/.auth/state.json` e `e2e/.auth/list-id.txt` (Task 3)

**Esta task termina com testes VERMELHOS e isso é o resultado correto.** O cabeçalho estourando a 360px é exatamente o que a asserção de scroll horizontal pega, e ele só é consertado na Fase 2. Não conserte o app aqui.

- [ ] **Step 1: Escrever os testes**

Criar `e2e/layout.spec.ts`:

```ts
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
const SIZES = ['md', 'xl'] as const

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
```

- [ ] **Step 2: Rodar e registrar o estado vermelho**

Run: `npm test`
Expected: **vários testes FALHAM.** Isso é o sucesso desta task.

Anote quais falham e com qual mensagem — é a linha de base contra a qual a Fase 2 e a Fase 3 são medidas. As falhas esperadas:
- `home @ fonte md/xl — alvos de toque` → os botões `w-8 h-8` (32px) de renomear/excluir, os `w-7 h-7` (28px) da barra de acessibilidade
- `home/lista @ fonte xl — sem scroll horizontal` → o cabeçalho lotado
- `grupos @ fonte md/xl — alvos de toque` → botões `w-8 h-8` e `w-7 h-7`

Se **nenhum** teste falhar, o teste está errado (provavelmente não está aplicando o tamanho da fonte, ou a página não carregou) — investigue antes de seguir. Um teste que nunca falha não protege nada.

- [ ] **Step 3: Confirmar que o tamanho de fonte realmente é aplicado**

Sanidade do arnês — se isto não passar, todos os testes `xl` são falso-positivos.

Run: `npx playwright test -g "login @ fonte xl — sem scroll horizontal" --debug` (ou adicione temporariamente um `console.log`)

Verifique manualmente no navegador aberto que `document.documentElement.style.fontSize` é `125%` na tela de login. Como o `FontSizeContext` só aplica no `useEffect`, isso confirma que a leitura do `localStorage` funciona ponta a ponta.

Expected: `125%`.

---

# FASE 2 — Os bugs que quebram

### Task 5: Reescrever o Service Worker

**Files:**
- Backup: copiar `public/sw.js` para o scratchpad antes de editar (mitigação acordada na spec, já que não há git)
- Modify: `public/sw.js` (arquivo inteiro, 38 linhas → reescrita)

**Interfaces:**
- Produces: nenhum consumidor em código; o registro em `src/app/layout.tsx:45-55` permanece inalterado

**Diagnóstico (verificado no código atual):**
1. `caches.match(event.request)` casa com **qualquer** GET, inclusive `/api/*` e o HTML da `/`. Com `return cached || fetchPromise`, devolve a versão velha e só revalida em background.
2. HTML velho referencia chunks `/_next/static/...` que não existem após deploy → 404 → tela branca. No PWA instalado o SW persiste e o erro gruda. **É a causa provável do erro no celular.**
3. `CACHE = 'grocery-list-v1'` é fixo, então o `activate` (que deleta `k !== CACHE`) nunca limpa nada.

- [ ] **Step 1: Copiar o original para o scratchpad**

Run:
```bash
cp public/sw.js "/tmp/claude-1000/-home-luis-promedico-Documentos-Softwares-LuisMarchio03-Projects-grocery-list-main/8c5db371-6b61-4c02-8644-f3b649942f1e/scratchpad/sw.js.original"
```
Expected: sem saída. Confirme com `ls` no destino.

- [ ] **Step 2: Reescrever `public/sw.js`**

```js
// Bump a cada mudança de estratégia: o activate apaga todo cache com nome diferente.
const CACHE = 'grocery-list-v2'

const PRECACHE_URLS = ['/manifest.json']

self.addEventListener('install', (event) => {
  // Assume no próximo carregamento em vez de esperar todas as abas fecharem.
  // Sem isto, um PWA instalado pode nunca receber a correção.
  self.skipWaiting()
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

/**
 * Guarda a resposta no cache mantendo o Service Worker vivo até a escrita
 * terminar. Sem o waitUntil, o navegador pode reciclar o worker assim que a
 * resposta chega na página e a escrita se perde em silêncio. O catch existe
 * porque cache.put rejeita com QuotaExceededError em aparelho com pouco
 * espaço — justamente o tipo de celular deste bug — e uma rejeição solta aqui
 * viraria só ruído no console.
 */
function cachePut(event, response) {
  if (!response.ok || response.type !== 'basic') return
  const clone = response.clone()
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.put(event.request, clone))
      .catch(() => {})
  )
}

/**
 * SÓ o que tem hash no nome é imutável de verdade e pode ser cache-first para
 * sempre. `/icons/*` e `/manifest.json` NÃO têm hash: se entrassem aqui,
 * um deploy que trocasse um ícone nunca chegaria a quem já tem o app
 * instalado — que é a mesma doença que este arquivo existe para curar.
 */
function isHashedAsset(url) {
  return url.pathname.startsWith('/_next/static/')
}

/** Sem hash, mas precisa existir offline: serve do cache e revalida atrás. */
function isRevalidatable(url) {
  return url.pathname.startsWith('/icons/') || url.pathname === '/manifest.json'
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Só mexe no que é nosso.
  if (url.origin !== self.location.origin) return

  // A API NUNCA passa pelo cache: dado velho quebra a sincronização
  // e serve dados de outro usuário depois de trocar de login.
  if (url.pathname.startsWith('/api/')) return

  if (isHashedAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          cachePut(event, response)
          return response
        })
      })
    )
    return
  }

  // stale-while-revalidate: entrega o cache na hora (rápido e funciona offline)
  // e busca a versão nova em paralelo, que o próximo carregamento aproveita.
  if (isRevalidatable(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        const fresh = fetch(event.request)
          .then((response) => {
            cachePut(event, response)
            return response
          })
          .catch(() => cached)
        return cached || fresh
      })
    )
    return
  }

  // Navegação/HTML: network-first. O cache é só rede de segurança offline.
  // É isto que impede o HTML velho de apontar para chunks que não existem mais.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          cachePut(event, response)
          return response
        })
        .catch(async () => {
          // respondWith NUNCA pode resolver undefined — isso é violação de spec
          // e faz o navegador mostrar o próprio erro genérico no lugar do app.
          // Como '/' não é pré-cacheado, uma primeira visita offline erra os
          // dois matches; o Response final garante uma saída honesta.
          const cached = (await caches.match(event.request)) || (await caches.match('/'))
          return (
            cached ||
            new Response(
              '<!doctype html><meta charset="utf-8"><title>Sem conexão</title>' +
                '<body style="font-family:system-ui;padding:2rem;text-align:center">' +
                '<h1>Sem conexão</h1><p>Abra o app uma vez com internet para poder usá-lo offline.</p>',
              { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            )
          )
        })
    )
    return
  }

  // Resto: rede, sem cache.
})
```

- [ ] **Step 3: Verificar que a API não é interceptada**

Run: `npm run dev`, abra `http://localhost:3000`, faça login, e no DevTools → Application → Service Workers confirme que o SW ativo é o novo. Depois, em Network, filtre por `/api/` e recarregue.

Expected: as requisições para `/api/lists` mostram `(from network)`, **não** `(from ServiceWorker)`. Em Application → Cache Storage, o cache `grocery-list-v2` **não** contém nenhuma entrada `/api/...`.

- [ ] **Step 4: Verificar que o cache velho é apagado**

Ainda no DevTools → Application → Cache Storage.
Expected: existe apenas `grocery-list-v2`. Se `grocery-list-v1` sobreviver, o `activate` não rodou — force com "Update on reload" ou "Unregister" e recarregue.

- [ ] **Step 5: Verificar o fallback offline**

DevTools → Network → marque "Offline" → recarregue a página.
Expected: a página ainda renderiza (vem do cache), e o `OfflineBanner` aparece. As chamadas de API falham, o que é o esperado — a fila offline do `useListSync` cuida delas.

---

### Task 6: Eliminar o flash de tema e de tamanho de fonte (FOUC)

**Files:**
- Modify: `src/app/layout.tsx:33-38` (abertura do `<html>` e `<head>`)
- Modify: `src/lib/ThemeContext.tsx:17-29`
- Modify: `src/lib/FontSizeContext.tsx:26-37`

**Interfaces:**
- Consumes: chaves `theme` (`'light'|'dark'`) e `fontSize` (`'sm'|'md'|'lg'|'xl'`) do `localStorage` — nomes já usados hoje, não mudar
- Produces: `useTheme()` e `useFontSize()` mantêm as assinaturas atuais (`{ theme, toggle }` e `{ size, setSize, scale }`)

**Diagnóstico:** ambos os contexts aplicam tema/fonte dentro de um `useEffect`, ou seja **depois** da hidratação. Toda visita pisca branco e dá um salto de tamanho.

- [ ] **Step 1: Adicionar o script bloqueante no `<head>`**

Em `src/app/layout.tsx`, substituir a abertura do `<html>` e o `<head>` inteiro (linhas 33-38) por:

```tsx
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

    var scales = { sm: 87.5, md: 100, lg: 112.5, xl: 125 };
    var s = localStorage.getItem('fontSize');
    if (s && scales[s]) document.documentElement.style.fontSize = scales[s] + '%';
  } catch (e) {}
})();
            `,
          }}
        />
      </head>
```

O `suppressHydrationWarning` no `<html>` é necessário: o script muda `class` e `style` do elemento raiz antes do React hidratar, e sem ele o React reclama da divergência.

Os valores de `scales` espelham `src/lib/FontSizeContext.tsx:19-24` (`sm: 0.875, md: 1, lg: 1.125, xl: 1.25`) convertidos para porcentagem. **Se um mudar, o outro tem que mudar junto.**

- [ ] **Step 2: `ThemeContext` lê o DOM em vez de assumir `'light'`**

Em `src/lib/ThemeContext.tsx`, substituir as linhas 17-29 por:

```tsx
export function ThemeProvider({ children }: { children: ReactNode }) {
  // Começa em 'light' para casar com o HTML do servidor; o script do <head> já
  // aplicou a classe real no <html>, então o efeito abaixo só sincroniza o estado.
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  }, [])
```

O `toggle` (linhas 31-42) fica **inalterado** — ele já escreve no `localStorage` e mexe na classe.

- [ ] **Step 3: `FontSizeContext` lê o DOM e para de reaplicar na montagem**

Em `src/lib/FontSizeContext.tsx`, substituir as linhas 26-37 por:

```tsx
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
```

- [ ] **Step 4: Verificar que não há flash**

Run: `npm run dev`. No navegador, ative o modo escuro e o tamanho XG, depois recarregue com cache desabilitado (DevTools → Network → "Disable cache" → Ctrl+Shift+R) várias vezes.

Expected: a página aparece **já escura e já no tamanho XG**, sem lampejo branco e sem salto de tamanho. Se ainda piscar, o script não está no `<head>` ou está com `defer`/`async`.

- [ ] **Step 5: Verificar que o build passa e não há aviso de hidratação**

Run: `npm run build`
Expected: `✓ Compiled successfully`, sem erro.

Depois, no navegador em dev, abra o Console.
Expected: nenhum aviso do tipo `Warning: Prop 'className' did not match` ou `Hydration failed`.

---

### Task 7: `IconButton` com `aria-label` obrigatório

**Files:**
- Create: `src/components/IconButton.tsx`

**Interfaces:**
- Produces: default export `IconButton`, props:
  ```ts
  {
    icon: React.ReactNode
    label: string              // obrigatório: vira aria-label + title
    onClick: () => void
    variant?: 'default' | 'danger' | 'primary'   // default: 'default'
    active?: boolean           // default: false — estado visual; vira aria-pressed
    expanded?: boolean         // gatilho de popover: emite aria-expanded + aria-haspopup
                               // e SUPRIME aria-pressed
    type?: 'button' | 'submit' // default: 'button'
    disabled?: boolean
    className?: string
  }
  ```

**Sobre `expanded` vs `active`:** `aria-pressed` só faz sentido em botão de alternância
(o de tema, por exemplo). Num gatilho que **abre** um popover, o correto é `aria-expanded` —
leitor de tela anunciando "pressionado" ao abrir um menu é semântica errada. Como o componente
não tem rest spread, sem esta prop a Task 8 não teria como emitir `aria-expanded`. Quando
`expanded` é passado, o `aria-pressed` é suprimido e entra `aria-haspopup="dialog"`.

**Motivação:** o estilo do botão de ícone está copiado em ~15 pontos (`page.tsx:198,205`, `groups/page.tsx:162,220,227,254,278`, `AccessibilityBar.tsx:33,43,55,63`, `ConfirmDialog.tsx:60`, `ItemCard.tsx:139`). Todos usam só `title`, que leitor de tela não anuncia de forma confiável e que no celular nem aparece (não existe hover). Tornar `label` obrigatório **no tipo** faz o TypeScript recusar a regressão.

- [ ] **Step 1: Criar o componente**

```tsx
'use client'

type Variant = 'default' | 'danger' | 'primary'

type Props = {
  icon: React.ReactNode
  /** Obrigatório: vira aria-label e title. Sem isto o botão é mudo para leitor de tela. */
  label: string
  onClick: () => void
  variant?: Variant
  active?: boolean
  type?: 'button' | 'submit'
  disabled?: boolean
  className?: string
}

// max(): o alvo cresce com a fonte mas nunca cai abaixo do mínimo físico de 44px
// (no tamanho "P" a base é 14px, então 2.75rem seria só 38.5px).
const BASE =
  'min-h-[max(2.75rem,44px)] min-w-[max(2.75rem,44px)] flex items-center justify-center rounded-lg ' +
  'transition-all active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ' +
  'dark:focus-visible:ring-offset-slate-900'

const VARIANTS: Record<Variant, { idle: string; active: string }> = {
  default: {
    idle:
      'border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 ' +
      'hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 ' +
      'hover:bg-slate-50 dark:hover:bg-slate-800',
    active:
      'border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 ' +
      'bg-blue-50 dark:bg-blue-900/20',
  },
  danger: {
    idle:
      'border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 ' +
      'hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 ' +
      'hover:bg-red-50 dark:hover:bg-red-900/20',
    active:
      'border border-red-200 dark:border-red-900 text-red-500 dark:text-red-400 ' +
      'bg-red-50 dark:bg-red-900/20',
  },
  primary: {
    idle:
      'bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600 ' +
      'active:bg-blue-800 dark:active:bg-blue-700 shadow-sm shadow-blue-200 dark:shadow-none',
    active: 'bg-blue-800 dark:bg-blue-700 text-white',
  },
}

export default function IconButton({
  icon,
  label,
  onClick,
  variant = 'default',
  active = false,
  type = 'button',
  disabled = false,
  className = '',
}: Props) {
  const style = VARIANTS[variant]
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
      className={`${BASE} ${active ? style.active : style.idle} ${className}`}
    >
      {icon}
    </button>
  )
}
```

- [ ] **Step 2: Verificar que o tipo barra a regressão**

Run:
```bash
node -e "
const fs=require('fs');
fs.writeFileSync('/tmp/iconbutton-check.tsx', \`
import IconButton from '@/components/IconButton'
export const bad = <IconButton icon={null} onClick={() => {}} />
\`);
" && npx tsc --noEmit --jsx preserve --esModuleInterop --moduleResolution bundler --module esnext --target es2020 --baseUrl . --paths '{"@/*":["./src/*"]}' /tmp/iconbutton-check.tsx 2>&1 | head -5
```
Expected: erro do TypeScript mencionando que a propriedade `label` está faltando (`Property 'label' is missing`).

Isso confirma que o compilador recusa um botão de ícone sem rótulo. Apague `/tmp/iconbutton-check.tsx` depois.

- [ ] **Step 3: Verificar que o build passa**

Run: `npm run build`
Expected: `✓ Compiled successfully`. (O componente ainda não tem consumidor — isso é esperado; a Task 8 o consome.)

---

### Task 8: `SettingsMenu` — o popover que desafoga o cabeçalho

**Files:**
- Create: `src/components/SettingsMenu.tsx`
- Delete: `src/components/AccessibilityBar.tsx`
- Modify: `src/app/page.tsx:5,8,68-74` (import e cabeçalho)
- Modify: `src/app/lists/[id]/page.tsx:12,125-135` (import e cabeçalho)

**Interfaces:**
- Consumes: `IconButton` (Task 7); `useFontSize()` e `useTheme()` (Task 6)
- Produces: default export `SettingsMenu`, sem props

**Diagnóstico:** o header é `[ícone 40px] [h1 flex-1] [AccessibilityBar]`. A barra tem 8 controles ocupando ~220px; com o ícone e os gaps, sobra <40px para o título a 360px, e o `h1` não tem `truncate`. **Já quebra hoje, no tamanho normal.** Além disso `−`/`+` duplicam a função dos botões P/M/G/XG.

- [ ] **Step 1: Criar `src/components/SettingsMenu.tsx`**

```tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { Settings, Moon, Sun, Check } from 'lucide-react'
import { useFontSize } from '@/lib/FontSizeContext'
import { useTheme } from '@/lib/ThemeContext'
import IconButton from '@/components/IconButton'

const SIZES = [
  { value: 'sm' as const, label: 'P', name: 'Pequena' },
  { value: 'md' as const, label: 'M', name: 'Média' },
  { value: 'lg' as const, label: 'G', name: 'Grande' },
  { value: 'xl' as const, label: 'XG', name: 'Extra grande' },
]

const ITEM =
  'min-h-[max(2.75rem,44px)] flex items-center justify-center rounded-lg text-sm font-medium transition-all ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'

export default function SettingsMenu() {
  const { size, setSize } = useFontSize()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <IconButton
        icon={<Settings className="w-4 h-4" />}
        label="Ajustes de exibição"
        onClick={() => setOpen(o => !o)}
        active={open}
        expanded={open}
      />

      {open && (
        <div
          role="dialog"
          aria-label="Ajustes de exibição"
          className="absolute top-full right-0 mt-2 w-56 max-w-[calc(100vw-2rem)] z-20 p-3
            bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700
            rounded-xl shadow-lg dark:shadow-slate-900/50 animate-scale-in"
        >
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
            Tamanho da fonte
          </p>
          <div className="grid grid-cols-4 gap-1 mb-4">
            {SIZES.map(s => (
              <button
                key={s.value}
                onClick={() => setSize(s.value)}
                aria-label={`Fonte ${s.name}`}
                aria-pressed={size === s.value}
                className={`${ITEM} ${
                  size === s.value
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 px-1">
            Tema
          </p>
          <button
            onClick={toggle}
            aria-label={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            className={`${ITEM} w-full justify-between px-3 border border-slate-200 dark:border-slate-700
              text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700`}
          >
            <span className="flex items-center gap-2">
              {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === 'light' ? 'Claro' : 'Escuro'}
            </span>
            <Check className="w-4 h-4 text-blue-500" />
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Trocar o cabeçalho da home**

Em `src/app/page.tsx`:

Linha 8 — trocar `import AccessibilityBar from '@/components/AccessibilityBar'` por:
```tsx
import SettingsMenu from '@/components/SettingsMenu'
```

Linhas 68-74 — substituir o bloco do cabeçalho por:
```tsx
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
          <ShoppingBag className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex-1 min-w-0 truncate">
          Minhas Listas
        </h1>
        <SettingsMenu />
      </div>
```

O `min-w-0 truncate` é o que impede o título de atropelar: sem `min-w-0`, um filho de flex não encolhe abaixo do seu conteúdo.

- [ ] **Step 3: Trocar o cabeçalho da página de lista**

Em `src/app/lists/[id]/page.tsx`:

Linha 12 — trocar `import AccessibilityBar from '@/components/AccessibilityBar'` por:
```tsx
import SettingsMenu from '@/components/SettingsMenu'
```

Linha 134 — trocar `<AccessibilityBar />` por `<SettingsMenu />`.

- [ ] **Step 4: Apagar o componente substituído**

Run: `rm src/components/AccessibilityBar.tsx`

Run: `grep -rn "AccessibilityBar" src/`
Expected: nenhuma saída. Se aparecer alguma referência, troque-a antes de seguir.

- [ ] **Step 5: Rodar os testes de layout**

Run: `npm test`

**Baseline medido no fim da Fase 1 (2026-07-17): 10 failed / 7 passed de 17.** Destes, exatamente
**2** são de scroll horizontal, ambos na home:
- `home @ fonte md — sem scroll horizontal`
- `home @ fonte xl — sem scroll horizontal`

(`lista` e `grupos` **nunca** estouram na horizontal — o `PageHeader` já tem `truncate` e `grupos`
não usa a barra de acessibilidade. A home é a única culpada, e ela estoura **já no tamanho md**.)

Expected após esta task: **8 failed / 9 passed** — os 2 de scroll horizontal viram verdes. Os 8 de
**alvo de toque** continuam vermelhos (Tasks 10 e 12 os consertam) — isso é esperado aqui.

Se algum teste de scroll horizontal ainda falhar, o cabeçalho não é o único culpado — investigue qual elemento estoura com:
```js
Array.from(document.querySelectorAll('*')).filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth)
```

---

### Task 9: Fechar os buracos de dark mode

**Files:**
- Modify: `src/app/globals.css:31-33` (seletor de input)
- Modify: `src/app/page.tsx:107` e `src/app/page.tsx:169`
- Modify: `src/app/groups/page.tsx:172` e `src/app/groups/page.tsx:246`
- Modify: `src/components/ItemCard.tsx:77` e `src/components/ItemCard.tsx:109`

**Interfaces:**
- Consumes: nada novo
- Produces: nada novo

**Causa raiz (verificada):** `globals.css:31` tem `input[type="text"], input[type="password"], input[type="search"]` com as variantes `dark:` corretas — mas os inputs quebrados **não declaram `type`**. O seletor `input[type="text"]` casa apenas com o atributo explícito, nunca com o default implícito. Por isso a regra nunca se aplicou e cada input foi "consertado" na mão com classes claras cravadas.

- [ ] **Step 1: Corrigir o seletor base**

Em `src/app/globals.css`, substituir as linhas 31-33 por:

```css
  /* input sem atributo type é text por default, mas o seletor [type="text"]
     não casa com o default implícito — daí o :not([type]). */
  input:not([type]), input[type="text"], input[type="password"], input[type="search"] {
    @apply bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500;
  }
```

- [ ] **Step 2: Remover as classes claras cravadas nos inputs**

Classes utilitárias vencem a regra base (camada `utilities` > camada `base`), então a correção do Step 1 só surte efeito depois de tirar os valores cravados.

`src/app/page.tsx:107` — trocar o `className` do input "Nova lista..." por:
```tsx
            className="w-full h-11 pl-4 pr-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
```

`src/app/page.tsx:169` — trocar o `className` do input de renomear por:
```tsx
                  className="flex-1 h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
```

`src/app/groups/page.tsx:172` — trocar o `className` do input "Nome do novo grupo..." por:
```tsx
            className="w-full h-11 pl-4 pr-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
```

`src/app/groups/page.tsx:246` — trocar o `className` do input "Adicionar membro..." por:
```tsx
                          className="flex-1 h-9 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
```

- [ ] **Step 3: Corrigir os `activeClass` do `ItemCard`**

`src/components/ItemCard.tsx:77` — trocar:
```tsx
          activeClass="text-orange-600 bg-orange-50 border-orange-200"
```
por:
```tsx
          activeClass="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900"
```

`src/components/ItemCard.tsx:109` — trocar:
```tsx
          activeClass="text-red-500 bg-red-50 border-red-200"
```
por:
```tsx
          activeClass="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
```

- [ ] **Step 4: Verificar visualmente no modo escuro**

Run: `npm run dev`, ative o modo escuro pelo `SettingsMenu` e percorra: home → uma lista → grupos.

Expected, no escuro:
- os inputs "Nova lista", "Nome do novo grupo" e "Adicionar membro" têm **fundo escuro** (`slate-800`) e texto claro — não mancha branca
- o input de renomear lista (clique no lápis) idem
- na lista, marque um item como Promoção: o botão fica laranja **escuro** translúcido, não laranja claro berrante

- [ ] **Step 5: Verificar que nada regrediu no modo claro**

Volte para o modo claro e percorra as mesmas telas.
Expected: idêntico ao que era antes — fundo branco, borda `slate-200`, texto escuro.

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: mesmo resultado da Task 8 (scroll horizontal passando; alvo de toque ainda falhando). Nenhuma regressão nova.

---

# FASE 3 — Polimento

### Task 10: `ItemCard` — escala de fonte real e reflow em grid

**Files:**
- Modify: `src/components/ItemCard.tsx` (arquivo inteiro, 148 linhas → reescrita)

**Interfaces:**
- Consumes: `IconButton` (Task 7)
- Produces: `ItemCard` mantém a assinatura de props atual (`item`, `onToggleCheck`, `onTogglePromotion`, `onEdit`, `onDelete`, `onPhoto`, `onViewPhoto`) — `src/app/lists/[id]/page.tsx:99-108` **não muda**

**Diagnóstico:** `text-[10px]` nos rótulos e no badge PROMO, `size={18}` nos ícones e `min-h-[44px]` são px cravados que **não escalam** com o `font-size` do `<html>`. No XG o texto do item cresce mas os rótulos e ícones ficam pequenos — a acessibilidade funciona pela metade. E os 5 botões `flex-1` a 360px ficam com ~60px cada; com os rótulos escalando, "Promoção" deixa de caber.

- [ ] **Step 1: Reescrever o componente**

```tsx
'use client'

import { Tag, Image, Eye, Pencil, Trash2 } from 'lucide-react'

type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  has_photo: number
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
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-sm dark:shadow-slate-900/30 px-4 py-3.5 flex flex-col gap-3 transition-all duration-200 ${
        item.is_checked ? 'opacity-40' : 'animate-slide-up'
      }`}
    >
      {/* Fileira 1: checkbox + nome do produto */}
      <div className="flex items-center gap-3">
        <label className="relative flex items-center shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={!!item.is_checked}
            onChange={onToggleCheck}
            aria-label={item.is_checked ? `Desmarcar ${item.name}` : `Marcar ${item.name} como comprado`}
            className="animate-check-bounce"
          />
        </label>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium ${
                item.is_checked ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {item.name}
            </span>
            {item.quantity && (
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                {item.quantity}
              </span>
            )}
            {!!item.is_promotion && (
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 px-1.5 py-0.5 rounded-full">
                PROMO
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Fileira 2: ações.
          auto-fit + minmax em rem faz o grid refluir pela FONTE, não pela viewport:
          no XG o mínimo de 4rem engorda, deixam de caber todas as colunas e quebra sozinho
          sozinho. Breakpoint (sm:/md:) não serviria — ele olha a largura da tela. */}
      <div
        className="grid gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-700/50"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(4rem, 1fr))' }}
      >
        <ActionButton
          icon={<Tag className="w-[1.125em] h-[1.125em]" />}
          label="Promoção"
          active={!!item.is_promotion}
          activeClass="text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900"
          onClick={onTogglePromotion}
        />
        <ActionButton
          icon={<Image className="w-[1.125em] h-[1.125em]" />}
          label="Foto"
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
        />
        {!!item.has_photo && onViewPhoto && (
          <ActionButton
            icon={<Eye className="w-[1.125em] h-[1.125em]" />}
            label="Ver"
            onClick={onViewPhoto}
          />
        )}
        <ActionButton
          icon={<Pencil className="w-[1.125em] h-[1.125em]" />}
          label="Editar"
          onClick={onEdit}
        />
        <ActionButton
          icon={<Trash2 className="w-[1.125em] h-[1.125em]" />}
          label="Excluir"
          activeClass="text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900"
          danger
          onClick={onDelete}
        />
      </div>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  active = false,
  activeClass = '',
  danger = false,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  activeClass?: string
  danger?: boolean
  onClick: () => void
}) {
  // max(): cresce com a fonte, nunca abaixo do mínimo físico de 44px.
  const base =
    'min-h-[max(2.75rem,44px)] flex flex-col items-center justify-center gap-0.5 rounded-lg border ' +
    'transition-all duration-150 active:scale-95 px-1 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ' +
    'dark:focus-visible:ring-offset-slate-800'
  const idle = danger
    ? 'border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/20'
    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
  return (
    <button
      className={`${base} ${active ? activeClass : idle}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active || undefined}
      title={label}
    >
      {icon}
      <span className="text-[0.625rem] font-medium leading-none">{label}</span>
    </button>
  )
}
```

Mudanças que importam, e por quê:
- `text-[10px]` → `text-[0.625rem]` no rótulo e `text-xs` no PROMO: `rem` escala, px não.
- `size={18}` → `className="w-[1.125em] h-[1.125em]"`: `em` acompanha a fonte do próprio botão. Classe CSS vence atributo de apresentação no SVG, então não é preciso remover a prop `size` — mas ela foi removida para não confundir o próximo leitor.
- `flex` → `grid` com `auto-fit`/`minmax(4rem, 1fr)`: o reflow sai de graça.

  **O valor `4rem` foi MEDIDO, não estimado (2026-07-17).** O primeiro palpite do plano, `4.5rem`,
  estava grande demais e quebrava o card em 2 linhas já no tamanho padrão. A razão é que o grid não
  tem os 360px da tela: o `<main>` (`px-5`) e o card (`px-4`) comem as bordas, sobrando **286px** —
  e, como esses paddings também são `rem`, o espaço **encolhe** conforme a fonte cresce
  (295 → 286 → 277 → 268 px de sm a xl). Com `4.5rem` (72px no md), 4 botões pediriam 306px e só
  cabiam 3.

  Comportamento real medido a 360px com `4rem`, num item de 4 botões:

  | Fonte | Largura do grid | Largura do botão | Resultado |
  |---|---|---|---|
  | sm | 295px | 69.8px | 1 linha |
  | md | 286px | 67px | **1 linha** (card compacto no padrão) |
  | lg | 277px | 87.8px | 2 linhas (3+1) |
  | xl | 268px | 84.3px | 2 linhas (3+1) |

  Nenhum rótulo cortado e todos os botões ≥44px nos quatro tamanhos.
- `min-h-[44px]` → `min-h-[max(2.75rem,44px)]`.
- `aria-label` em todo botão e no checkbox.
- O checkbox ganhou um `<label>` em volta — é ele que a Task 11 transforma em alvo de 44px.

- [ ] **Step 2: Verificar o reflow com os próprios olhos**

Run: `npm run dev`, abra uma lista com itens, e em DevTools use o modo responsivo a **360px**.

Expected:
- no tamanho **M**: os 5 botões numa única fileira
- no tamanho **XG** (via `SettingsMenu`): a fileira quebra em **3 + 2**, com os rótulos legíveis e maiores, e os ícones maiores junto
- em nenhum dos dois o texto "Promoção" fica cortado ou espremido

- [ ] **Step 3: Rodar os testes**

Run: `npm test`
Expected: **nenhum teste novo passa ainda** — e isso está correto. Os botões do `ItemCard` deixam de aparecer na lista de violações, mas a tela `lista` continua falhando por causa de dois botões que esta task não toca: o de voltar do `PageHeader` (40px) e o de "Limpar comprados". Ambos são migrados na Task 12, que é o gate real da fase.

O que confirmar aqui é o **progresso**, não o verde: rode `npm test 2>&1 | grep -A5 "lista @ fonte xl — alvos"` e verifique que a lista de violações **encolheu** e não menciona mais "Promoção", "Foto", "Editar" nem "Excluir".

---

### Task 11: Alvo de toque do checkbox e `focus-visible` global

**Files:**
- Modify: `src/app/globals.css:18-29` (regras do checkbox)

**Interfaces:**
- Consumes: o `<label>` que envolve o checkbox, criado na Task 10
- Produces: nada novo

**Diagnóstico:** o checkbox tem `w-5 h-5` (20px), bem abaixo do mínimo de 44px — é o alvo mais tocado do app e o mais difícil de acertar. Nenhum elemento do app tem estilo de `focus-visible` hoje.

- [ ] **Step 1: Expandir o alvo do checkbox e adicionar foco visível**

Em `src/app/globals.css`, substituir as linhas 18-29 por:

```css
  input[type="checkbox"] {
    @apply appearance-none w-5 h-5 border-2 border-slate-300 dark:border-slate-600 rounded-md
      checked:bg-blue-600 dark:checked:bg-blue-500 checked:border-blue-600 dark:checked:border-blue-500
      transition-all duration-200 ease-out
      cursor-pointer shrink-0 relative;
  }

  /* O visual continua 20px, mas a área tocável vai a 44px via pseudo-elemento:
     o alvo mais tocado do app não pode ter o tamanho de uma ervilha. */
  input[type="checkbox"]::before {
    content: '';
    @apply absolute block;
    top: 50%;
    left: 50%;
    width: max(2.75rem, 44px);
    height: max(2.75rem, 44px);
    transform: translate(-50%, -50%);
  }

  input[type="checkbox"]:focus-visible {
    @apply outline-none ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-800;
  }

  input[type="checkbox"]:checked::after {
    content: '';
    @apply absolute inset-0 block;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'%3E%3C/polyline%3E%3C/svg%3E") center/70% no-repeat;
  }

  a:focus-visible, button:focus-visible {
    @apply outline-none ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900;
  }
```

**Atenção ao empilhamento:** o `::before` é maior que o checkbox e fica por cima dos irmãos. Como ele é filho do `input`, os cliques nele contam como cliques no input — que é o objetivo. Mas se o nome do item ficar inclicável, é este pseudo-elemento roubando o clique; nesse caso, adicione `z-index: -1` ao `::before` e confirme que o toque ainda funciona.

- [ ] **Step 2: Verificar a área de toque**

Run: `npm run dev`, abra uma lista, e no DevTools inspecione o checkbox → aba Computed → confirme que o `::before` mede **44×44**.

Depois, no modo responsivo, clique ~15px **acima** do checkbox (fora do quadrado visual, dentro da área expandida).
Expected: o item alterna entre marcado/desmarcado.

- [ ] **Step 3: Verificar que o nome do item continua clicável**

Clique no **nome** do produto.
Expected: nada acontece (o nome não é clicável por design nesta tela) — mas o checkbox **não** deve alternar. Se alternar, o `::before` está grande demais ou vazando; aplique o `z-index: -1` descrito no Step 1.

- [ ] **Step 4: Verificar o foco por teclado**

Com o teclado, pressione Tab repetidamente pela página.
Expected: cada botão e checkbox recebe um anel azul visível. Clicar com o mouse **não** deve mostrar o anel (é `focus-visible`, não `focus`).

- [ ] **Step 5: Rodar os testes**

Run: `npm test`
Expected: sem regressão em relação à Task 10.

---

### Task 12: Levar TODOS os alvos de toque a 44px — o gate da fase

**Files:**
- Modify: `src/components/PageHeader.tsx` (voltar)
- Modify: `src/app/page.tsx` — Grupos/Sair, seletor de grupo, confirmar rename, renomear/excluir
- Modify: `src/app/lists/[id]/page.tsx` — Limpar comprados, OK da edição inline
- Modify: `src/app/login/page.tsx` — mostrar/ocultar senha
- Modify: `src/app/groups/page.tsx` — voltar, excluir/expandir, adicionar/remover membro
- Modify: `src/components/SyncStatus.tsx` — o botão "Atualizado agora" (34px de altura, `py-2`)

**⚠️ Números de linha estão obsoletos** (Tasks 8-11 deslocaram tudo). **Localize por conteúdo/rótulo.**

**Inventário REAL medido no baseline atual (2026-07-17), não estimado** — cada rótulo que o teste
imprime e o tamanho abaixo de 44px:

| Rótulo no teste | Tamanho | Onde |
|---|---|---|
| `(sem rótulo)` 18×18 | login | olho de mostrar senha (`login/page.tsx`) |
| `(sem rótulo)` 32×32 | várias | `w-8 h-8`: renomear/excluir lista (`page.tsx`), excluir/expandir grupo (`groups`) |
| `(sem rótulo)` 36×36 | várias | confirmar rename, adicionar/remover membro, OK inline |
| `(sem rótulo)` 40×40 | lista/grupos | botão voltar do `PageHeader` |
| `Atualizado agora` 161×34 | home/lista | **`SyncStatus` — o gap que faltava** |
| `Grupos` 86×28 | home | botão de texto |
| `Sair` 65×28 | home | botão de texto |
| `Lista privada` 116×24 | home | seletor de grupo |

O `SyncStatus` não vira `IconButton` (tem ícone + texto + indicador) — só ganha
`min-h-[max(2.75rem,44px)]` no botão e um `aria-label`. Troque também `size={14}`/`size={12}` dos
ícones por classes (`w-3.5 h-3.5` / `w-3 h-3`) por consistência de escala.

**Interfaces:**
- Consumes: `IconButton` (Task 7)
- Produces: nada novo

**Este é o gate da Fase 3: ao final, `npm test` fica 100% verde.**

**Inventário completo das violações** (medido no código atual — não confie na memória, o teste imprime a lista real):

| Arquivo:linha | Botão | Tamanho hoje |
|---|---|---|
| `PageHeader.tsx:17` | Voltar | 40×40 |
| `page.tsx:82` | Grupos | ~27px de altura |
| `page.tsx:88` | Sair | ~27px |
| `page.tsx:125` | Seletor de grupo | ~24px |
| `page.tsx:136,144` | Opções do seletor | ~36px |
| `page.tsx:175` | Confirmar rename | 36×36 |
| `page.tsx:197,204` | Renomear / Excluir | 32×32 |
| `lists/[id]/page.tsx:140` | Limpar comprados | ~20px |
| `lists/[id]/page.tsx:235` | OK da edição inline | 36px |
| `login/page.tsx:63` | Mostrar senha | ~18px |
| `groups/page.tsx:162` | Voltar | 36×36 |
| `groups/page.tsx:218` | Excluir grupo | 32×32 |
| `groups/page.tsx:226` | Expandir | 32×32 |
| `groups/page.tsx:252` | Adicionar membro | 36×36 |
| `groups/page.tsx:276` | Remover membro | 28×28 |

Nem todos viram `IconButton` — os que têm ícone **e** texto (Grupos, Sair, Limpar comprados) continuam botões normais, só ganhando o `min-h`. A regra: `IconButton` é para botão **só de ícone**.

- [ ] **Step 1: Migrar o `PageHeader`**

Substituir `src/components/PageHeader.tsx` inteiro por:

```tsx
'use client'

import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import IconButton from '@/components/IconButton'

type Props = {
  title: string
  backTo?: string
}

export default function PageHeader({ title, backTo }: Props) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-3">
      {backTo && (
        <IconButton
          icon={<ArrowLeft className="w-5 h-5" />}
          label="Voltar"
          onClick={() => router.push(backTo)}
          className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
        />
      )}
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 min-w-0 truncate">{title}</h1>
    </div>
  )
}
```

- [ ] **Step 2: Migrar os botões da home**

Em `src/app/page.tsx`, adicionar ao topo:
```tsx
import IconButton from '@/components/IconButton'
```

Substituir o bloco das linhas 196-211 por:
```tsx
            <div className="flex items-center gap-1 shrink-0">
              <IconButton
                icon={<Pencil className="w-4 h-4" />}
                label={`Renomear lista ${list.name}`}
                onClick={() => { setEditingId(list.id); setEditName(list.name) }}
              />
              <IconButton
                icon={<Trash2 className="w-4 h-4" />}
                label={`Excluir lista ${list.name}`}
                variant="danger"
                onClick={() => setDeleteTarget(list)}
              />
            </div>
```

O rótulo inclui o nome da lista de propósito: um leitor de tela anunciando "Excluir, Excluir, Excluir" numa lista de 8 itens é inútil.

Substituir também o botão de confirmar renomeação (linhas 175-180) por:
```tsx
                <IconButton
                  icon={<Check className="w-4 h-4" />}
                  label="Confirmar novo nome"
                  variant="primary"
                  onClick={() => handleRename(list.id)}
                />
```

- [ ] **Step 3: Corrigir os botões de texto da home**

Estes têm ícone **e** texto, então **não** viram `IconButton` — só ganham altura mínima.

`src/app/page.tsx:82-93` — substituir os dois botões por:
```tsx
          <button
            onClick={() => router.push('/groups')}
            className="min-h-[max(2.75rem,44px)] text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg px-3"
          >
            <Users className="w-4 h-4" /> Grupos
          </button>
          <button
            onClick={logout}
            className="min-h-[max(2.75rem,44px)] text-xs flex items-center gap-1.5 text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg px-3"
          >
            <LogOut className="w-4 h-4" /> Sair
          </button>
```

Note que `text-slate-400` virou `text-slate-500`: `slate-400` sobre `slate-100` tem contraste ~2.8:1, abaixo do mínimo AA de 4.5:1. Já que estamos aqui, corrija.

`src/app/page.tsx:125-133` — o botão do seletor de grupo:
```tsx
            <button
              type="button"
              className="min-h-[max(2.75rem,44px)] flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors px-1"
              onClick={() => setShowGroupPicker(!showGroupPicker)}
              aria-expanded={showGroupPicker}
              aria-haspopup="listbox"
            >
              <Users className="w-3 h-3" />
              {selectedGroup ? groups.find(g => g.id === selectedGroup)?.name : 'Lista privada'}
              <ChevronDown className="w-3 h-3" />
            </button>
```

`src/app/page.tsx:136-152` — as duas opções do seletor: em **ambos** os `<button>` (o de "Privada" e o do `groups.map`), trocar `px-3 py-2` por `px-3 min-h-[max(2.75rem,44px)]` e trocar `<User size={14} />` / `<Users size={14} />` por `<User className="w-4 h-4" />` / `<Users className="w-4 h-4" />`.

- [ ] **Step 4: Corrigir os botões da página de lista**

`src/app/lists/[id]/page.tsx:139-146` — "Limpar comprados":
```tsx
          <button
            onClick={() => setClearOpen(true)}
            className="min-h-[max(2.75rem,44px)] px-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors active:scale-95"
          >
            <Trash2 className="w-4 h-4" /> Limpar comprados
          </button>
```

`src/app/lists/[id]/page.tsx:235-240` — o "OK" da edição inline:
```tsx
      <button
        className="min-h-[max(2.75rem,44px)] px-3 rounded-lg bg-emerald-500 dark:bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-600 dark:hover:bg-emerald-700 active:scale-95 transition-all"
        onClick={onSave}
      >
        OK
      </button>
```

Trocar também, na mesma tela, `<RefreshCw size={14} .../>` (linha 120) por `<RefreshCw className="w-4 h-4" .../>` e `<Users size={10} />` (linha 130) por `<Users className="w-3 h-3" />`.

- [ ] **Step 5: Corrigir o botão de senha do login**

`src/app/login/page.tsx:63-69` — o olho de mostrar/ocultar é hoje ~18px, o menor alvo do app:
```tsx
            <button
              type="button"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-0 top-1/2 -translate-y-1/2 min-h-[max(2.75rem,44px)] min-w-[max(2.75rem,44px)] flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
```

O `right-3` virou `right-0` porque o alvo agora tem 44px de largura e encostaria no texto; o padding interno do input (`pr-11`) já reserva o espaço.

- [ ] **Step 6: Migrar os botões de grupos**

Em `src/app/groups/page.tsx`, adicionar `import IconButton from '@/components/IconButton'` ao topo e migrar:

- linha 160-165 (voltar) → `<IconButton icon={<ArrowLeft className="w-4 h-4" />} label="Voltar para minhas listas" onClick={() => router.push('/')} />`
- linha 218-224 (excluir grupo) → `<IconButton icon={<Trash2 className="w-4 h-4" />} label={\`Excluir grupo ${group.name}\`} variant="danger" onClick={() => setDeleteTarget(group)} />`

  **Cuidado:** este botão está aninhado dentro de outro `<button>` (o de expandir, linha 202) — HTML inválido, e é por isso que ele precisa do `e.stopPropagation()`. Ao migrar, mova o botão de excluir para **fora** do `<button>` pai, transformando o pai em `<div>` com um `<button>` interno só na área do título. Se isso ficar grande demais, mantenha o `stopPropagation` via um wrapper `<span onClick={e => e.stopPropagation()}>` em volta do `IconButton` e **registre a dívida** — não deixe HTML inválido novo.
- linha 252-258 (adicionar membro) → `<IconButton icon={<UserPlus className="w-4 h-4" />} label="Adicionar membro ao grupo" variant="primary" disabled={addingMember || !addMemberUsername.trim()} onClick={() => handleAddMember(group.id)} />`
- linha 276-283 (remover membro) → `<IconButton icon={<UserX className="w-4 h-4" />} label={\`Remover ${member.username} do grupo\`} variant="danger" onClick={() => handleRemoveMember(group.id, member.id, member.username)} />`

O botão de expandir (linhas 226-237) usa um `<svg>` inline em vez de lucide. Troque por `<ChevronDown className={\`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}\`} />` importado de `lucide-react` e migre para `IconButton` com `label={isExpanded ? 'Recolher membros' : 'Ver membros'}`.

- [ ] **Step 7: Rodar os testes — este é o gate da fase**

Run: `npm test`
Expected: **17 passed, 0 failed.** (16 de layout — 3 telas autenticadas × 2 tamanhos × 2 asserções = 12, mais login × 2 tamanhos × 2 asserções = 4 — somados ao projeto `setup`, que o Playwright conta como teste.)

Referência: o baseline no fim da Fase 1 era **10 failed / 7 passed**; a Task 8 zerou os 2 de scroll horizontal, e a Task 10 tirou os botões do `ItemCard` da lista de violações. Os 8 restantes de alvo de toque são responsabilidade desta task.

Se algum alvo ainda falhar, a mensagem imprime o `aria-label` e as dimensões exatas do botão culpado — migre o que sobrou. **Não** relaxe a asserção para 40px nem exclua o botão da query só para ficar verde: o teste está certo, o botão é que está pequeno.

- [ ] **Step 8: Verificar que o build passa**

Run: `npm run build`
Expected: `✓ Compiled successfully`, sem erro de TypeScript.

- [ ] **Step 9: Conferir a densidade visual**

Vários botões cresceram de 28-32px para 44px. Isso muda a densidade das telas de propósito, mas pode ter estourado algum layout.

Run: `npm run dev`, percorra home → lista → grupos → login a 360px, em M e XG.
Expected: nada sobreposto, nada cortado, nenhuma barra de rolagem horizontal. Se a linha "Grupos / Sair" ficou apertada demais, ela pode virar `flex-wrap` — mas **não** reduza os 44px.

---

### Task 13: `ConfirmDialog` — foco seguro e semântica de diálogo

**Files:**
- Modify: `src/components/ConfirmDialog.tsx:27-33` (foco inicial) e `:48-72` (semântica)

**Interfaces:**
- Consumes: nada novo
- Produces: `ConfirmDialog` mantém a assinatura de props atual — os 3 call sites (`page.tsx:220`, `lists/[id]/page.tsx:189,198`, `groups/page.tsx:295`) **não mudam**

**Diagnóstico:** `useEffect` na linha 29-33 dá `focus()` no botão de **confirmação**, inclusive no variant `danger`. O diálogo "Excluir lista — todos os itens serão perdidos" abre com *Excluir* focado; um Enter distraído apaga a lista. Faltam também `role="dialog"`, `aria-modal`, `aria-labelledby`, prisão de foco (hoje o Tab escapa para trás do overlay) e devolução do foco ao fechar.

- [ ] **Step 1: Trocar o alvo do foco inicial e adicionar as refs**

Substituir as linhas 27-33 por:

```tsx
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previouslyFocused.current = document.activeElement as HTMLElement

    // Em ação destrutiva o foco vai para Cancelar: com Confirmar focado,
    // um Enter distraído apaga os dados sem o usuário ler o aviso.
    const target = isDanger ? cancelRef.current : confirmRef.current
    target?.focus()

    return () => previouslyFocused.current?.focus()
  }, [open, isDanger])
```

**Atenção:** `isDanger` é declarado hoje na linha 46, **depois** dos hooks e depois do `if (!open) return null`. Mova a declaração `const isDanger = variant === 'danger'` para logo abaixo da desestruturação das props (antes dos `useRef`), senão este efeito não compila.

- [ ] **Step 2: Adicionar a prisão de foco**

Acrescentar após o efeito do Step 1:

```tsx
  useEffect(() => {
    if (!open) return

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCancel()
        return
      }
      if (e.key !== 'Tab') return

      // Prende o Tab dentro do diálogo: sem isto o foco escapa para os
      // controles atrás do overlay, que estão visualmente inacessíveis.
      const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusables || focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onCancel])
```

Isto **substitui** o efeito de Escape que hoje está nas linhas 35-42 — remova o antigo para não registrar dois listeners.

- [ ] **Step 3: Adicionar a semântica de diálogo**

Na `<div>` do card (linha 55-58), adicionar as props e a ref:

```tsx
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900/50 w-full max-w-sm p-6 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
```

No `<h2>` (linha 72) adicionar `id="confirm-dialog-title"`; no `<p>` (linha 73) adicionar `id="confirm-dialog-message"`.

No botão de fechar (linha 59-64), adicionar `aria-label="Fechar"` e `type="button"`.

No botão de cancelar (linha 76-81), adicionar `ref={cancelRef}` e `type="button"`.

No botão de confirmar (linha 82-92), adicionar `type="button"` (o `ref={confirmRef}` já existe).

- [ ] **Step 4: Verificar o foco seguro**

Run: `npm run dev`. Na home, clique no ícone de lixeira de uma lista.

Expected:
- o diálogo abre com **Cancelar** focado (anel azul no Cancelar, não no Excluir)
- pressionar **Enter** imediatamente **cancela** — a lista continua lá
- pressionar **Escape** fecha
- ao fechar, o foco volta para o botão de lixeira que abriu o diálogo

- [ ] **Step 5: Verificar a prisão de foco**

Com o diálogo aberto, pressione Tab várias vezes.
Expected: o foco circula **apenas** entre Fechar, Cancelar e Excluir — nunca vai para os elementos atrás do overlay. Shift+Tab circula na direção oposta.

- [ ] **Step 6: Rodar os testes**

Run: `npm test`
Expected: 16 passando, sem regressão.

---

### Task 14: Remover `autoFocus` intrusivo e adicionar skeleton de carregamento

**Files:**
- Create: `src/components/ListSkeleton.tsx`
- Modify: `src/app/page.tsx:113` (remover `autoFocus`), `:159-218` (bloco de renderização)
- Modify: `src/components/AddItemForm.tsx:35` (remover `autoFocus`)

**Interfaces:**
- Consumes: `useListsSync()` — retorna `{ lists, status, lastSyncedAt, online, externalChanges, syncNow, createList, renameList, deleteList }` (verificado em `src/lib/useListsSync.ts:113`). `status` é `SyncStatusValue` e começa em `'idle'`; `lastSyncedAt` é `number | null` e **só** recebe valor após um fetch bem-sucedido (`useListsSync.ts:39`).
- Produces: `ListSkeleton` — default export, props `{ count?: number }` (default 3)

**`useListsSync.ts` NÃO é modificado.** O sinal de "primeiro carregamento pendente" já é derivável do que o hook expõe: `lastSyncedAt === null` significa que nenhum fetch completou ainda. Adicionar estado novo ao hook seria duplicar informação que já existe — YAGNI.

**Diagnóstico:** `autoFocus` no input da home (`page.tsx:113`) e do `AddItemForm` (`:35`) abre o teclado do celular sozinho e come metade da tela toda vez que se entra na lista dentro do mercado. E as listas aparecem do nada após o fetch, sem estado de carregamento.

- [ ] **Step 1: Criar o skeleton**

`src/components/ListSkeleton.tsx`:

```tsx
export default function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando listas…</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700/50 px-4 py-3.5 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0 space-y-2">
            <div className="h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="h-3 w-1/4 rounded bg-slate-100 dark:bg-slate-700/50 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

O `sr-only` existe porque um skeleton é puramente visual: sem ele, quem usa leitor de tela ouve silêncio e acha que a página está vazia.

**Atenção:** `sr-only` é uma classe do Tailwind e já está disponível — não precisa de plugin.

- [ ] **Step 2: Usar o skeleton na home**

Em `src/app/page.tsx`, adicionar o import:
```tsx
import ListSkeleton from '@/components/ListSkeleton'
```

Logo após a linha 18 (a desestruturação do `useListsSync()`), derivar o sinal:
```tsx
  // lastSyncedAt só é preenchido após um fetch bem-sucedido (useListsSync.ts:39),
  // então null == nenhum carregamento completou. Em erro/offline mostramos o
  // estado real em vez de um skeleton eterno.
  const loadingFirst = lastSyncedAt === null && status !== 'error' && status !== 'offline'
```

`lastSyncedAt` e `status` **já** estão na desestruturação da linha 18 — não é preciso alterá-la.

Envolver o bloco das linhas 159-218 (`<div className="space-y-2"> ... </div>`, o que inclui o `.map` das listas e o `EmptyState`) em:

```tsx
      {loadingFirst ? (
        <ListSkeleton />
      ) : (
        <div className="space-y-2">
          {/* ...todo o conteúdo atual, inalterado: lists.map(...) e o EmptyState... */}
        </div>
      )}
```

Não altere nada dentro do bloco — apenas envolva-o no ternário.

- [ ] **Step 3: Remover os `autoFocus`**

`src/app/page.tsx:113` — remover a linha `autoFocus`.
`src/components/AddItemForm.tsx:35` — remover a linha `autoFocus`.

**Manter** o `autoFocus` em `src/app/login/page.tsx:47` (esperado numa tela de login) e nos inputs de edição inline (`page.tsx:173` e `lists/[id]/page.tsx:228`) — ali o usuário acabou de pedir para editar, então o foco é a resposta ao gesto dele.

- [ ] **Step 4: Verificar no celular simulado**

Run: `npm run dev`, DevTools em modo responsivo a 360px, com emulação de toque.

Expected: ao abrir a home e ao abrir uma lista, o teclado virtual **não** abre sozinho e o input não recebe foco. Ao clicar no lápis de um item, o input de edição **recebe** foco (comportamento preservado).

- [ ] **Step 5: Verificar o skeleton**

DevTools → Network → throttling "Slow 3G" → recarregue a home.
Expected: os cards cinzas pulsando aparecem, e são substituídos pelas listas reais quando o fetch termina. Sem salto de layout brusco.

- [ ] **Step 6: Verificar que o skeleton não fica eterno em erro**

DevTools → Network → "Offline" → recarregue a home.
Expected: o skeleton **some** e dá lugar ao `EmptyState` / `OfflineBanner`. Se o skeleton pulsar para sempre, a condição `status !== 'error' && status !== 'offline'` está errada — corrija antes de seguir.

- [ ] **Step 7: Rodar os testes**

Run: `npm test`
Expected: zero failed (mesmo número da Task 12).

---

### Task 15: Corrigir o README

**Files:**
- Modify: `README.md:22` (badge), `:165` (tabela de tecnologias), `:95` (diagrama), `:179` (pré-requisitos), `:184-205` (passo a passo)

**Interfaces:**
- Nenhuma.

**Diagnóstico:** o README anuncia Next.js 14; a dependência real é `next@16.2.10` (verificado). Ele também manda criar uma conta no Turso como pré-requisito, o que deixou de ser verdade depois da Task 1.

- [ ] **Step 1: Corrigir a versão do Next**

`README.md:22` — trocar:
```
  <img src="https://img.shields.io/badge/next.js-14.2-black?style=flat-square&logo=next.js" alt="Next.js 14" />
```
por:
```
  <img src="https://img.shields.io/badge/next.js-16.2-black?style=flat-square&logo=next.js" alt="Next.js 16" />
```

`README.md:165` — trocar `| **Framework** | [Next.js 14](https://nextjs.org/) (App Router) |` por `| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |`.

`README.md:95` — no diagrama Mermaid, trocar `subgraph "Frontend (Next.js 14)"` por `subgraph "Frontend (Next.js 16)"`.

- [ ] **Step 2: Atualizar o passo a passo de execução**

`README.md:177-205` — substituir a seção "Pré-requisitos" e "Passo a passo" por:

````markdown
### Pré-requisitos

- Node.js 18+

Uma conta no [Turso](https://turso.tech/) é necessária apenas para **produção**. Em
desenvolvimento o app usa um SQLite local automaticamente.

### Passo a passo

```bash
# 1. Clone o repositório
git clone https://github.com/LuisMarchio03/grocery-list.git
cd grocery-list

# 2. Instale as dependências
npm install

# 3. Crie o banco local e popule com usuários de teste
npm run migrate
npm run seed

# 4. Inicie a aplicação
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) 🎉

O `seed` cria os usuários de teste e imprime as senhas no terminal.

### Rodando com Turso (opcional em dev, obrigatório em prod)

```bash
cp .env.example .env.local
# preencha TURSO_DATABASE_URL e TURSO_AUTH_TOKEN
```

Com `TURSO_DATABASE_URL` definida, o app usa o Turso em vez do SQLite local.

### Testes

```bash
npm test        # Playwright: layout a 360px nos tamanhos de fonte M e XG
npm run test:ui # modo interativo
```
````

- [ ] **Step 3: Adicionar as funcionalidades novas à tabela**

`README.md:82-84` — trocar a célula de acessibilidade por:
```html
      <td align="center">
        <strong>♿ Acessibilidade</strong><br />
        <sub>4 níveis de fonte, tema claro/escuro, alvos de toque de 44px e navegação por teclado</sub>
      </td>
```

- [ ] **Step 4: Verificar**

Run: `grep -n "Next.js 14\|next.js-14\|Next.js 16\|next.js-16" README.md`
Expected: apenas ocorrências de `16`, nenhuma de `14`.

Run: `grep -n "turso db create" README.md`
Expected: nenhuma saída na seção de passo a passo principal (só pode aparecer na seção opcional de Turso, se você a mantiver).

---

## Verificação final

- [ ] **Suite completa**

Run: `npm test`
Expected: **16 passed, 0 failed**.

- [ ] **Build de produção**

Run: `npm run build`
Expected: `✓ Compiled successfully`, `Finished TypeScript`, sem erro.

- [ ] **App do zero**

Run: `rm -f dev.db && npm run migrate && npm run seed && npm run dev`
Expected: sobe e funciona em `http://localhost:3000` sem `.env.local` e sem conta no Turso.

- [ ] **Checagem manual final no celular simulado (360px)**

Percorra, em **M e XG**, em **claro e escuro**: login → home → criar lista → abrir lista → adicionar item → marcar → promoção → editar → excluir → grupos.

Expected: sem estouro horizontal, sem mancha branca no escuro, sem flash ao recarregar, teclado não abre sozinho, diálogo de exclusão abre com Cancelar focado.

- [ ] **Validar a hipótese do Service Worker (pendência da spec)**

A spec registra que o erro no celular é atribuído ao SW com alta confiança, mas o usuário nunca reportou a mensagem exata. Peça a ele para abrir o app no celular onde o erro acontecia, **após** o deploy desta versão, e confirmar. Se o erro persistir, a hipótese estava errada e o problema precisa de investigação nova — **não** feche o assunto sem essa confirmação.

---

## Dívidas registradas (fora de escopo, não implementar)

- `src/middleware.ts` → `src/proxy.ts` (deprecado no Next 16; o build avisa a cada execução)
- CORS, CSP, rate limit no login, `JWT_SECRET` com fallback `'dev-secret-change-in-production'` em `src/lib/auth.ts:8`
- ~~`scripts/migrate.mjs` não cria as tabelas `lists`/`items`~~ — **promovido a escopo e corrigido na Task 2, Step 4.** Confirmado empiricamente que bloqueava o critério de sucesso #1 da spec, o `global-setup` do Playwright e o README. Deixou de ser dívida.
- Design system completo (recusado no escopo; `IconButton` é a extração mínima)
- HTML inválido em `groups/page.tsx:202-239` (botão dentro de botão), se a Task 12 optar pelo wrapper em vez da reestruturação
