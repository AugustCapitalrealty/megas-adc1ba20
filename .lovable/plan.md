# Plano de Melhorias Priorizadas

## Contexto Importante: Separacao de Conceitos

O usuario levantou um ponto critico: existem **dois tempos distintos** no processo que nao devem ser misturados:

1. **Tempo do Backoffice (SLA interno)** - Da chegada da solicitacao ate a emissao da OC/AC. Este e o Dashboard SLA existente (`/admin/sla`), visivel apenas para Admin. Meta: 3 dias uteis.
2. **Tempo Ponta-a-Ponta (Lead Time)** - Da criacao da solicitacao ate o solicitante receber a OC. Inclui tempo do solicitante corrigindo, enviando NF, etc. Este e o **novo** Dashboard de Eficiencia proposto.

A metrica "38 processadas em menos de 1 dia" refere-se ao tempo do Backoffice (item 1), nao ao processo completo.

---

## Prioridade 1 (Critica): Painel de Solicitacoes Funcional

**Problema:** O Dashboard operacional (`/`) continua zerado para alguns usuarios. E a porta de entrada do sistema e precisa funcionar.

### Acoes:

**A. Diagnostico em tempo real** (`src/hooks/useDashboardMetrics.ts`)

- Adicionar log detalhado no console com: `viewMode`, `isBackofficeOrAdmin`, `empreendimentos`, quantidade retornada
- Verificar se `useAuth` retorna `isBackofficeOrAdmin` como `undefined` inicialmente (race condition)
- Garantir que o `enabled` do useQuery aguarde TODOS os dados de permissao carregarem

**B. Fallback visual** (`src/pages/Dashboard.tsx`)

- Se `metrics.total === 0` e `viewMode === 'geral'` e usuario e backoffice/admin, exibir card de diagnostico: "Nenhuma solicitacao encontrada. Verifique se os filtros estao corretos."
- Adicionar botao "Recarregar" visivel ao lado do toggle Minhas/Geral

**C. Acoes Pendentes claras para ambos os lados**

- **Para o Solicitante**: Destacar correcoes pendentes, OCs aguardando aceite, NF/Boleto pendentes (ja implementado via PendingActionsCard)
- **Para o Backoffice**: Adicionar KPIs especificos no modo "Geral":
  - "Novas (Em Fila)" - solicitacoes com status `recebido` aguardando analise
  - "Em Analise" - solicitacoes sendo trabalhadas
  - "Aguardando Solicitante" - devolvidas para correcao ou informacoes
  - "Em Aprovacao" - no fluxo de aprovacao

---

## Prioridade 2 (Alta): Dashboard de Eficiencia (Lead Time Ponta-a-Ponta)

### Escopo

Novo painel focado em **provar o valor da plataforma** comparando o lead time completo (criacao ate OC entregue). Acessivel para Backoffice e Admin.

### A. Os 4 KPIs Principais


| KPI                | Calculo                                                                                            | Visual                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Lead Time Medio    | Media de dias uteis entre `created_at` e data de emissao da OC (`numero_chamado_fluig` preenchido) | Numero grande + seta comparativa vs periodo anterior |
| % Same-Day (Flash) | % onde OC foi emitida no mesmo dia da criacao                                                      | Icone de raio + percentual                           |
| Backlog Critico    | Solicitacoes abertas ha > 15 dias sem OC                                                           | Card vermelho, clicavel para filtrar tabela          |
| Volume vs Vazao    | Entradas (novas) vs Saidas (OCs emitidas) no periodo                                               | Dois numeros lado a lado com indicador de equilibrio |


### B. Graficos

**Grafico 1: Histograma de Dispersao**

- Recharts BarChart com faixas: 0-1d, 2-5d, 6-10d, 11-15d, 15-30d, 30d+
- Dados calculados a partir das solicitacoes com OC emitida no periodo
- Objetivo: mostrar a concentracao na faixa 0-5 dias

**Grafico 2: Evolucao Temporal (Year-over-Year)**

- Recharts LineChart com media semanal de lead time
- Checkbox "Comparar com Ano Anterior" que sobrepoe linha de 2025 vs 2026
- Requer dados historicos (solicitacoes de 2025 importadas ou calculadas do Fluig)

### C. Tabela de Drill-down

- Colunas: Protocolo, Data Abertura, Data OC, Tempo Decorrido, Empreendimento, Status
- Formatacao condicional: verde (< 24h), vermelho (> 10 dias)
- Responde a cliques nos KPIs e graficos (filtro dinamico)

### Implementacao Tecnica

**Novo arquivo:** `src/pages/DashboardEficiencia.tsx`

- Nova rota: `/admin/eficiencia` (acessivel para backoffice e admin)
- Adicionar ao menu Admin no `AppLayout.tsx`

**Novo hook:** `src/hooks/useEficienciaDashboard.ts`

- Query que busca solicitacoes com `numero_chamado_fluig IS NOT NULL` (OC emitida)
- Calcula lead time: diferenca em dias uteis entre `created_at` e data do historico onde `numero_chamado_fluig` foi preenchido
- Agrupa por faixas para histograma
- Calcula medias semanais para grafico temporal

**Nota sobre dados de 2025:** Para o comparativo Year-over-Year, sera necessario ter dados de 2025 no banco. Se nao existirem, o grafico mostrara apenas 2026 com uma nota "Dados historicos indisponiveis para comparacao".

---

## Prioridade 3 (Alta): Backlog de Correcoes Rapidas

### UX-03: Truncagem de Texto

- Aplicar `truncate` ou `line-clamp` nos nomes de arquivos nos componentes `AnexoCard.tsx` e cards de solicitacao
- CSS: `max-width` + `overflow: hidden` + `text-overflow: ellipsis`

### UI-05: Header do Modal (Backoffice)

- No modal de detalhes do Backoffice, adicionar `gap` ou `padding-right` entre o valor (R$) e o botao "X" de fechar

### UX-05: Confirmacao ao Rejeitar

- Adicionar modal de confirmacao com campo obrigatorio de motivo ao clicar em "Rejeitar" no Backoffice
- Usar o `ActionModal` existente com variant `destructive`

### UI-03: Botoes de Download

- Substituir botoes "Baixar" por icones de download (`Download` do lucide) nos cards de anexo do solicitante
- &nbsp;

### UX-07: Link "Ver OC Original" nas Garantias

- No card de garantia em `GarantiasVigentes.tsx`, adicionar botao/link que navega para a solicitacao original em MinhasSolicitacoes

### UX-08: Filtro por KPI nas Garantias

- Tornar os KpiCards clicaveis, passando o filtro de status correspondente ao clicar

---

## Resumo de Arquivos e Estimativas


| ID      | Arquivo(s)                                                           | Acao                                                | Esforco |
| ------- | -------------------------------------------------------------------- | --------------------------------------------------- | ------- |
| BUG-01  | `useDashboardMetrics.ts`, `Dashboard.tsx`                            | Debug + robustez + KPIs backoffice                  | Medio   |
| FEAT-01 | `DashboardEficiencia.tsx` (novo), `useEficienciaDashboard.ts` (novo) | Dashboard completo com 4 KPIs + 2 graficos + tabela | Alto    |
| FEAT-02 | `useEficienciaDashboard.ts`                                          | Calculo de lead time ponta-a-ponta                  | Medio   |
| UX-03   | `AnexoCard.tsx`, CSS                                                 | Truncagem de nomes                                  | Baixo   |
| UI-05   | `Backoffice.tsx`                                                     | Spacing no header do modal                          | Baixo   |
| UX-05   | `Backoffice.tsx`                                                     | Modal de confirmacao ao rejeitar                    | Medio   |
| UI-03   | `MinhasSolicitacoes.tsx`                                             | Icones no lugar de botoes                           | Baixo   |
| QA-01   | Migration SQL                                                        | Correcao ortografica                                | Minimo  |
| UX-07   | `GarantiasVigentes.tsx`                                              | Link para OC original                               | Baixo   |
| UX-08   | `GarantiasVigentes.tsx`                                              | KPI cards clicaveis                                 | Medio   |
| NAV     | `AppLayout.tsx`, `App.tsx`                                           | Rota e menu para Dashboard Eficiencia               | Baixo   |


### Ordem de Execucao Sugerida

1. **BUG-01** - Painel operacional funcional (critico, bloqueia uso diario)
2. **QA-01 + UX-03 + UI-05 + UI-03** - Correcoes rapidas em lote
3. **UX-05** - Confirmacao ao rejeitar (prevencao de erro)
4. **UX-07 + UX-08** - Melhorias na pagina de Garantias
5. **FEAT-01 + FEAT-02** - Dashboard de Eficiencia completo (maior esforco)