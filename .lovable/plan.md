

User wants a comparison on the efficiency panel between OCs that have been invoiced (faturada) vs still open (em aberto).

Let me think about what data we have:
- `documentos_emitidos` — OCs emitted (tipo_documento = 'OC')
- `documentos_fiscais` — NF/Boleto uploaded; has `baixa_financeiro_em` indicating sent to payment
- `solicitacoes` — has status field

Definition of "faturada" = OC has at least one NF (documento_fiscal tipo='NF') uploaded
Definition of "em aberto" = OC emitted but no NF yet

This data is already available in `useEficienciaDashboard` and `MonitoramentoOC` flows. Need to add a new section/widget on `DashboardEficiencia.tsx`.

Plan structure:
- New KPI card pair + visual comparison (donut or stacked bar) on Dashboard Eficiência
- Respect existing filters (date range, empreendimento)
- Add to `useEficienciaDashboard` hook a new computation returning `{ faturadas, emAberto, totalOCs, percentFaturada }` plus maybe aging buckets for em aberto

Keep concise.

## Comparativo OC Faturada vs Em Aberto — Dashboard Eficiência

### O que vai aparecer

Nova seção no `DashboardEficiencia.tsx` (entre os KPIs principais e o gráfico de Retrabalho), com:

**1. Card duplo de comparativo**
```text
┌─────────────────────────────────────────────────────┐
│  OCs Faturadas vs Em Aberto                         │
│                                                     │
│   ✅ 142 Faturadas (68%)    ⏳ 67 Em Aberto (32%)   │
│   ████████████████████░░░░░░░░░░  (barra empilhada) │
│                                                     │
│   Em aberto por idade:                              │
│   • 0-15 dias: 28    • 16-30: 22    • >30: 17 ⚠   │
└─────────────────────────────────────────────────────┘
```

**2. Definições de negócio**
- **Faturada** = OC emitida que possui ao menos uma NF anexada em `documentos_fiscais` (tipo `NF`)
- **Em Aberto** = OC emitida sem NF correspondente
- **Idade** = dias corridos desde emissão da OC (`documentos_emitidos.created_at`)
- Respeita filtros ativos: período (data emissão da OC), empreendimento

### Mudanças

| Arquivo | O quê |
|---|---|
| `src/hooks/useEficienciaDashboard.ts` | Adicionar query/cálculo: para cada OC em `documentos_emitidos` no período, verificar se há NF em `documentos_fiscais`. Retornar `ocStatus: { faturadas, emAberto, total, percentFaturada, agingBuckets: { ate15, de16a30, mais30 } }` |
| `src/pages/DashboardEficiencia.tsx` | Nova seção `Card` com barra empilhada (já usa Recharts) + 3 mini-stats de aging. Posicionar acima de "Retrabalho" |

### Detalhes técnicos
- Query: `documentos_emitidos` filtrado por `tipo_documento = 'OC'` + período + join indireto com solicitacoes para filtro de empreendimento
- Para cada OC, contar NFs: `documentos_fiscais.solicitacao_id = de.solicitacao_id AND tipo = 'NF'`
- Aging: `differenceInDays(now, de.created_at)` apenas para as em aberto
- Ícone alerta nos `>30 dias` (já existe semântica de crítico no dashboard)

