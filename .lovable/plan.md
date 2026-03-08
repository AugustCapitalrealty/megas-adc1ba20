

# Auditoria UI/UX: Painéis de Monitoramento e Dashboards

## Problemas Identificados

### 1. Headers inconsistentes entre páginas
- **Dashboard**: `text-2xl`, sem ícone
- **SLA**: `text-3xl` com ícone de 8x8
- **Eficiência**: `text-2xl` com ícone de 7x7
- **Monitoramento**: `text-2xl`, sem ícone
- **Garantias**: ícone + `text-2xl`
- **Painel Fluig**: `text-2xl`, sem ícone, usa `container mx-auto` diferente de todas as outras páginas

**Fix**: Padronizar todos para `text-2xl font-bold` com ícone opcional de `h-6 w-6`. Remover `container mx-auto` do PainelFluig (AppLayout já cuida disso).

### 2. KPI Cards com 5 estilos diferentes
Cada página implementa KPIs de forma diferente (border-left, gradients, CardHeader, icon à direita, etc.).

**Fix**: Não unificar tudo (cada contexto tem necessidades), mas padronizar o padding e a hierarquia visual:
- MonitoramentoOC: trocar `pt-6` (padrão do CardContent) por `p-4` nos KPIs para alinhar com Dashboard
- SLA: compactar os stats cards removendo `CardHeader/CardContent` e usando layout inline como o Dashboard

### 3. Tabela do MonitoramentoOC sem scroll ou sticky header
A tabela com 9 colunas não tem `ScrollArea` nem `sticky top-0` no `thead`, e em telas menores transborda sem scroll horizontal.

**Fix**: Envolver em `ScrollArea` com `h-[550px]` e adicionar `overflow-x-auto`. Sticky header no thead.

### 4. DashboardSLA: filtros ocupam muito espaço vertical
O card de filtros usa `CardHeader` com título "Filtros" + `CardContent`, adicionando ~60px desnecessários.

**Fix**: Remover `CardHeader` dos filtros e usar layout inline compacto como no Monitoramento e Eficiência.

### 5. DashboardEficiencia: tabela de detalhamento sem limite de altura
Exibe até 100 linhas sem scroll, empurrando tudo para baixo.

**Fix**: Envolver a tabela em `ScrollArea className="max-h-[500px]"`.

### 6. Cores hardcoded sem suporte dark mode (SLA)
Os stats cards usam `border-emerald-200 bg-emerald-50/30 text-emerald-700` que ficam apagados no dark mode.

**Fix**: Adicionar variantes dark (`dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300`).

### 7. PainelFluig: container duplicado
Usa `container mx-auto py-6 px-4` enquanto o AppLayout já fornece padding e max-width.

**Fix**: Trocar por `space-y-6` como todas as outras páginas.

### 8. MonitoramentoOC: ações na tabela transbordam
Os botões "Justificar", "Cancelar" e "Histórico" ficam empilhados em telas menores.

**Fix**: Usar `flex-wrap` e reduzir para ícones com tooltip em telas compactas, ou usar um dropdown de ações.

## Resumo de Alterações

| Arquivo | Mudança |
|---------|---------|
| `MonitoramentoOC.tsx` | ScrollArea + sticky header + overflow-x + ações compactas |
| `DashboardSLA.tsx` | Filtros compactos (remover CardHeader) + dark mode nos stats |
| `DashboardEficiencia.tsx` | ScrollArea na tabela de detalhamento |
| `PainelFluig.tsx` | Remover `container mx-auto`, usar `space-y-6` |

**4 arquivos, ~40 linhas alteradas.** Foco em consistência e usabilidade sem alterar funcionalidade.

