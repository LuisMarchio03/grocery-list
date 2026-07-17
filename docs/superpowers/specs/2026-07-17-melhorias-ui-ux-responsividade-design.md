# Melhorias de UI, UX e responsividade — Lista de Compras

**Data:** 2026-07-17
**Status:** Aprovado, pronto para plano de implementação

## Objetivo

Melhorar UI, UX e responsividade do app, mantendo a linguagem visual atual (slate/azul, cards
arredondados). O foco declarado pelo usuário é "deixar tudo funcionando" e melhorar UI/UX;
CORS e hardening de segurança ficam **fora de escopo** e serão tratados depois.

O pedido específico que puxa boa parte do trabalho: a responsividade quebra quando o usuário
aumenta o tamanho da fonte.

## Contexto do projeto

Next.js (App Router) + React 18 + Tailwind + Turso/libSQL, PWA com Service Worker, autenticação
via JWT em cookie httpOnly, sincronização por polling com mutações otimistas e fila offline.

Fatos verificados que contradizem a documentação atual:

- O `README.md` anuncia Next.js 14, mas o `package.json` declara `next: ^16.2.10`. O código
  confirma Next 15+ (`params: Promise<{id}>`, `await cookies()`). **O README será corrigido.**
- Não existe infraestrutura de teste nem lint. Os únicos scripts são `dev`, `build`, `start`.
  `scripts/check.mjs` é um dump do banco, não um teste.
- O projeto **não é um repositório git** (é um ZIP baixado do GitHub) e não será inicializado como um
  — decisão do usuário. O `node_modules` não está instalado e não existe `.env.local`, então o app
  não sobe localmente hoje.

## Critérios de sucesso

1. `npm install && npm run migrate && npm run seed && npm run dev` sobe o app do zero, sem conta
   na nuvem.
2. `npm run build` passa.
3. Os testes Playwright passam: para cada tela (home, lista, grupos, login) × tamanho de fonte
   (M e XG) a 360×740 — sem scroll horizontal e todo alvo clicável com ≥ 44px.
4. Nenhum flash de tema claro nem salto de tamanho de fonte ao carregar.
5. O app instalado no celular não quebra após um deploy.

## Decisões tomadas

| Questão | Decisão | Motivo |
|---|---|---|
| Ambição da UI | Consertar + polir | Mantém a linguagem visual; menor risco |
| Sequenciamento | Por risco: destravar → consertar → polir | Cada fase entrega valor verificável |
| Fileira de ações do item no XG | Quebra em 2 linhas | Nada some nem fica escondido atrás de toque extra |
| Barra de acessibilidade | Vira popover de engrenagem | Cabe em qualquer tela/tamanho |
| Validação | Playwright nos pontos críticos | Pega regressão de layout que o olho deixa passar |
| Banco local | Fallback SQLite quando sem Turso | Roda do zero sem credenciais de nuvem |

Explicitamente **fora de escopo**: CORS, CSP, rate limit no login, `JWT_SECRET`, design system
completo, redesign visual.

---

## Fase 1 — Fundação para poder validar

### `src/lib/db.ts`

Resolução de URL com fallback **restrito a não-produção**:

```
url = TURSO_DATABASE_URL ?? (NODE_ENV === 'production' ? throw : 'file:./dev.db')
```

O `authToken` só é passado quando existe (`file:` não aceita token).

**Regra crítica:** em produção, ausência de `TURSO_DATABASE_URL` deve **lançar erro**, nunca cair
no SQLite local. Um fallback silencioso faria o deploy subir "funcionando" gravando dados da
família num arquivo efêmero do serverless, perdendo tudo no próximo restart. Falha barulhenta é o
comportamento correto.

### Scripts

`migrate.mjs` e `seed.mjs` passam a usar a mesma resolução de URL do `db.ts` (hoje eles abortam se
faltar `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`). Novos scripts em `package.json`: `migrate`, `seed`,
`test`. `dev.db` entra no `.gitignore`.

### Playwright

Escopo estreito de propósito — não é suíte de regressão, é rede de segurança de layout.

- `webServer` sobe o `npm run dev` automaticamente
- viewport **360×740** (piso realista de celular)
- `addInitScript` crava `localStorage.fontSize` antes do carregamento, para testar **M e XG**
- login uma vez em `globalSetup`, salvo em `storageState` e reaproveitado
- 4 telas × 2 tamanhos = 8 casos, 2 asserções cada:
  - sem scroll horizontal (`scrollWidth <= clientWidth` no elemento raiz)
  - todo alvo clicável com altura ≥ 44px

**Esses testes falham de cara** — o header estourando a 360px é exatamente o que a primeira
asserção pega. Isso é o desejado: escreve-se o teste vermelho na Fase 1, conserta-se na Fase 2.

---

## Fase 2 — Os bugs que quebram

### Service Worker (`public/sw.js`)

Diagnóstico do estado atual — três problemas que se somam e explicam o "erro só no celular":

1. Cacheia o HTML da `/`. Após um deploy, o celular serve o HTML antigo, que referencia chunks
   `/_next/static/...` que não existem mais → 404 → tela branca. No PWA instalado o SW persiste e o
   erro gruda.
2. Cacheia respostas GET da API. Com `return cached || fetchPromise`, devolve a resposta velha na
   hora e só revalida em background — anula a sincronização e serve dados de outro usuário após
   troca de login.
3. Nome do cache fixo (`grocery-list-v1`), então o `activate` nunca limpa nada.

Reescrita com estratégia por tipo de recurso:

| Recurso | Estratégia | Motivo |
|---|---|---|
| `/api/*` | Nunca intercepta (sai sem `respondWith`) | Mata dado velho e vazamento entre usuários |
| Navegação / HTML | Network-first, cache só como fallback offline | HTML novo sempre vem da rede → conserta o celular |
| `/_next/static/*`, ícones, manifest | Cache-first | Têm hash no nome, são imutáveis |

Mais: nome de cache versionado, `activate` limpando os antigos, `skipWaiting()` + `clients.claim()`.

O `skipWaiting()` é o que **conserta os celulares já quebrados**: sem ele o SW novo espera todas as
abas fecharem para assumir, o que num PWA instalado pode não acontecer nunca. O `sw.js` em si não
corre risco de vir do cache — o navegador sempre busca o script do SW na rede na checagem de
atualização.

### FOUC (`src/app/layout.tsx`, `ThemeContext`, `FontSizeContext`)

Hoje ambos os contexts aplicam tema/fonte dentro de um `useEffect`, ou seja **depois** da
hidratação: toda visita pisca branco e dá um salto de tamanho.

Correção: script inline **bloqueante** no `<head>`, antes de qualquer paint, lendo `localStorage` e
aplicando a classe `dark` e o `font-size` no `<html>`. Bloqueante é intencional — é o único jeito de
não piscar, e são ~10 linhas.

Consequência a tratar: o DOM já vem escuro mas o React renderiza com estado inicial `'light'`.
Resolve-se com `suppressHydrationWarning` no `<html>` e os contexts lendo o estado real do DOM na
montagem em vez de assumir um default. Ajuda que, com o popover, o ícone de tema não está visível no
primeiro paint.

### Cabeçalho

Estado atual: `[ícone 40px] [h1 flex-1] [AccessibilityBar]`. A barra tem 8 controles (−, P, M, G, XG,
+, divisória, tema) ocupando ~220px; somados o ícone e os gaps, sobra <40px para o título a 360px, e
o `h1` não tem `truncate` → atropela ou quebra em várias linhas. **Já está quebrado hoje, mesmo no
tamanho normal.** Há ainda redundância: `−`/`+` fazem o mesmo que os 4 botões P/M/G/XG.

Correção: novo componente `SettingsMenu` (popover de engrenagem) substitui o `AccessibilityBar` nos
2 lugares onde é usado. Header fica `[ícone] [título] [engrenagem]`. O `h1` ganha `min-w-0 truncate`.
O popover fecha com clique fora e `Escape`, e leva `aria-haspopup`/`aria-expanded`.

O `IconButton` é criado **nesta fase**, já com o `aria-label` obrigatório no tipo (justificativa na
Fase 3), porque seu estilo está copiado em ~15 pontos e a correção do header seria repetida em todos.
A Fase 3 apenas o consome e ajusta ícones/alvos de toque; não o cria.

### Dark mode

Pontos que cravam cor clara sem variante `dark:`:

- `src/app/page.tsx:107` — input "Nova lista"
- `src/app/page.tsx:169` — input de renomear lista
- `src/components/ItemCard.tsx:77` — `activeClass` de promoção
- `src/components/ItemCard.tsx:109` — `activeClass` de excluir

Verificado: `login/page.tsx`, `AddItemForm.tsx` e `ConfirmDialog.tsx` **já têm** as variantes
corretas. Falta auditar `groups/page.tsx` linha a linha.

Ao final da Fase 2 os testes da Fase 1 passam e o erro do celular pode ser validado.

---

## Fase 3 — Polimento

### Escala de fonte de verdade

O `FontSizeContext` aumenta o `font-size` do `<html>` (até 125% no XG), o que escala tudo em `rem` —
e o Tailwind usa `rem` por padrão. Mas há valores cravados em **px** que não escalam:

- rótulos dos botões do `ItemCard` (`text-[10px]`) e badge `PROMO`
- ícones Lucide (`size={14}`, `size={18}`, `size={20}` viram atributos px)
- `min-h-[44px]` dos botões de ação, `min-w-[160px]` do seletor de grupo

Resultado: no XG o texto do item cresce mas ícones e rótulos ficam pequenos — a acessibilidade
funciona pela metade.

Correção: px → `rem` (`text-[10px]` → `text-xs`); ícones Lucide passam a usar classes Tailwind
(`className="w-4 h-4"`) em vez da prop `size` — classe CSS vence atributo de apresentação no SVG, e
`w-4` é `rem`.

**Armadilha do alvo de toque:** `min-h-[44px]` **não** pode virar `min-h-11` puro. `11` = `2.75rem`,
e no tamanho **P** a base cai para 14px → `2.75rem = 38.5px`, abaixo do mínimo. O 44px é um limite
**físico** (o dedo), não relativo. Usa-se `min-h-[max(2.75rem,44px)]`: cresce com a fonte, nunca
desce do piso.

### Reflow do `ItemCard` sem breakpoint

A fileira tem 5 botões (Promoção, Foto, Ver, Editar, Excluir) com `flex-1`; a 360px cada um fica com
~60px. Com os rótulos escalando de verdade, "Promoção" deixa de caber.

Não se usa breakpoint (`sm:`/`md:`): breakpoint olha a largura da **viewport**, e o problema aqui é a
**fonte**. Usa-se CSS grid:

```css
grid-template-columns: repeat(auto-fit, minmax(4.5rem, 1fr));
```

Como o mínimo está em `rem`, ele cresce com a fonte: no M cabem os 5 botões; no XG o mínimo engorda,
deixam de caber 5 e o grid quebra sozinho em 3+2. Comportamento escolhido obtido de graça, e ainda se
adapta a qualquer largura sem adivinhar breakpoints.

### Acessibilidade

- **`IconButton`** (criado na Fase 2) tem `aria-label` **obrigatório no tipo** — o TypeScript recusa
  compilar um botão de ícone sem rótulo, então o problema não volta. Hoje eles têm só `title`, que
  leitor de tela não anuncia de forma confiável e que no celular nem aparece (não há hover). Esta
  fase migra os pontos restantes para ele.
- **`focus-visible:ring-2`** — hoje inexistente em todo o app.
- **Checkbox**: 20px viram alvo de 44px via pseudo-elemento (`before:absolute before:-inset-3`), sem
  mudar o visual.

### `ConfirmDialog`

Problema de segurança de UX encontrado: dá `focus()` no botão de **confirmação** ao abrir, inclusive
no variant `danger`. O diálogo "Excluir lista — todos os itens serão perdidos" abre com *Excluir*
focado; um Enter distraído apaga a lista.

Correções: no `danger`, foco inicial vai para **Cancelar**; adicionar `role="dialog"`, `aria-modal`,
`aria-labelledby`, prisão de foco (hoje o Tab escapa para trás do overlay) e devolução do foco ao
fechar.

### UX

- **`autoFocus`** sai do input da home (`page.tsx`) e do `AddItemForm` — hoje o teclado do celular
  abre sozinho e come metade da tela ao entrar na lista dentro do mercado. Mantido no login, onde é
  esperado.
- **Estado de carregamento**: as listas aparecem do nada após o fetch; entra um skeleton simples.

---

## Riscos e pendências

- **Sem git — decisão do usuário (2026-07-17), respeitada.** O projeto não é um repositório git e não
  será inicializado. Consequência aceita: não há `git diff` para revisar nem como desfazer via
  controle de versão. Nenhum arquivo desta spec depende de git; o documento não é commitado.

  Mitigação adotada, sem envolver git: antes da reescrita do `public/sw.js` e da alteração do
  `src/lib/db.ts` (os dois pontos de maior risco), copiar os arquivos originais para o scratchpad da
  sessão. Serve de rollback manual pontual.
- **Dívida aceita conscientemente:** o estilo do botão de ícone está duplicado em ~15 pontos. Extrai-se
  `IconButton`, mas não um design system completo (recusado no escopo). Se o app crescer, essa dívida
  cobra.
- ~~**Risco de `npm install` / versões**~~ — **RESOLVIDO em 2026-07-17, verificado.** As duas
  suspeitas levantadas estavam erradas:
  - `npm install` roda limpo: 150 pacotes, sem conflito de peer dependency. Resolveu
    `next@16.2.10`, `react@18.3.1`, `react-dom@18.3.1`, `lucide-react@1.17.0`.
  - `lucide-react@1.17.0` **existe** (a linha `1.x` é real; a suposição de que só havia `0.x`
    estava desatualizada).
  - `next@16.2.10` **convive com React 18.3.1** sem erro.
  - `npm run build` **passa** no baseline: compila em 4.5s, TypeScript OK, 10 páginas geradas.

  Nada aqui bloqueia o plano.

- **Dívida nova encontrada no build (fora de escopo, registrada):** o Next 16 emite
  `The "middleware" file convention is deprecated. Please use "proxy" instead.` — o
  `src/middleware.ts` deveria virar `src/proxy.ts`. Não quebra nada hoje e não tem relação com
  UI/UX, então **não entra neste plano**; fica para a rodada de backend/segurança que o usuário
  adiou.
- **`groups/page.tsx`** ainda não auditado linha a linha para dark mode.
- **A validar depois:** o erro do celular é atribuído ao Service Worker com alta confiança, mas o
  usuário não reportou a mensagem exata. Confirmar na Fase 2 antes de considerar resolvido.
