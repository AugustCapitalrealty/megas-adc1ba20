

## Correção de Informações Inconsistentes

### Bugs Identificados

**1. STATUS_LABELS e STATUS_ACTION_LABELS mostram "Cancelada pelo Solicitante" para status `cancelado`**
- `src/types/index.ts` linha 222: `cancelado: 'Cancelada pelo Solicitante'`
- Isso aparece no StatusBadge para TODAS as solicitações canceladas, inclusive as canceladas automaticamente por prazo
- O correto seria um label genérico "Cancelada", e a diferenciação ser feita via badge contextual (que já existe no BackofficeSolicitacaoCard)

**2. `inProgress` no Dashboard não inclui `aguardando_aceite`, `aguardando_nf_boleto`, `nf_boleto_enviados`, `enviado_pagamento`, `aguardando_execucao`, `oc_ac_emitida`**
- `useDashboardMetrics.ts` linha 175-176: `inProgressStatuses` inclui apenas `['recebido', 'em_analise', 'em_processamento', 'aprovado', 'liberado_fornecedor', 'enviado_fornecedor']`
- Faltam: `aguardando_aceite`, `aguardando_nf_boleto`, `nf_boleto_enviados`, `enviado_pagamento`, `oc_ac_emitida`, `aguardando_execucao`
- O KPI "Em Andamento" do solicitante mostra um número menor que o real — solicitações que estão aguardando aceite ou NF/boleto não contam como "em andamento"

**3. `enviado_pagamento` está no grupo `concluidas` no Backoffice mas no grupo `enviadas` no Solicitante**
- Backoffice (`Backoffice.tsx` linha 1254): `concluidas: [...'enviado_pagamento']`
- Solicitante (`MinhasSolicitacoes.tsx` linha 322/349): `enviadas: [...'enviado_pagamento']`
- Inconsistência entre as duas views

**4. `oc_ac_emitida` não aparece em nenhum filtro do Solicitante**
- No `MinhasSolicitacoes.tsx`, o status `oc_ac_emitida` não é incluído em nenhum case do switch (linhas 308-330)
- Solicitações com este status só aparecem na aba "Todas" mas não em nenhuma aba específica
- Deveria estar junto com `aguardando_aceite` na aba "OC Emitida"

**5. Label `aprovado` diz "Em Aprovação" mas label `em_processamento` diz "Em Lançamento" — invertido**
- `STATUS_LABELS`: `aprovado: 'Em Aprovação'`, `em_processamento: 'Em Lançamento'`
- Na realidade do fluxo: `aprovado` é quando o backoffice assumiu e está lançando no Fluig, `em_processamento` é quando está em aprovação no Fluig
- Mas isso parece ser intencional baseado no uso — **não alterar**, apenas documentar

**6. `DailyInsightCard` não conta `pendingCiencia` no `totalPending`**
- Linha 33: `const totalPending = pendingCorrections + pendingAcceptance + pendingNfBoleto + pendingInfoRequests + pendingJustificativas`
- Falta `pendingCiencia` — o card mostra "Tudo em dia" mesmo quando há solicitações canceladas pendentes de ciência

### Mudanças

#### Arquivo: `src/types/index.ts`
- Alterar `STATUS_LABELS.cancelado` de `'Cancelada pelo Solicitante'` para `'Cancelada'`
- Alterar `STATUS_ACTION_LABELS.cancelado` de `'Cancelada pelo solicitante'` para `'Esta solicitação foi cancelada'`

#### Arquivo: `src/hooks/useDashboardMetrics.ts`
- Incluir `aguardando_aceite`, `oc_ac_emitida`, `aguardando_nf_boleto`, `nf_boleto_enviados`, `enviado_pagamento`, `aguardando_execucao` no array `inProgressStatuses`

#### Arquivo: `src/pages/MinhasSolicitacoes.tsx`
- Adicionar `oc_ac_emitida` ao filtro `oc_emitida` (junto com `aguardando_aceite`)
- Mover `enviado_pagamento` de `enviadas` para `concluidas` para consistência com Backoffice
- Atualizar `statusCounts` para refletir as mesmas mudanças

#### Arquivo: `src/pages/Backoffice.tsx`
- Nenhuma mudança necessária — já está consistente internamente

#### Arquivo: `src/components/DailyInsightCard.tsx`
- Adicionar `pendingCiencia` como prop e incluir no cálculo de `totalPending`
- Adicionar insight text para ciência pendente

#### Arquivo: `src/pages/Dashboard.tsx`
- Passar `pendingCiencia` para `DailyInsightCard`

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `src/types/index.ts` | Label `cancelado` → "Cancelada" |
| `src/hooks/useDashboardMetrics.ts` | `inProgressStatuses` completo |
| `src/pages/MinhasSolicitacoes.tsx` | Adicionar `oc_ac_emitida`, mover `enviado_pagamento` |
| `src/components/DailyInsightCard.tsx` | Incluir `pendingCiencia` |
| `src/pages/Dashboard.tsx` | Passar `pendingCiencia` ao DailyInsightCard |

