## Calendário de Serviços (Monitoramento)

Hoje, quando o solicitante libera uma OC de **serviço**, ele informa a `data_execucao_servico` (já salva no banco). Para o backoffice/operação saber "o que está previsto para o dia 10", precisa abrir solicitação por solicitação. Vamos criar uma visão de calendário em **Monitoramento** que mostra exatamente isso, reaproveitando todos os componentes que já existem.

### Onde fica

Adicionar uma **3ª aba** em `Monitoramento`, ao lado de "OC × NF" e "Projuris":

```text
[ OC × NF ]  [ Projuris ]  [ Calendário de Serviços ]
```

### Layout

```text
┌────────────────────────────────────────────────────────────────┐
│  ◀  Abril 2026  ▶          Empreendimento ▾   Status ▾   Hoje │
│  • OC enviada   • Aguardando NF   • Executado  • Agendado     │
├────────────────────────────────────────────────────────────────┤
│  Seg   Ter   Qua   Qui   Sex   Sáb   Dom                       │
│   1     2     3     4     5     6     7                        │
│         ●●          ●●●               ●                        │
│   8     9    10    11    12    13   14                         │
│         ●     ●●●●  ●            ●                             │
│  ...                                                          │
└────────────────────────────────────────────────────────────────┘
```

- Cada **dia** mostra até 3 chips coloridos (com `+N` se houver mais), cada chip = 1 serviço previsto/executado naquela data.
- Cor do chip = status atual da solicitação (ver legenda abaixo).
- **Clique no dia** abre um *Sheet* lateral listando todos os serviços daquele dia (com mini-cards: protocolo, fornecedor, valor, status, ações "Ver detalhes / Histórico").
- **Clique no chip** já abre direto o `OCDetalhesModal` (componente que já usamos em OC × NF).

### Painel de KPIs no topo (reaproveitando `SlaKpiCard`)

Reutilizando o estilo já consolidado:

| KPI | Definição |
|---|---|
| **Hoje** | Serviços com `data_execucao_servico = hoje` |
| **Próximos 7 dias** | Serviços agendados para os próximos 7 dias |
| **Atrasados** | Data passou e status ainda não chegou em `aguardando_nf_boleto` ou posterior |
| **Aguardando NF** | Serviços já executados (data ≤ hoje) e status `aguardando_nf_boleto` |

Cards são clicáveis e filtram o calendário (mesmo padrão do "OC × NF").

### Cores / Legenda (alinhadas com o ecossistema existente)

| Cor | Status | Significado |
|---|---|---|
| 🟦 azul | `aguardando_aceite`, `oc_ac_emitida` | OC Não liberada (com solicitante) |
| 🟢 verde | `liberado_fornecedor`, `enviado_fornecedor` | OC enviada ao fornecedor |
| 🟡 amarelo | `aguardando_execucao` futuro | Serviço **agendado** (data > hoje) |
| 🟠 laranja | `aguardando_execucao` vencido | Serviço **atrasado** (data ≤ hoje, sem NF) |
| 🟣 roxo | `aguardando_nf_boleto` | Aguardando NF |
| ⚪ cinza | `nf_boleto_enviados`, `enviado_pagamento`, `concluida` | Concluído / em pagamento |
| 🔴 vermelho | `cancelamento_pendente = true` ou `cancelado` | Cancelamento |

Mesmas cores do design system (`bg-success`, `bg-warning`, `bg-destructive`, `bg-blue-*`, `bg-purple-*`) já em uso na tela de Monitoramento.

### Filtros (reaproveitando padrão existente)

- **Empreendimento**: mesmo `Select` da OC × NF, respeitando `useUserEmpreendimentos`.
- **Status**: multi-select com os status acima.
- **Mês**: navegação ◀ ▶ + botão "Hoje".
- **Modo**: toggle Mês / Semana / Lista (Mês como default).

### Filtro de dados (somente o que faz sentido)

A consulta busca solicitações onde:
- `tipo_entrega = 'servico'` **e** `data_execucao_servico IS NOT NULL`
- `status` ≠ `cancelado` e ≠ `rejeitado` (cancelados aparecem no filtro opcional)
- Empreendimento dentro do `user_empreendimentos`
- `data_execucao_servico` dentro do mês visível (± 7 dias para preencher bordas da grade)

### Mini-card no Sheet do dia

Reutiliza o estilo `SolicitacaoCard` simplificado:

```text
┌─────────────────────────────────────────┐
│ #2026000397   Mega Curitiba             │
│ Fornecedor: AQUAPRO PURIFICACAO         │
│ Valor: R$ 880,08    [Aguardando NF]    │
│ Solicitante: Felipe Eduardo             │
│ Aging: 5d desde a execução              │
│ ── [ Ver detalhes ]  [ Histórico ]      │
└─────────────────────────────────────────┘
```

Botão "Ver detalhes" abre o `OCDetalhesModal` já existente.

## Componentes / Arquivos

### Novos
- `src/components/monitoramento/calendario/CalendarioServicos.tsx` — container principal (KPIs + grade + filtros).
- `src/components/monitoramento/calendario/CalendarioGrid.tsx` — grade mensal (usa `date-fns` para gerar dias).
- `src/components/monitoramento/calendario/DiaServicosSheet.tsx` — Sheet lateral com lista do dia.
- `src/components/monitoramento/calendario/ServicoChip.tsx` — chip colorido com tooltip.
- `src/hooks/useCalendarioServicos.ts` — hook que consulta `solicitacoes` filtrando `tipo_entrega = 'servico'` e `data_execucao_servico` no range visível, agrupa por dia e calcula KPIs.

### Modificados
- `src/pages/MonitoramentoOC.tsx` — adicionar 3ª `TabsTrigger` "Calendário de Serviços" e seu `TabsContent` renderizando `<CalendarioServicos />`.

### Reaproveitado (sem alterações)
- `SlaKpiCard` — KPIs do topo
- `OCDetalhesModal` — ao clicar num serviço
- `Calendar` (shadcn DayPicker) **não** é o ideal aqui (ele é date picker); construímos a grade mensal manualmente com `date-fns` (`startOfMonth`, `endOfMonth`, `eachDayOfInterval`) que já está em uso no projeto.
- `Sheet`, `Dialog`, `Badge`, `Tooltip` — shadcn já instalados.
- `useUserEmpreendimentos`, `EMPREENDIMENTO_LABELS`, `STATUS_LABELS` — já existentes.

## Regras de status visual (para cada serviço)

```text
function statusVisual(sol):
  hoje = today()
  exec = sol.data_execucao_servico
  if sol.status in ['cancelado','rejeitado']        → 'cancelado'
  if sol.cancelamento_pendente                       → 'cancel_solicitado'
  if sol.status in ['concluida','enviado_pagamento','nf_boleto_enviados']
                                                     → 'concluido'
  if sol.status === 'aguardando_nf_boleto'           → 'aguardando_nf'
  if sol.status === 'aguardando_execucao':
     if exec > hoje                                  → 'agendado'
     else                                            → 'atrasado'
  if sol.status in ['enviado_fornecedor','liberado_fornecedor']
                                                     → 'oc_enviada'
  if sol.status in ['aguardando_aceite','oc_ac_emitida']
                                                     → 'oc_nao_liberada'
  default                                            → 'em_processamento'
```

Cada um mapeia para uma cor da legenda acima.

## Banco de dados

**Nenhuma migração necessária.** As colunas `data_execucao_servico`, `tipo_entrega`, `status` e `cancelamento_pendente` já existem em `public.solicitacoes`, e as RLS atuais já permitem que solicitantes vejam suas próprias e usuários do empreendimento vejam as do empreendimento.

## Resultado

Ao abrir Monitoramento → "Calendário de Serviços", o usuário vê todos os serviços previstos do mês de uma vez, identifica visualmente o que está agendado/atrasado/aguardando NF, e consegue clicar para ver detalhes — sem precisar abrir solicitação por solicitação.
