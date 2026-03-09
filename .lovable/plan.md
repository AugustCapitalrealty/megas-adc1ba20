
## Diagnóstico — Dashboard de Eficiência

### Problemas identificados

1. **Filtros em Card separado** — mesmo padrão que o Monitoramento antes do refactor: ocupa ~120px de altura com Card wrapper. Precisa virar barra inline.

2. **Sem atalhos de período (Quick Range)** — o usuário tem que digitar as datas manualmente. Outros dashboards como o SLA também sofrem disso, mas aqui é mais crítico pois o padrão é 90 dias. Adicionar botões: "7d", "30d", "90d", "Este mês", "Este ano".

3. **Filtros mistos** — o botão "Limpar Filtro / Todos" na 4ª coluna da grid de filtros está junto com os inputs de data, sem sentido semântico claro. Precisa de lógica `hasFilters` + botão `X` padronizado.

4. **Drilldown filter não vinculado ao empreendimento** — clicar nos KPIs seta `drilldownFilter` mas não filtra por empreendimento. O botão "Limpar Filtro" no filtro da card se refere ao `drilldownFilter`, mas visualmente parece que limpa empreendimento.

5. **KPI "Vazão" sem drilldown** — os primeiros 3 KPIs têm `onClick` para drilldown, o 4º não. Inconsistência.

6. **Tabela de detalhamento sem busca** — sem campo de busca por protocolo (diferente do DashboardSLA que tem campo de busca).

7. **Tabela limitada a 100 registros sem aviso** — `.slice(0, 100)` sem contador visível explicando o limite.

8. **Empty state dos rankings (Top 10)** — frase "Sem dados" sem ícone. Padrão do app usa ícone + texto.

9. **KPI card "Lead Time Médio" usa `TrendingDown`** — o ícone foi escolhido semanticamente (menor = melhor), mas visualmente é confuso — parece indicar que o valor está caindo negativamente. Trocar por `Timer` ou `Gauge`.

10. **Seções sem `id` para âncora** — impossível linkar diretamente para "Distribuição" ou "Evolução Semanal" de outros lugares.

11. **Filtros não têm preset "Limpar" que redefina datas ao padrão** — quando o usuário muda datas manualmente não tem como voltar ao padrão 90d sem recarregar a página.

12. **Seção Rankings usa lista simples sem barra de progresso** — o DashboardSLA usa barra de progresso relativa. Rankings Top 10 seriam mais legíveis com `progress bar` proporcional ao máximo.

13. **Toggle YoY** — usa `Checkbox` + `Label` enquanto o padrão do app usa `Switch` + `Label` para toggles inline.

14. **Filtro de drilldown da tabela sem label contextual** — o badge "Filtro ativo: bucket_3_5" aparece com texto raw, ilegível.

---

## Melhorias planejadas

### 1. Filtros — remover Card, barra inline + Quick Range buttons
Substituir o `<Card>` por um `div` com flex inline. Adicionar chips de atalho: **7d | 30d | 90d | Este mês | Este ano**. Botão `Limpar` que reseta para padrão 90d.

### 2. Drilldown na tabela + busca por protocolo
Adicionar campo de busca (`Input` com `Search` ícone) acima da tabela. Exibir contador correto com aviso se > 100 resultados.

### 3. KPI Vazão clicável
Adicionar `onClick={() => setDrilldownFilter('all')}` ao 4º KPI (Vazão), consistente com os outros.

### 4. Rankings com barra de progresso proporcional
Trocar o `Badge variant="secondary"` por uma mini barra de progresso inline proporcional ao item com maior contagem.

### 5. Toggle YoY: Checkbox → Switch
Consistência com padrão do app.

### 6. Drilldown badge legível
Mapear os valores de drilldown para labels legíveis:
```ts
const DRILLDOWN_LABELS: Record<string, string> = {
  same_day: 'Same-Day (0 dias)',
  backlog: '>15 dias úteis',
  'bucket_0_0': '0 dias (Same-Day)',
  'bucket_1_2': '1–2 dias',
  'bucket_3_5': '3–5 dias',
  'bucket_6_10': '6–10 dias',
  'bucket_11_15': '11–15 dias',
  'bucket_16_Infinity': '15+ dias',
};
```

### 7. Ícone KPI Lead Time
Trocar `TrendingDown` por `Timer` para evitar leitura negativa.

### 8. Empty states com ícones nos rankings
Padrão: `BarChart3` + "Nenhum dado no período"

---

## Arquivos modificados

| Arquivo | Mudanças |
|---|---|
| `src/pages/DashboardEficiencia.tsx` | Todos os itens acima — arquivo único que contém toda a página |
