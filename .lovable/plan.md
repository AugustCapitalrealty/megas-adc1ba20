
## Diagnóstico UX/UI — Painel de Monitoramento

Lendo os dois arquivos completos e o screenshot, identifiquei os seguintes problemas:

### OC x NF — Problemas encontrados

1. **Filtros numa Card separada** — ocupa espaço desnecessário, visualmente pesado. Os demais painéis (Backoffice, Projuris) têm filtros inline ou em linha simples sem card wrapper.

2. **Tabela sem ScrollArea no Projuris** — a aba Projuris não tem `ScrollArea` com altura fixa, enquanto a OC x NF tem `h-[550px]`. A Projuris pode crescer infinitamente quebrando a página.

3. **Coluna "Ações" com botões mistos** — botões `size="icon"` (Justificar, Cancelar, Histórico) e um botão com texto ("Detalhes" no Projuris) — inconsistente entre as duas abas.

4. **KPIs não clicáveis** — nos outros painéis do app os KPI cards agem como filtros rápidos. Aqui são estáticos.

5. **Filtros sem clear/reset** — quando o usuário filtra não há botão de limpar filtros. Causa confusão ao ver tabela vazia.

6. **Indicador de linha própria (`border-l-4`)** oculto visualmente quando a linha tem `bg-destructive/5` ou `bg-amber-50/50` pois o fundo cobre o efeito.

7. **Separação visual TabsList** — a `TabsList` não tem ícones. O Backoffice usa ícones, mas o Monitoramento não, sendo inconsistente.

8. **Header das colunas não sticky no Projuris** — faltam `sticky top-0 bg-card z-10` no `TableHeader` da aba Projuris.

9. **KPI "Projuris" mostra total geral, não ativos** — linha `total: rows.length` inclui concluídas/canceladas, mas o filtro padrão é `ativos`. Número diverge.

10. **Empty state genérico** — quando tabela está vazia não há ilustração/ícone, só texto.

---

## Melhorias planejadas

### 1. Filtros — remover Card wrapper, colocar em linha horizontal compacta (ambas abas)
Eliminar o `<Card>` ao redor dos filtros, tornando-os uma barra inline com `gap-3` e `items-center`. Salvar espaço vertical.

### 2. KPI cards clicáveis como filtros rápidos (OC x NF)
- Clicar em "OCs Ativas" → `setFilterStatus('todos')`
- Clicar em "Sem NF" → `setFilterStatus('aguardando_nf')`  
- Clicar em "Pend. Justificativa" → `setFilterStatus('pendente_justificativa')`
- Clicar em "Cancel. Pendentes" → `setFilterStatus('cancelamento_solicitado')`
- Adicionar `cursor-pointer`, `hover:shadow-md`, `ring-2 ring-primary` quando ativo

### 3. Botão "Limpar filtros" (ambas abas)
Aparece somente quando algum filtro está ativo. Um `Button variant="ghost" size="sm"` com `X` ao lado do contador de registros.

### 4. ScrollArea + sticky header para Projuris
Envolver a tabela em `ScrollArea className="h-[550px]"` e adicionar `sticky top-0 bg-card z-10` ao `TableHeader`.

### 5. Ações consistentes via ícones + tooltip (ambas abas)
- OC x NF já usa ícones — correto
- Projuris usa `Button size="sm"` com texto "Detalhes" — trocar para `size="icon"` + ícone `Eye` + Tooltip, igual ao padrão da outra aba

### 6. TabsList com ícones
```tsx
<TabsTrigger value="oc-nf">
  <FileCheck className="h-4 w-4 mr-1.5" />
  OC x NF
</TabsTrigger>
<TabsTrigger value="projuris">
  <Scale className="h-4 w-4 mr-1.5" />
  Projuris
</TabsTrigger>
```

### 7. KPI "Projuris" corrigido para contar apenas ativos
```ts
total: rows.filter(r => !['concluida', 'cancelado'].includes(r.status)).length,
```

### 8. Empty state melhorado (ambas abas)
Adicionar ícone contextual + texto descritivo quando a tabela está vazia.

### 9. Badge de "sua solicitação" mais visível
Adicionar `ml-1` com um badge pequeno `•` inline na célula protocolo em vez de depender só do `border-l-4` que conflita com bg das linhas coloridas.

---

## Arquivos modificados

| Arquivo | Mudanças |
|---|---|
| `src/pages/MonitoramentoOC.tsx` | KPIs clicáveis, filtros sem card, TabsList com ícones, limpar filtros, empty state, badge próprio |
| `src/components/monitoramento/TabProjuris.tsx` | ScrollArea+sticky, ações como ícones, filtros sem card, limpar filtros, KPI total corrigido, empty state |
