

## Melhorias: UI Ciência, Reverter dados, Remover KPIs, Ordenação

### 1. Reverter ciência da 2026000125

A solicitação 2026000125 teve ciência confirmada durante impersonação. Reverter via SQL:
- `UPDATE solicitacoes SET cancelamento_ciencia_em = NULL WHERE protocolo = '2026000125'`
- Remover o registro de histórico com `acao = 'ciencia_cancelamento'` dessa solicitação

### 2. Corrigir histórico de ciência — não aparece na timeline

O `SolicitacaoTimeline.tsx` na função `getActionDetails` não reconhece a ação `ciencia_cancelamento`. Adicionar:
```typescript
case 'ciencia_cancelamento':
  return { icon: <Eye />, label: 'Ciência de cancelamento confirmada', color: 'text-muted-foreground' };
```

### 3. Melhorar UI do "Confirmar ciência"

No `SolicitanteSolicitacaoCard.tsx`, melhorar o botão de ciência com:
- Ícone mais visível, texto mais claro
- Usar `variant="default"` com cor warning para chamar atenção
- Adicionar um texto explicativo mais destacado

No `PendingActionsCard.tsx`, o botão "Dar ciência" já funciona bem — manter como está, mas ao clicar ele deve navegar para a aba "Canceladas" em vez de executar ciência em massa (mais seguro — o solicitante vê quais foram canceladas e confirma individualmente).

### 4. Remover KPIs cards do Solicitante

Remover o componente `SolicitanteKPIs` da página `MinhasSolicitacoes.tsx` (linhas 960-967). As abas do FilterBar já mostram as contagens.

### 5. Ordenação por "Abertura" / "Última alteração"

Adicionar ao `MinhasSolicitacoes.tsx`:
- State `sortBy: 'created_at' | 'updated_at'` com default `'updated_at'`
- Botão toggle no `rightSlot` do FilterBar (ao lado do Exportar)
- No `sortedAndFilteredSolicitacoes`, após o sort por prioridade, usar `sortBy` para desempate:
  ```typescript
  return new Date(b[sortBy]).getTime() - new Date(a[sortBy]).getTime();
  ```

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| SQL (via tool) | Reverter ciência da 2026000125 |
| `src/components/SolicitacaoTimeline.tsx` | Adicionar `ciencia_cancelamento` ao `getActionDetails` |
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Melhorar UI do botão ciência |
| `src/components/PendingActionsCard.tsx` | Ciência navega para aba canceladas |
| `src/pages/MinhasSolicitacoes.tsx` | Remover KPIs, adicionar ordenação com default `updated_at` |

