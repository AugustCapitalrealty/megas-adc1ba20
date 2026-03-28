

## 4 Mudanças no Backoffice

### 1. Remover cards KPI do topo (BackofficeKPIs)

Os 6 cards (Na Fila, Em Processamento, OC Emitida, Liberadas, Enviadas, SLA Crítico) já são redundantes com as abas do FilterBar que mostram contagens. Remover o componente `BackofficeKPIs` e sua renderização em `Backoffice.tsx`.

**Arquivos:**
- `src/pages/Backoffice.tsx` — remover import e bloco `<BackofficeKPIs ... />`
- `src/components/backoffice/BackofficeKPIs.tsx` — pode ser deletado ou mantido sem uso

### 2. Ordenação por data de abertura vs última alteração

Hoje as listas de cada aba são ordenadas pela data do `created_at` (vinda da RPC). Adicionar um botão de toggle de ordenação no topo da lista (ao lado do exportar ou dentro do TabContent) com duas opções: "Data de abertura" e "Última alteração".

- O campo `updated_at` já existe na tabela `solicitacoes` e é retornado pela RPC
- Se `updated_at` não estiver no retorno do hook, ajustar a RPC ou o `enrichWithResponsavelInfo` para incluí-lo
- No `TabContent`, antes de paginar, aplicar `sort()` baseado no campo selecionado

**Arquivos:**
- `src/pages/Backoffice.tsx` — adicionar state `sortBy: 'created_at' | 'updated_at'`, botão toggle, aplicar sort nos items antes de paginar
- Verificar se `updated_at` está disponível nos dados do `SolicitacaoBackoffice` (se não, ajustar `useBackofficeSolicitacoes.ts`)

### 3. Refatorar Modo Férias

Problemas atuais: só transfere, sem opção fácil de devolver. Melhorias:

**A) Adicionar opção "Devolver carteira":** Na tabela de usuários do Admin, além do botão "Modo férias", mostrar um botão "Devolver carteira" que faz o inverso — busca todas as solicitações transferidas de X para Y (via `solicitacao_transfers` com motivo contendo "férias") e registra o histórico reverso com a RPC `insert_historico_admin`.

**B) Melhorar a seleção de destino:** Permitir distribuir para múltiplos backoffice (round-robin) ou selecionar um único destino. Adicionar preview de quantas solicitações serão transferidas antes de confirmar.

**C) Restaurar role automaticamente na devolução:** Se a role foi removida durante férias, restaurá-la ao devolver.

**D) Registrar no banco quem está de férias:** Adicionar campos na tabela ou usar `solicitacao_transfers` para detectar transferências pendentes de devolução.

**Arquivos:**
- `src/pages/Admin.tsx` — refatorar modal de férias, adicionar botão/modal de devolução, preview de contagem, lógica de round-robin opcional

### 4. Badge "Cancelado por falta de resposta" + % no Dashboard Eficiência

**A) Corrigir labels de status:**
- Em `src/types/index.ts`, o label de `cancelado` é "Cancelada pelo Solicitante" — isso está errado para cancelamentos automáticos. O label genérico deve ficar, mas no card precisa diferenciar.
- No `BackofficeSolicitacaoCard.tsx`, o `isPrazoExpirado` só checa `status === 'rejeitado'` mas agora o edge function usa `cancelado`. Corrigir para incluir `cancelado`.
- O badge deve mostrar "Cancelado por falta de resposta" em vez de "Prazo expirado".

**B) No `SolicitanteSolicitacaoCard.tsx`**, já funciona corretamente para `cancelado` com prazo expirado.

**C) Dashboard Eficiência — % canceladas por falta de resposta:**
- No `useEficienciaDashboard.ts`, adicionar query que conta solicitações com `status = 'cancelado'` que tenham no histórico ação `prazo_correção_expirado` ou `prazo_resposta_expirado` no período filtrado.
- Retornar novo KPI: `canceladasPorPrazo` (count) e `canceladasPorPrazoPercent` (% do total).
- No `DashboardEficiencia.tsx`, renderizar card com essa métrica.

**Arquivos:**
- `src/types/index.ts` — nenhuma mudança (label genérico OK)
- `src/components/backoffice/BackofficeSolicitacaoCard.tsx` — corrigir `isPrazoExpirado` para incluir `cancelado`, mudar texto do badge
- `src/hooks/useEficienciaDashboard.ts` — adicionar query de canceladas por prazo
- `src/pages/DashboardEficiencia.tsx` — adicionar card de % canceladas por prazo

### Resumo de Arquivos

| Arquivo | Mudança |
|---------|---------|
| `src/pages/Backoffice.tsx` | Remover KPIs, adicionar ordenação |
| `src/components/backoffice/BackofficeKPIs.tsx` | Remover/deprecar |
| `src/components/backoffice/BackofficeSolicitacaoCard.tsx` | Corrigir isPrazoExpirado, texto badge |
| `src/pages/Admin.tsx` | Refatorar modo férias + devolução |
| `src/hooks/useEficienciaDashboard.ts` | KPI canceladas por prazo |
| `src/pages/DashboardEficiencia.tsx` | Card % canceladas por prazo |
| `src/hooks/useBackofficeSolicitacoes.ts` | Garantir updated_at disponível |

