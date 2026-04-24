## Objetivo

Reordenar a hierarquia visual do hero do **SLA do Backoffice** para destacar a meta em **dias** (não em %) e relegar o `99%` do gauge a um papel secundário.

## O que muda para o usuário

Lado direito do hero (hoje "Meta atingida") passa a mostrar, com destaque grande:

```
Meta 3 dias úteis · Resultado 0,5
[badge ▼ 1pp vs. período anterior]
```

- "Meta atingida / Próximo da meta / Abaixo da meta" vira um chip pequeno colorido ao lado do resultado, mantendo a leitura de status.
- Barra de distribuição (`104 no prazo · 1 atenção · 0 estourado`) permanece igual.
- Bloco inferior "Tempo médio / Total no período" deixa de duplicar o tempo médio e passa a mostrar apenas **Total no período**, ocupando a linha inteira (já que o tempo médio sobe para o destaque principal).

No gauge à esquerda:
- O `99%` continua, mas em fonte menor (`text-3xl` semibold em vez de `text-5xl` bold).
- A legenda inferior do gauge passa de **"META 80%"** para **"META 3 DIAS"** (a meta em dias, condizente com a régua usada no cálculo).
- Anel verde, marca da meta e cores continuam iguais — o `%` segue útil para enxergar atingimento.

## Mudanças técnicas

### 1. `src/components/sla/MetaGauge.tsx`
- Adicionar prop opcional `metaLabel?: string` para sobrescrever o rodapé "meta {meta}%".
- Reduzir o número central: `text-5xl font-bold` → `text-3xl font-semibold tabular-nums`.
- Pequeno polimento: legenda "no prazo" em uppercase tracking-wider para casar com o rótulo "META …".

### 2. `src/pages/DashboardSLA.tsx` (hero, linhas ~172–270)
- Passar `metaLabel={`Meta ${SLA_DIAS} dias`}` para o `MetaGauge` (constante `SLA_DIAS = 3`, já implícita no header).
- Reescrever o bloco "Atingimento da meta no período":
  - Título pequeno (eyebrow): mantém "ATINGIMENTO DA META NO PERÍODO".
  - Linha principal grande: `Meta 3 dias úteis · Resultado {stats.tempoMedio}` — número do resultado em `text-4xl font-bold tabular-nums`, colorido pelo `tone` (success/warning/destructive vs. meta).
  - Chip pequeno do estado textual ("Meta atingida" etc.) e o badge `▼ 1pp vs. período anterior` ficam logo abaixo, alinhados.
- No grid inferior (Tempo médio / Total no período):
  - Remover a célula "Tempo médio" (já está no destaque acima).
  - Manter "Total no período" ocupando a linha inteira (`grid-cols-1`).
- A função `tone` (success/warning/destructive) passa a ser calculada também a partir de `stats.tempoMedio` vs. `SLA_DIAS` (≤ meta = success, ≤ meta + 1 = warning, > meta + 1 = destructive) para colorir o número de dias coerentemente. O % no gauge mantém sua própria régua (vs. `meta` em pp).

### 3. Outros consumidores do `MetaGauge`
- `src/pages/PainelFluig.tsx` (se usar) — não passa `metaLabel`, então fica com o comportamento atual ("meta {meta}%"). Sem regressão.

## Fora de escopo
- Não alterar a fonte de dados nem o cálculo de `tempoMedio` / `percentualNoPrazo` no hook `useSlaDashboard`.
- Não mexer nas demais seções da página (top ofensores, gráfico de barras, tabela).
