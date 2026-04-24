## Cards do OC x NF clicáveis como filtros + tabela centralizada

### 1. Tornar **todos** os 4 cards de KPI clicáveis e reativos

Hoje só "Sem NF" e "Pend. Justificativa" trocam de aba. O usuário quer que **todo card filtre** o conjunto e que **Aging Médio + Valor em Aberto reflitam o filtro do card** ativo.

Solução: introduzir um novo state `cardFilter` com 5 valores possíveis:

```ts
type CardFilter = 'todas' | 'ativas' | 'sem_nf' | 'pendente' | 'cancel';
const [cardFilter, setCardFilter] = useState<CardFilter>('todas');
```

Comportamento:
- **OCs Ativas** → mostra todas as ativas (status ≠ cancelado/concluida). Aba destino: ambas.
- **Sem NF** → filtra grupos com pelo menos 1 OC sem NF. Aba destino: justificadas (default).
- **Pend. Justificativa** → filtra grupos com OC `pendente_justificativa`. Aba destino: pendência.
- **Cancel. Pendentes** → filtra grupos com `cancelamento_pendente=true`.
- Clicar de novo no mesmo card → volta para `todas`.

A pipeline de filtros vira:
```
groups → (empreendimento + busca) = baseFilteredGroups
       → (cardFilter)              = cardFilteredGroups   ← alimenta Aging, Valor, Distribuição, Top Ofensores
       → (aba pend/justif)         = filteredGroups       ← alimenta a tabela
```

Os KPIs (4 números no topo) **continuam sempre** computados a partir de `baseFilteredGroups` (senão clicar zeraria os outros). O card ativo ganha `ring-2 ring-primary/40` (já existe via `active` no `SlaKpiCard`).

Indicador visual quando há `cardFilter` ativo: badge "Filtro: Sem NF" ao lado do filtro de empreendimento + botão "Limpar filtros" também limpa o `cardFilter`.

### 2. Cards do hero (Aging Médio + Valor em Aberto + Distribuição) reativos

Trocar o `aggregates = computeAggregates(baseFilteredGroups)` por `computeAggregates(cardFilteredGroups)` apenas para `distribution`, `topOfensores`, `valorEmAberto`, `agingMedio`. Os KPIs (`kpis`) continuam vindo de `baseFilteredGroups`.

Vou separar em duas chamadas:
```ts
const baseAggregates = useMemo(() => computeAggregates(baseFilteredGroups), [baseFilteredGroups]);
const viewAggregates = useMemo(() => computeAggregates(cardFilteredGroups), [cardFilteredGroups]);
// KPIs ← baseAggregates.kpis
// Aging/Valor/Distribuição/TopOfensores ← viewAggregates
```

Adicionar legenda discreta no card de Distribuição: quando `cardFilter !== 'todas'`, mostrar "Recorte: Sem NF (X OCs)".

### 3. Centralizar a tabela

Atualmente os textos estão alinhados à esquerda misturados com itens à direita, ficando bagunçado. Vou aplicar:

- **Header** (`TableHead`): adicionar `text-center` em Solicitante, Empreendimento, OC/Aging, Status & Última ação. Manter Protocolo à esquerda (identificador), Valor à direita (numérico) e Ações à direita.
- **Células** correspondentes: usar `text-center` e flex `justify-center items-center` nos conteúdos com badges/avatares.
- **Avatar do solicitante**: centralizar usando `mx-auto` e remover o truncamento agressivo (max-w-[140px] → 160px) com tooltip.
- **Coluna OC/Aging**: empilhar verticalmente já existe, só centralizar com `items-center`.
- **Coluna Status/Última ação**: centralizar o badge e o texto auxiliar.
- Padronizar altura mínima das linhas (`h-[60px]`) para não "pular" entre linhas com muito ou pouco conteúdo.

### Arquivos editados

- `src/pages/MonitoramentoOC.tsx` — adicionar `cardFilter` state, dividir agregados em `baseAggregates` e `viewAggregates`, ligar `onClick` em todos os SlaKpiCards, centralizar colunas da tabela.
- `src/hooks/useMonitoramentoOC.ts` — sem mudanças (a função `computeAggregates` já aceita qualquer subconjunto).

### Resultado esperado

- Clicar em qualquer card filtra Aging, Valor, Distribuição, Top Ofensores e tabela em tempo real.
- Card ativo destacado com ring; clicar de novo desativa.
- Tabela centralizada e visualmente alinhada (cabeçalhos e células no mesmo eixo).
