## Melhorias no Calendário de Serviços

### Objetivos
1. Mostrar serviços com **período (início → fim)** quando a AC tem `data_inicio`/`data_fim` — não apenas o dia da execução.
2. Incluir solicitações **com previsão de execução mas ainda sem OC emitida**, destacando quando a previsão está em risco (perto de vencer / já vencida) — para o backoffice agir antes da data passar.

---

### 1. Buscar mais solicitações no hook (`useCalendarioServicos`)

Hoje o filtro pega apenas `tipo_entrega = 'servico'` com `data_execucao_servico` no range. Vamos ampliar para também incluir solicitações cuja **janela `data_inicio`–`data_fim`** intersecta o range visível, mesmo sem `data_execucao_servico`, e mesmo em status pré-OC.

- Nova query (OR lógico via duas chamadas em paralelo, já que PostgREST não suporta OR entre ranges complexos de forma limpa):
  - **A:** `data_execucao_servico` dentro do range (como hoje).
  - **B:** `tipo_contratacao = 'servicos'` com `data_inicio <= range.to` e `data_fim >= range.from`.
- Deduplicar por `id` ao montar a lista final.
- Selecionar também os campos novos: `data_inicio`, `data_fim`, `tipo_contratacao`.

### 2. Novo status visual: `previsao_sem_oc`

Adicionar ao tipo `CalendarioStatusVisual`:

- `previsao_sem_oc` — “Previsão sem OC” (cinza-âmbar).
- `previsao_sem_oc_risco` — “Previsão em risco (sem OC)” (vermelho hachurado), quando `data_execucao_servico` (ou `data_fim`) ≤ hoje + 3 dias úteis e ainda não há OC emitida.

Lógica em `computeCalendarioVisual`:
- Statuses **pré-OC** (`recebido`, `em_analise`, `aprovado`, `pendente_correcao`, `aguardando_informacoes`, `em_processamento`):
  - Se `data_execucao_servico` ou `data_fim` ≤ hoje → `previsao_sem_oc_risco` (vermelho).
  - Se ≤ hoje + 3 dias úteis → `previsao_sem_oc_risco` (laranja).
  - Caso contrário → `previsao_sem_oc` (cinza/âmbar).
- Demais regras seguem inalteradas.

Atualizar `VISUAL_LABEL`, `VISUAL_BG`, `VISUAL_DOT` no `ServicoChip.tsx` e a `LEGEND_ITEMS` em `CalendarioServicos.tsx`.

### 3. Renderizar faixas (intervalo início → fim) na grade

Hoje cada serviço vira um chip em **um único dia** (`data_execucao_servico`). Para AC com `data_inicio`/`data_fim`:

- Calcular para cada serviço a **data efetiva de exibição por dia**:
  - Se há `data_inicio` e `data_fim`: o serviço aparece em **todos os dias** do intervalo, com:
    - chip “▶ início” no `data_inicio`,
    - chip “▣ em andamento” nos dias intermediários (versão fina, só barra de cor),
    - chip “■ fim” no `data_fim`.
  - Se há apenas `data_execucao_servico`: comportamento atual (chip pontual no dia).
- Preservar a tooltip do chip (com #protocolo, fornecedor, status, valor) e adicionar “Período: dd/MM – dd/MM” quando aplicável.
- Manter o limite de 3 chips visíveis por dia + “+N mais”; chips de continuação contam como 0.5 (preferência: ocupam linha mais fina) para não estourar o card.

Implementação: na função que monta `byDay` no hook, expandir cada serviço-com-período em N entradas (uma por dia do intervalo dentro do range), marcando `posicao: 'inicio' | 'meio' | 'fim' | 'unico'`. O `id` original é preservado para deduplicar no Sheet do dia.

### 4. Sheet do dia e modal de detalhes
- `DiaServicosSheet`: agrupar por `id` para não duplicar linhas quando o serviço cobre vários dias; mostrar **“Período: dd/MM – dd/MM”** logo abaixo do fornecedor quando houver `data_inicio`/`data_fim`.
- Sem mudanças no `OCDetalhesModal`.

### 5. KPIs e filtros
- Novo KPI **“Sem OC (em risco)”** ao lado dos atuais: conta solicitações em status pré-OC cuja previsão (`data_execucao_servico` ou `data_fim`) é ≤ hoje + 3 dias úteis. Tom `destructive`.
- Substituir o KPI “Aguardando NF” não — manter os 4 atuais e adicionar este como 5º (grid passa a `lg:grid-cols-5`).
- Adicionar `previsao_sem_oc` e `previsao_sem_oc_risco` ao `Select` de status.
- O filtro KPI “Próximos 7 dias” passa a considerar também `data_fim` quando não houver `data_execucao_servico`.

### 6. Documentação visual
- Atualizar a Legenda incluindo os dois novos visuais e um indicador de “faixa = serviço com período” (linha contínua de exemplo).

---

### Detalhes técnicos

**Tipo `ServicoCalendario`** (em `useCalendarioServicos.ts`) ganha:
```ts
data_inicio: string | null;
data_fim: string | null;
tem_oc: boolean;          // derivado: status >= aprovado/oc_ac_emitida/...
posicao?: 'inicio' | 'meio' | 'fim' | 'unico'; // só nas entradas expandidas em byDay
```

**Detecção de “tem OC”**: usar o status (`['oc_ac_emitida','aguardando_aceite','liberado_fornecedor','enviado_fornecedor','aguardando_execucao','aguardando_nf_boleto','nf_boleto_enviados','enviado_pagamento','concluida']`). Não é necessário hit em `documentos_emitidos` — todas as 343 OCs hoje estão alinhadas com esses statuses.

**Risco (3 dias úteis)**: reusar `business-days.ts` (já existe `addBusinessDays`) ou comparação direta em dias corridos como fallback (manter consistência com `SLA Rules` da memória do projeto).

**Datas**: continuar usando comparação `YYYY-MM-DD` em string (sem TZ), como hoje.

---

### Arquivos a alterar
- `src/hooks/useCalendarioServicos.ts` — query ampliada, novo cálculo visual, expansão por intervalo.
- `src/components/monitoramento/calendario/ServicoChip.tsx` — labels/cores dos novos visuais, render de chips de início/meio/fim.
- `src/components/monitoramento/calendario/CalendarioGrid.tsx` — nada estrutural; consumir o novo `posicao` para estilo (chip fino no “meio”).
- `src/components/monitoramento/calendario/DiaServicosSheet.tsx` — dedup por `id`, mostrar período.
- `src/components/monitoramento/calendario/CalendarioServicos.tsx` — novo KPI, status no select, legenda.

Sem migrações de banco. Sem alterações em RLS.
