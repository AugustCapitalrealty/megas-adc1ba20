

## Diagnóstico — Discrepância no "Backlog Crítico"

### Problema identificado

**Root cause**: O KPI "Backlog Crítico" e a tabela de detalhamento usam **conjuntos de dados completamente diferentes**:

1. **KPI "Backlog Crítico"** (linha 182-220 em `useEficienciaDashboard.ts`):
   - Query: solicitações **abertas** (não concluídas/rejeitadas/canceladas)
   - Sem `numero_chamado_fluig`
   - Sem nenhum `documento_emitido`
   - Com >15 dias úteis desde criação até **hoje**
   - **Representa backlog atual não resolvido**

2. **Drilldown da tabela** (linha 154-165 em `DashboardEficiencia.tsx`):
   - Filtra `entries` (solicitações que **já têm** `documento_emitido` no período de filtro)
   - Condição: `lead_time_dias > 15`
   - **Representa solicitações já concluídas que levaram >15 dias**

### Solução proposta

**Opção A — Desabilitar drilldown do "Backlog Crítico"** (mais simples):
- Remover `onClick` do KPI "Backlog Crítico"
- Adicionar tooltip explicando que é uma métrica de backlog atual, não histórico
- Manter apenas drilldown para KPIs baseados em `entries` (Lead Time, Same-Day, Vazão)

**Opção B — Criar tabela separada para Backlog Crítico** (mais complexo):
- Adicionar query separada no hook para buscar detalhes das solicitações do backlog
- Ao clicar no KPI, trocar para uma "view" diferente mostrando:
  - Protocolo
  - Data criação
  - Dias desde criação
  - Status atual
  - Empreendimento
- Link para `/minhas-solicitacoes` com filtro aplicado

### Recomendação

**Opção A**: mais alinhada com a semântica do indicador. "Backlog Crítico" é uma métrica de alerta sobre solicitações travadas, não uma dimensão de análise histórica como os outros KPIs.

---

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/pages/DashboardEficiencia.tsx` | Remover `onClick` do card "Backlog Crítico" + adicionar tooltip explicativo |

