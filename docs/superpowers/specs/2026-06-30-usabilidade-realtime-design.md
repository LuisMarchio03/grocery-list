# Design — Melhorias de usabilidade + sincronização em tempo real

Data: 2026-06-30
App: `lista-compras` (Next.js 14 App Router, libsql/Turso, Tailwind)

## Contexto

Lista de compras compartilhada por família. Cenário principal: **duas+ pessoas
editando a MESMA lista ao mesmo tempo** (um em casa, outro no mercado). Hoje cada
aparelho só vê o estado de quando carregou a página; mutações fazem refetch local,
mas nada propaga entre dispositivos. Erros de rede somem em silêncio.

Hospedagem: **Vercel / serverless** → sem WebSocket persistente. Solução de tempo
real = **polling inteligente**.

Restrição descoberta no código: `photo_base64` é guardado na tabela `items` e
devolvido inteiro por `GET /api/lists/[id]/items`. Polling frequente desse payload
seria inviável (megabytes). Por isso a foto sai do payload da lista e passa a ser
buscada sob demanda.

Sem migração de banco (`schema.sql` inalterado). Usa colunas existentes
(`created_at`, `photo_base64`) com agregação/computação na query.

## Objetivos

1. Tempo real entre dispositivos via polling (~4s, focus-aware, reconnect-aware).
2. Indicador de status de sync + botão de sincronizar manual.
3. Feedback visível de erro e de offline, com fila de reenvio.
4. Ganhos na lista: progresso, limpar comprados, busca, contagem na home.
5. Toques de UX: auto-focus, aviso de duplicado.

Fora de escopo (YAGNI): autenticação, presença/cursores de outros usuários,
resolução de conflito por campo, persistência offline em IndexedDB, SSE/WebSocket.

## Arquitetura

### Componentes novos

| Unidade | Responsabilidade | Depende de |
|---|---|---|
| `useListSync(listId)` (hook) | Estado dos itens + polling + fila de reenvio + status | `useToast`, `useOnlineStatus`, fetch API |
| `useListsSync()` (hook) | Mesmo padrão para a coleção de listas (home) | idem |
| `useOnlineStatus()` (hook) | `navigator.onLine` + eventos `online`/`offline` | — |
| `ToastProvider` / `useToast` | Toasts (sucesso/erro/aviso), sem dependência nova | — |
| `SyncStatus` (componente) | Badge "Sincronizando / Atualizado há Xs / Sem conexão" + botão refresh | hook de sync |
| `OfflineBanner` (componente) | Banner discreto quando offline | `useOnlineStatus` |
| `ListProgress` (componente) | "3 de 8 comprados" + barra | — |
| `ItemSearch` (componente) | Campo de busca/filtro (aparece com > 8 itens) | — |

### Mudanças em arquivos existentes

- `src/app/api/lists/[id]/items/route.ts` (GET): seleciona
  `photo_base64 != '' AS has_photo` em vez de `photo_base64`. Item passa a ter
  `has_photo: number`, sem `photo_base64`.
- `src/app/api/items/[id]/photo/route.ts` (**novo**, GET): devolve
  `{ photo_base64 }` de um item.
- `src/components/Providers.tsx`: envolve com `ToastProvider`.
- `src/app/lists/[id]/page.tsx`: passa a consumir `useListSync`; remove a lógica
  de fetch/otimismo embutida (migra para o hook); usa `SyncStatus`, `ListProgress`,
  `ItemSearch`, `OfflineBanner`, botão "Limpar comprados".
- `src/app/page.tsx`: consome `useListsSync`; usa `SyncStatus`; mostra contagem
  de itens por lista.
- `src/components/ItemCard.tsx`: tipo do item usa `has_photo`; "Ver foto" busca o
  base64 sob demanda (via callback que chama o endpoint novo).
- `src/components/AddItemForm.tsx`: `autoFocus`; aviso de duplicado via callback.
- `src/app/api/lists/route.ts` (GET): inclui `item_count` por lista
  (`LEFT JOIN`/subquery `COUNT`), para a home.

## Modelo de dados (tipos no cliente)

```ts
type Item = {
  id: string
  name: string
  quantity: string
  is_checked: number
  is_promotion: number
  has_photo: number      // antes: photo_base64: string
}

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error'
type ListWithCount = List & { item_count: number }
```

## Fluxo de dados — `useListSync`

Estado interno: `items`, `status`, `lastSyncedAt`, `pendingCount` (mutações em
voo), `isEditing` (setado pela página), `queue` (mutações para reenvio).

- **Tick de polling** (intervalo 4s, só com aba visível e online): se
  `pendingCount > 0` ou `isEditing`, pula o tick (não atropela estado local).
  Senão, `GET items` (leve) e substitui `items`, preservando itens otimistas
  `temp-*` ainda não confirmados. Atualiza `lastSyncedAt`, `status='synced'`.
- **Gatilhos extra de refetch**: `visibilitychange` (voltou a visível),
  `online`, e `syncNow()` manual.
- **Mutação** (add/toggle/edit/delete/promo/foto): aplica otimista, incrementa
  `pendingCount`, faz request.
  - Sucesso → decrementa, refetch leve.
  - Falha **online** → rollback + toast de erro + (opcional) reenfileira.
  - **Offline** (detectado antes de enviar) → mantém otimista, **enfileira** a
    mutação; `status='offline'`.
- **Reconexão** (`online`): flush da fila em ordem; ao terminar, refetch.
  Falhas no flush → toast, item permanece na fila.

### Política de conflito (simples, suficiente)

Last-write-wins por mutação no servidor (já é o comportamento atual do PUT). O
polling reconcilia: o último estado gravado vence. Sem merge por campo. Itens
`temp-*` locais sobrevivem ao polling até confirmarem.

## Tratamento de erro

- Toda mutação que falha online → `useToast().error(...)` + rollback.
- Offline → `OfflineBanner` + `SyncStatus='offline'` + fila.
- `GET` de polling que falha → `status='error'` silencioso (sem toast a cada
  4s); volta a `synced` no próximo sucesso. Toast só em ação manual (`syncNow`).
- Foto on-demand que falha → toast "Não foi possível carregar a foto".

## Testes

Sem framework de teste no projeto hoje. Estratégia:

1. **Verificação manual** (roteiro): dois navegadores na mesma lista; alteração
   em A aparece em B em ≤ ~5s; modo offline (DevTools) mostra banner e enfileira;
   religar conexão envia a fila; "Limpar comprados"; busca; foto on-demand abre.
2. **Lógica pura testável**: extrair a fila/reconciliação para funções puras
   (`applySnapshot(local, remote)`, `reduceQueue`) em `src/lib/sync/` para permitir
   teste unitário leve se um runner for adicionado depois. Não adicionar runner
   agora (YAGNI), mas manter a lógica isolada e pura.

## Decisões / trade-offs

- **Polling 4s** em vez de SSE: serverless-friendly, zero infra, latência
  aceitável para mercado. Revisável via constante.
- **Foto fora do payload**: necessário para polling barato; também melhora a
  performance geral de carga da lista.
- **Fila em memória** (não IndexedDB): cobre o caso "offline curto no mercado".
  Recarregar a página perde a fila — aceitável para o escopo; persistir é YAGNI.
- **Sem `updated_at`/migração**: contagem + reconciliação por snapshot completo
  (payload já é leve) evita `ALTER TABLE`.
