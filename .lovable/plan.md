

## Problema Identificado

**Duas questões:**

1. **Discrepância Backlog Crítico vs Detalhamento**: O card mostra 1 item (solicitações **abertas** sem OC há >15 dias), mas a tabela em modo "all" mostra 8 itens **concluídos** que levaram >15 dias. São métricas diferentes mas o visual sugere contradição.

2. **Ícone de calendário**: O ícone `Calendar` está renderizando pequeno/desconfigurado junto aos inputs de data.

---

## Solução

### 1. Unificar linguagem visual (arquivo: `src/pages/DashboardEficiencia.tsx`)

**a) Remover destaque vermelho em linhas concluídas com >10 dias** (linha 791-794)
- O `bg-destructive/5` em linhas com `dias > 10` confunde o usuário com backlog
- Remover esse highlight para entradas do tipo `LeadTimeEntry` (já concluídas)

**b) Atualizar label e tooltip do Backlog**
- Card: "Backlog Crítico" → adicionar subtexto "(Em aberto)" 
- Tooltip: deixar explícito que são solicitações **sem OC emitida**

**c) Ajustar descrição do Detalhamento**
- Quando `drilldownFilter === 'all'`: mostrar "OCs emitidas no período"
- Quando `drilldownFilter === 'backlog'`: mostrar "Em aberto >15 dias úteis"

### 2. Corrigir ícone do calendário (linha 242-257)

Substituir ícone solto por wrapper com alinhamento correto:
```tsx
<div className="flex items-center gap-1.5">
  <div className="flex items-center gap-1">
    <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
    <Input type="date" ... />
  </div>
  <span>—</span>
  <Input type="date" ... />
</div>
```

---

## Arquivos Alterados

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/DashboardEficiencia.tsx` | Remover highlight `bg-destructive/5` em concluídas; ajustar labels/tooltips; corrigir alinhamento do ícone calendário |

