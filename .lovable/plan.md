# Refatoração do Dashboard de SLA + Correção do cálculo

## Diagnóstico do caso 2026000159 (16 dias úteis — incorreto)

Analisando a timeline real da solicitação no histórico, este é o que aconteceu:

| # | Data | Evento |
|---|------|--------|
| 1 | 26/02 14:53 | Criação (`recebido`) — **inicia contagem** |
| 2 | 26/02 16:58 | Backoffice assume → `aprovado` |
| 3 | 02/03 12:13 | **Número Fluig 150857 adicionado** — deveria parar o SLA aqui (~3,7 dias úteis) |
| 4 | 24/03 18:35 | Backoffice solicita informações → `aguardando_informacoes` |
| 5 | 30/03 14:32 | Solicitante responde → volta a `recebido` |
| 6 | 07/04 19:57 | OC emitida → `aguardando_aceite` |
| 7 | 16/04 13:38 | Solicitante libera → `aguardando_execucao` (estado atual) |

A função `calcular_sla_solicitacao` faz duas coisas erradas a partir do evento #5:
1. **Zera o `data_fluig_rm`** quando volta de `aguardando_informacoes`. Como o Fluig já foi adicionado lá no #3, ele não é redisparado, e a contagem **nunca encontra um "fim"**.
2. Continua acumulando porque o status atual (`aguardando_execucao`) não está na lista de estados que param a contagem (`pendente_correcao, aguardando_informacoes, concluida, cancelado, rejeitado, em_processamento`).

Resultado: o SLA conta de 30/03 até hoje (~16 dias úteis) num caso que já estava encerrado para o backoffice desde 02/03. **O correto eram 3,7 dias úteis** (contando até o número Fluig original).

Verifiquei outros 14 casos abertos: todos estão entre 0,5 e 3 dias. O bug só atinge solicitações que tiveram ida-volta para `aguardando_informacoes` **depois** de o Fluig já ter sido lançado.

## O que vou corrigir

### 1. Corrigir a função `calcular_sla_solicitacao` (SQL)

Mudanças no algoritmo:
- **Não zerar `data_fluig_rm` ao reiniciar contagem.** Se o Fluig já foi adicionado uma vez, o SLA do backoffice está encerrado para sempre — qualquer ida-volta posterior é responsabilidade do solicitante ou de outras áreas, não do backoffice.
- **Adicionar status pós-OC à lista de "fim"**: `aguardando_aceite`, `oc_ac_emitida`, `liberado_fornecedor`, `enviado_fornecedor`, `aguardando_execucao`, `aguardando_nf_boleto`, `nf_boleto_enviados`, `enviado_pagamento`. Quando a OC é emitida, o trabalho do backoffice de "primeiro atendimento" acabou — o SLA não deve mais correr.
- **Garantir que, se já existe um `data_fluig_rm`, novos eventos não acumulam tempo**, mesmo passando por `aguardando_informacoes`.

Resultado esperado: o protocolo 2026000159 passa a marcar **3,7 dias úteis** (até 02/03 12:13).

### 2. Refatoração visual do Dashboard de SLA

Hoje os 5 cards de KPI são planos, com cores fracas (`bg-emerald-50/30`), e a página parece mais um relatório do que um painel de meta. Vou redesenhar para o backoffice acompanhar o atingimento da meta de **80% no prazo (≤ 3 dias úteis)** de forma visual.

#### 2.1 Hero "Atingimento da meta"
Banner grande no topo, em cima dos KPIs, com:
- **Gauge/ring chart** (SVG) mostrando `% no prazo` vs meta de 80%, com cor que vira verde (≥80%), âmbar (60–79%) ou vermelho (<60%).
- Número grande no centro: `87%` (No prazo).
- Subtexto: "Meta: 80% em até 3 dias úteis" + microdelta vs. período anterior (ex: ▲ +5% vs. 30 dias anteriores).
- Botões rápidos de período: "7d / 30d / 90d / Mês atual / YTD".

#### 2.2 KPI cards mais densos e visuais
- Reorganizar em 4 cards (combinar "Total" e "Tempo médio" no hero) com **mini sparkline** (barra simples) mostrando tendência diária dos últimos 14 dias.
- Cor sólida na lateral esquerda (`border-l-4`) ao invés de fundo pastel inteiro — mais limpo e mais legível.
- Cada card é clicável e aplica o filtro correspondente (`No Prazo`, `Atenção`, `Estourado`).
- Card "Total" mostra delta absoluto vs. período anterior.

#### 2.3 Distribuição visual (stacked bar horizontal)
Logo abaixo dos cards, uma barra horizontal única de 100% segmentada em **verde / âmbar / vermelho** com os percentuais embutidos. Permite ver a distribuição de uma olhada, sem precisar comparar 4 números.

#### 2.4 Filtros mais leves
- Mover filtros para uma toolbar sticky compacta (uma linha só), substituindo o card grande atual.
- Período padrão: "Últimos 30 dias" como chip removível, igual padrão Linear/Stripe.
- Adicionar filtro **"Responsável atual"** (quem está com a solicitação no backoffice) para apoiar acompanhamento por pessoa.

#### 2.5 Tabela mais útil
- Adicionar coluna **"Tempo até Fluig"** (= tempo SLA real do backoffice) e **"Última atualização"** (relativa: "2h atrás").
- Linhas estouradas ganham `bg-destructive/5` e ícone de alerta no protocolo.
- Ordenação clicável por coluna (atualmente é fixa por created_at).
- Densidade compacta padrão + toggle para "confortável" (persistido em localStorage, padrão do app).

#### 2.6 Top ofensores
Pequeno card lateral à direita da tabela (ou abaixo) listando os **5 protocolos mais estourados** do período, com link direto. Ajuda o coordenador a agir.

## Detalhes técnicos

**Banco:**
- Nova migração reescrevendo `public.calcular_sla_solicitacao` com a lógica corrigida (preservando `RETURNS json` e a mesma estrutura de saída para não quebrar `get_sla_dashboard`).
- Atualizar também `public.get_sla_timeline` (usada pelo `SlaTimelineModal`) para refletir os mesmos novos eventos de "fim" — caso contrário a timeline visual mostra coisas diferentes do KPI.

**Frontend:**
- `src/pages/DashboardSLA.tsx` — refatoração visual completa.
- Novo `src/components/sla/MetaGauge.tsx` — ring chart SVG (sem libs).
- Novo `src/components/sla/SlaDistributionBar.tsx` — barra horizontal stacked.
- Novo `src/components/sla/SlaKpiCard.tsx` — card padronizado com sparkline (reaproveita `KpiSparkline.tsx` existente).
- Novo `src/components/sla/TopOfensoresCard.tsx`.
- `src/hooks/useSlaDashboard.ts` — adicionar:
  - `tendenciaDiaria: { date: string; total: number; estourado: number }[]` para sparkline.
  - `comparacaoPeriodoAnterior: { noPrazoDelta: number; totalDelta: number }`.
  - `topOfensores: SlaData[]` (top 5 por dias_uteis_backoffice desc).
- Tokens de cor: usar variáveis semânticas existentes (`success`, `warning`, `destructive`) ao invés de classes Tailwind diretas (`bg-emerald-*`, `bg-red-*`) — alinhamento com o design system do app.

**Sem mudanças** em: `SlaBadge.tsx`, `SlaTimelineModal.tsx` (apenas se beneficia da correção da função SQL), rotas, permissões.

## Não escopo
- Não vou mexer em outras páginas que consomem `calcular_sla_solicitacao` indiretamente — a correção só afeta números pra menos (mais corretos), não pra mais.
- Não vou criar tabela de meta configurável (80% é fixo no código por ora; pode virar um setting depois).
