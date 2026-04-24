## Refatoração Monitoramento OC × NF — Bugs + UX

### Bugs Encontrados

Ao consultar o banco, identifiquei **dois tipos diferentes** de duplicação na tela:

| Caso | Exemplo | Causa real |
|---|---|---|
| **Mesma OC repetida** | `#2026000274 — 063787` aparece 2x | Linha duplicada em `documentos_emitidos` (sem constraint única). Bug de importação. |
| **Mesma solicitação com várias OCs** | `#2026000275 — 063813` e `063901` | Comportamento legítimo (contratos com múltiplas OCs), mas a UI lista cada OC como linha separada e o usuário lê como duplicação. |

Outros problemas observados:
- Sem indicação visual de que uma solicitação possui várias OCs.
- Lógica de "Pendente justificativa" mistura "OC vencida" com "sem previsão" — sem distinção visual.
- Tabela cresceu muito horizontalmente; Status badge longo (`Pend. justificativa`) quebra layout.
- Sem agrupamento, sem grupos de pendência por urgência, sem visão executiva (KPIs muito básicos).

### Correções de Bugs

1. **Constraint única** em `documentos_emitidos(solicitacao_id, numero_documento, tipo_documento)` para impedir novas duplicações.
2. **Migration de limpeza** removendo a linha duplicada existente (manter a mais antiga, deletar a mais recente).
3. **Dedupe defensivo no front** (`useMemo` com `Map` por `solicitacao_id|numero_documento`) caso ainda chegue duplicado pré-existente.

### Refatoração UI/UX (espelhando o trabalho do SLA Dashboard)

**Camada 1 — Hero de saúde do mês**
- `OcMetaGauge` (SVG ring): % de OCs do mês com NF emitida vs meta (ex: 90%).
- Card "Aging médio" + delta vs mês anterior.
- Card "Valor em aberto" (soma das OCs sem NF) com cor por faixa.

**Camada 2 — Distribuição visual**
- `OcDistributionBar`: barra empilhada horizontal mostrando proporção `Em prazo · Atenção (15-23d) · Pend. justificativa · Adiado · Cancel.`
- KPIs reformulados como `OcKpiCard` clicáveis com:
  - Mini-trend (sparkline 30d)
  - Delta % vs período anterior
  - Cores semânticas (verde/âmbar/vermelho)

**Camada 3 — Tabela inteligente**
- **Agrupamento por solicitação**: solicitações com >1 OC mostram uma única linha pai expansível com chip `2 OCs`. Ao expandir, lista as OCs filhas com aging individual.
- Status badge encurtado (ícone + texto curto), tooltip com o detalhe.
- Cor de fundo da linha por urgência (vermelho >23d sem justif., âmbar 15-23d, neutro <15d).
- Coluna "Solicitante" (avatar + nome) — hoje só destaca "sua solicitação" mas não mostra de quem é.
- Coluna "Última ação" (badge pequeno: "Justificado há 3d", "Sem ação", "Adiado p/ 04/05").

**Camada 4 — Painel lateral de ofensores**
- `TopOfensoresOC` card no topo direito: top 5 OCs com maior aging sem justificativa, com botão direto para justificar. (Mesmo padrão do SLA Dashboard)

**Camada 5 — Filtros refinados**
- Toolbar sticky.
- Chips de filtro ativo no estilo "remove" (igual SLA).
- Quick filters: "Sem justificativa", "Vencidas", "Adiadas para 05/26".

### Arquivos

**Novos**
- `src/components/monitoramento/OcMetaGauge.tsx`
- `src/components/monitoramento/OcKpiCard.tsx`
- `src/components/monitoramento/OcDistributionBar.tsx`
- `src/components/monitoramento/TopOfensoresOC.tsx`
- `src/hooks/useMonitoramentoOC.ts` (centralizar fetch + dedupe + agregações)

**Editados**
- `src/pages/MonitoramentoOC.tsx` — usar novos componentes, agrupar por solicitação, dedupe.
- Migration SQL — constraint única + cleanup do duplicado existente.

### Validação Pós-Implementação

- Confirmar que `#2026000274` agora aparece **uma única vez** com OC `063787`.
- Confirmar que `#2026000275` aparece como **uma linha pai expansível** com 2 OCs filhas (`063813`, `063901`).
- Confirmar que tentativa de inserir OC duplicada falha com erro de constraint.
- KPIs e gauge refletem corretamente os números de OCs (não de linhas).
