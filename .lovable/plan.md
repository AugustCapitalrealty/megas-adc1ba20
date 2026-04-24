## Realinhamento de Monitoramento OC x NF

Reescrita da semântica dos cards para refletir o ecossistema real (Backoffice ↔ Solicitante), adição do card "Justificadas", limpeza da Distribuição Operacional e remoção de OCs canceladas/aprovadas pelo backoffice da tela.

### 1. Nova semântica dos 4 cards (substitui os 3 atuais)

| Card | Significado real | Origem do dado |
|---|---|---|
| **OC Liberada** | OC já está com o **fornecedor** — backoffice já enviou. | `solicitacao.status` ∈ `liberado_fornecedor`, `enviado_fornecedor`, `aguardando_execucao`, `aguardando_nf_boleto`, `nf_boleto_enviados`, `enviado_pagamento` |
| **OC Não Liberada** | OC está com o **solicitante** aguardando aceite para o backoffice enviar ao fornecedor. | `solicitacao.status` ∈ `aguardando_aceite`, `oc_ac_emitida`, `em_processamento` |
| **Pend. Justificativa** | OCs que ainda precisam de justificativa pela regra (mês anterior sem NF, ou mês atual após dia 23 sem previsão futura). | `computeOcStatus(...) === 'pendente_justificativa'` |
| **Justificadas** *(novo)* | OCs que já têm justificativa registrada com previsão futura válida e por enquanto não exigem ação. | `computeOcStatus(...) === 'adiado'` (já tem `previsao_nf` futura no `oc_acompanhamento`) |

Cada card continua sendo **clicável** e atua como filtro: ao selecionar, recorta a Distribuição Operacional, Aging Médio, Valor em Aberto, Top Ofensores e a tabela.

### 2. Remover canceladas e aprovadas pelo backoffice

No fetch do `useMonitoramentoOC.ts`, ampliar o filtro de exclusão:

```ts
// excluir grupos que não pertencem mais a "OC viva"
if (sol.status === 'concluida') return;
if (sol.status === 'cancelado') return;        // já cancelado
if (sol.status === 'rejeitado') return;        // rejeitado pelo backoffice
if (sol.cancelamento_pendente && sol.cancelamento_aprovado_em) return; // se houver flag
// Também filtrar OCs cujo grupo contenha último acompanhamento = 'cancelamento_aprovado'
```

Adicionalmente, no nível de OC: se o **último** `oc_acompanhamento.tipo_acao === 'cancelamento_aprovado'`, esse grupo deixa de aparecer na tela. Hoje esses casos seguem renderizados como `cancel_solicitado` / `cancelado`.

Resultado: a aba **Justificadas** fica limpa (só `adiado`), e o segmento `cancel.` desaparece da Distribuição.

### 3. Limpar Distribuição Operacional

A barra `OcDistributionBar` mostra hoje 5 segmentos. Reduzir para apenas 2:

- **Pendente justificativa** (vermelho)
- **Adiado** (azul)

Remover: `em prazo`, `atenção`, `cancel.` (canceladas saem da tela; "em prazo" e "atenção" não agregam valor já que estão refletidos nos cards superiores).

A `OcDistribution` passa de:
```ts
{ em_prazo, atencao, pendente, adiado, cancel }
```
para:
```ts
{ pendente, adiado }
```

### 4. Mapeamento card ↔ aba

Ao clicar em um card, a aba ativa muda para a mais coerente:

| Card | Aba destino |
|---|---|
| OC Liberada | Justificadas |
| OC Não Liberada | Pendência (se houver) senão Justificadas |
| Pend. Justificativa | Pendência |
| Justificadas | Justificadas |

### 5. Layout

- Grid dos cards: `grid-cols-2 lg:grid-cols-4` (4 cards agora).
- Tooltips dos cards atualizados com a nova explicação (ex.: "OCs já entregues ao fornecedor pelo backoffice").
- Manter o componente `SlaKpiCard` com `active` highlight e click toggle.

### 6. Arquivos a serem modificados

1. **`src/hooks/useMonitoramentoOC.ts`**
   - Excluir `cancelado` / `rejeitado` no fetch.
   - Excluir grupos cujo último `oc_acompanhamento` seja `cancelamento_aprovado`.
   - Reduzir `OcDistribution` para `{ pendente, adiado }` em `computeAggregates` e nos `useMemo`s.

2. **`src/pages/MonitoramentoOC.tsx`**
   - Tipo `CardFilter`: `'todas' | 'liberada' | 'nao_liberada' | 'pendente' | 'justificadas'`.
   - Conjuntos de status do solicitação:
     ```ts
     const STATUS_LIBERADA = new Set(['liberado_fornecedor','enviado_fornecedor','aguardando_execucao','aguardando_nf_boleto','nf_boleto_enviados','enviado_pagamento']);
     const STATUS_NAO_LIBERADA = new Set(['aguardando_aceite','oc_ac_emitida','em_processamento']);
     ```
   - Recalcular KPIs com base nesses conjuntos (não mais `total_ativas - sem_nf`).
   - Atualizar `cardFilteredGroups` com a nova lógica.
   - Adicionar 4º `SlaKpiCard` "Justificadas" (tone `info`/azul).
   - Remover o segmento `cancel` da tabela e remover `TAB_STATUS.justificadas` referências a `cancel_solicitado`/`cancelado`.

3. **`src/components/monitoramento/OcDistributionBar.tsx`**
   - Reduzir `SEGMENTS` para `pendente` e `adiado` apenas.

### 7. Pontos técnicos

- O hook `useMonitoramentoOC` já lê `solicitacoes.status` — basta usar. Nenhuma migration necessária.
- `computeOcStatus` continua válido para detectar "adiado" vs "pendente_justificativa" no nível da OC. O card "Justificadas" usa o mesmo critério já existente (`adiado`).
- Manter o badge "Recorte" e o badge de filtro de empreendimento já implementados.
- Atualizar memory `mem://features/pendencies-oc-nf` ao final para refletir a nova taxonomia dos cards.
