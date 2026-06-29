# Design: Refresh de aparência, usabilidade e acessibilidade

**Data:** 2026-06-29
**Projeto:** Lista de Compras (Next.js 14 PWA + Turso/libSQL)

## Objetivo

Melhorar aparência, usabilidade e acessibilidade do app, sem trocar a stack nem
a identidade visual (azul/slate). Refresh sólido — não um redesign do zero.

### Decisões de escopo (definidas com o usuário)

- **Ambição:** refresh sólido (hierarquia, cards, botões, estados), mantendo a identidade.
- **Dark mode:** sim — claro + escuro, com toggle manual e respeito a `prefers-color-scheme`.
- **Público:** inclui idosos / baixa visão → acessibilidade **visual** é prioridade alta.
- **Usabilidade:** incluir as 4 — loading/erro, contador/progresso, limpar comprados, comprimir fotos.
- **Fora de escopo:** suporte dedicado a leitor de tela (sem `aria-live`/marcação extra para SR).
  Os `title` já existentes nos botões de ícone são mantidos.
- **Sem novas dependências de runtime:** componentes próprios em vez de libs (`next-themes`, `sonner`).

## Abordagem

Componentes próprios + **tokens de tema** via CSS variables, com `darkMode: 'class'`
no Tailwind. Mantém o bundle pequeno e dá controle total sobre contraste — importante
para o público de baixa visão.

## Design por área

### 1. Tema & dark mode

- `tailwind.config.ts`: `darkMode: 'class'`.
- Novo `src/lib/ThemeContext.tsx` (irmão de `FontSizeContext`): estado `light | dark | system`,
  persistido em `localStorage` (chave `theme`), aplica/remove a classe `dark` no `<html>` e
  reage a `prefers-color-scheme` quando em modo `system`.
- `globals.css`: tokens semânticos como CSS variables, com valores para claro e escuro
  (ex.: `--surface`, `--surface-2`, `--text`, `--text-muted`, `--border`, `--accent`).
  Tailwind consome via `theme.extend.colors` mapeando para as variáveis.
- `src/components/ThemeToggle.tsx`: botão na barra do topo, ao lado do controle de fonte.

### 2. Acessibilidade (visual)

- **Alvos de toque ≥ 44×44px** nos controles interativos (hoje botões de ícone têm 32px).
- **Contraste WCAG AA+**: substituir `slate-400` em textos/ícones secundários por tons
  legíveis (claro e escuro). Validar PROMO, datas e placeholders.
- **Foco visível**: remover `focus:outline-none` sem substituto; anel de foco consistente
  (`focus-visible:ring`) em todos os interativos.
- **Escala de fonte**: manter o controle existente; revisar layouts para não quebrarem
  no tamanho `xl`. Tudo em `rem`.

### 3. Refresh visual

- Header padronizado entre Home e Lista (hoje cada página remonta o topo).
- Cards/botões/espaçamentos consistentes via tokens; hierarquia mais clara em
  nome × quantidade × badge PROMO no `ItemCard`.
- Estados vazios revisados; estados de loading novos (ver abaixo).

### 4. Usabilidade

- **Loading/erro:**
  - `src/components/Skeleton.tsx`: cards skeleton durante o fetch inicial (Home e Lista).
  - `src/components/Toast.tsx` + `ToastProvider` + hook `useToast()`: avisa falhas de ação
    (ex.: criar/renomear/excluir/atualizar que retornem `!res.ok` ou lancem). Visual apenas.
  - Páginas passam a tratar erro de fetch em vez de falhar em silêncio.
- **Contador/progresso:**
  - `GET /api/lists` passa a retornar `total` e `checked` por lista (subquery), ordenação mantida.
  - Home: "X de Y comprados" em cada card.
  - Lista: `src/components/ProgressBar.tsx` calculado a partir dos itens já carregados.
- **Limpar comprados:**
  - Novo `DELETE /api/lists/[id]/items` → `DELETE FROM items WHERE list_id = ? AND is_checked = 1`.
  - Botão "Limpar comprados" na seção "Comprados", com `ConfirmDialog`.
- **Comprimir fotos:**
  - `src/lib/image.ts`: redimensiona via `<canvas>` (lado maior ~1024px) e exporta JPEG
    (~0.7) antes de gerar o data URL base64.
  - `handlePhoto` em `lists/[id]/page.tsx` passa a usar o util em vez de `readAsDataURL` direto.

### 5. Estrutura de código

- `Providers.tsx`: monta `ThemeProvider` → `FontSizeProvider` → `ToastProvider`.
- Novos arquivos: `src/lib/ThemeContext.tsx`, `src/lib/image.ts`,
  `src/components/ThemeToggle.tsx`, `src/components/Toast.tsx`,
  `src/components/Skeleton.tsx`, `src/components/ProgressBar.tsx`.
- Atualizados: `tailwind.config.ts`, `globals.css`, `layout.tsx`, `page.tsx`,
  `lists/[id]/page.tsx`, `ItemCard.tsx`, `AccessibilityBar.tsx`, `ConfirmDialog.tsx`,
  `EmptyState.tsx`, `AddItemForm.tsx`, `PageHeader.tsx`, `ImageViewer.tsx`,
  `api/lists/route.ts`, `api/lists/[id]/items/route.ts`.

## Mudanças de API

- `GET /api/lists` → cada linha ganha `total` e `checked` (LEFT JOIN/subquery), ordem por
  `created_at DESC` mantida.
- `DELETE /api/lists/[id]/items` → apaga itens marcados da lista; retorna `{ success: true }`.

## Critérios de sucesso

- `next build` passa (type-check incluso).
- Dark mode alterna e persiste; segue o sistema em modo `system`.
- Controles interativos ≥ 44px; foco visível ao navegar por teclado; sem texto em `slate-400`
  de baixo contraste.
- Falha de ação mostra toast; fetch inicial mostra skeleton.
- Home mostra "X de Y"; lista mostra barra de progresso.
- "Limpar comprados" remove os marcados; foto é comprimida antes de salvar.
- Layout não quebra no tamanho de fonte `xl`.

## Não-objetivos

- Leitor de tela / ARIA dedicado.
- Autenticação, multiusuário, reordenar itens, busca/filtro.
- Migração de fotos para storage externo (continuam base64, agora comprimidas).
