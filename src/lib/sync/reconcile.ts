import type { Item } from './types'

/**
 * Reconcilia o estado local com o snapshot remoto (fonte de verdade).
 *
 * O polling em `useListSync` só dispara quando NÃO há mutação em voo
 * (`pendingCount === 0`) e nenhum item em edição. Portanto, no momento de um
 * fetch, qualquer item otimista `temp-*` ainda presente no estado local já teve
 * sua mutação resolvida:
 *  - se a criação teve sucesso, o item já vem no `remote` com id real;
 *  - se falhou, o `temp-*` já foi removido pelo rollback.
 *
 * Logo, preservar `temp-*` aqui só geraria duplicatas. O snapshot remoto é a
 * verdade. (Enquanto uma criação está em voo, o tick de polling é pulado, então
 * o item otimista nunca é descartado prematuramente.)
 */
export function applySnapshot(_local: Item[], remote: Item[]): Item[] {
  return remote
}
