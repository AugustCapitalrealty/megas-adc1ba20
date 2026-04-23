

## Trocar comparativo do Dashboard Eficiência + Auditoria das Ações Pendentes

### Parte 1 — Trocar "OCs Faturadas vs Em Aberto" por "Solicitações em Aberto vs Concluídas"

**Definições corretas (alinhadas ao resto do sistema):**
- **Concluídas** = `status IN ('concluida', 'enviado_pagamento')` (mesma definição usada em `MinhasSolicitacoes` e `useDashboardMetrics`)
- **Em Aberto** = qualquer status ativo (não em `'concluida'`, `'enviado_pagamento'`, `'cancelado'`, `'rejeitado'`)
- **Aging** = dias corridos desde `created_at` da solicitação (somente para Em Aberto)
- **Filtros respeitados:** período (`created_at` entre `dataInicio`/`dataFim`) + empreendimento

**Mudanças no hook `useEficienciaDashboard.ts`:**
- Renomear interface `OCStatusComparativo` → `SolicitacoesStatusComparativo` com campos: `concluidas`, `emAberto`, `total`, `percentConcluidas`, `agingBuckets`
- Substituir a query atual (que olha `documentos_emitidos` + NF) por uma query direta em `solicitacoes` filtrando por `created_at` no período + empreendimento
- Mantém os mesmos buckets de aging: `0-15`, `16-30`, `>30` dias

**Mudanças em `DashboardEficiencia.tsx`:**
- Trocar título do card: "Solicitações em Aberto vs Concluídas"
- Trocar descrição: "Total de solicitações abertas no período. Aging conta dias corridos desde a abertura."
- Trocar labels: "Concluídas" (verde) e "Em Aberto" (warning/destructive conforme aging)
- Renomear referências `ocStatus` → `solicitacoesStatus`

### Parte 2 — Auditoria do `PendingActionsCard`

**Verificar consistência entre contagens e filtros de destino:**

| Card | Métrica origem | Filtro destino | Status real esperado | OK? |
|---|---|---|---|---|
| Liberar OC | `pendingAcceptance` (`aguardando_aceite`) | `?filter=oc_emitida` → filtra `aguardando_aceite OR oc_ac_emitida` | match | ✅ |
| Correções | `pendingCorrections` (`pendente_correcao`) | `?filter=correcoes` → filtra `pendente_correcao OR aguardando_informacoes` | filtro mais amplo que a contagem | ⚠️ revisar |
| Informações | `pendingInfoRequests` (`aguardando_informacoes`) | `?filter=correcoes` (mesmo destino que Correções) | confunde dois cards no mesmo destino | ⚠️ revisar |
| NF/Boleto | `pendingNfBoleto` (`aguardando_nf_boleto`) | `?filter=liberadas` → filtra `liberado_fornecedor OR aguardando_execucao` | **MISMATCH** — destino não inclui `aguardando_nf_boleto` | ❌ corrigir |
| Justificativas OC | query separada (OCs sem NF) | `/monitoramento-oc?status=pendente_justificativa` | match | ✅ |
| Dar ciência | `pendingCiencia` (cancelado sem `cancelamento_ciencia_em`) | `?filter=canceladas` → filtra `rejeitado OR cancelado` | match parcial (mostra também rejeitadas) | ⚠️ revisar |

**Correções propostas:**

1. **NF/Boleto → destino errado**: trocar `getFilterForAction('nf_boleto')` de `'liberadas'` para `'enviadas'` (que filtra `enviado_fornecedor, aguardando_nf_boleto, nf_boleto_enviados`).
2. **Informações vs Correções compartilham destino**: criar um filtro distinto `?filter=informacoes` em `MinhasSolicitacoes.tsx` que filtra apenas `aguardando_informacoes`, e usar esse no `getFilterForAction('info_requests')`. O filtro `correcoes` passa a filtrar somente `pendente_correcao`.
3. **Dar ciência**: criar filtro dedicado `?filter=ciencia` que filtra `status === 'cancelado' AND !cancelamento_ciencia_em`, separando das rejeitadas.
4. **Sincronizar `statusCounts`**: ajustar o objeto `statusCounts` em `MinhasSolicitacoes` para refletir os novos filtros (`correcoes`, `informacoes`, `ciencia`) com contagens precisas que batem com o `PendingActionsCard`.

### Arquivos

| Arquivo | Mudança |
|---|---|
| `src/hooks/useEficienciaDashboard.ts` | Substituir query `ocStatus` por `solicitacoesStatus` baseada em `solicitacoes` |
| `src/pages/DashboardEficiencia.tsx` | Renomear card e variáveis, ajustar labels |
| `src/components/PendingActionsCard.tsx` | Corrigir mapeamento `getFilterForAction` (NF/Boleto, Informações, Ciência) |
| `src/pages/MinhasSolicitacoes.tsx` | Adicionar filtros `informacoes` e `ciencia`; ajustar `correcoes` para apenas `pendente_correcao`; atualizar `statusCounts` |

