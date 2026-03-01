

# Regra de exibicao do Painel OC x NF

## Situacao atual

O painel atualmente mostra **todas** as OCs emitidas, incluindo solicitacoes com status `concluida`. O unico filtro existente exclui contas de agua/energia. Os KPIs ja filtram `concluida` e `cancelado`, mas a tabela principal nao.

## Correcao

Adicionar filtro no enriquecimento dos dados (linha ~148-150 de `MonitoramentoOC.tsx`) para excluir solicitacoes finalizadas:

```typescript
if (sol.status === 'concluida') return null;
```

Isso remove do painel qualquer solicitacao que ja tenha sido concluida (NF recebida, fluxo encerrado). Solicitacoes canceladas continuam aparecendo pois fazem parte do controle de governanca.

## Arquivo alterado

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/MonitoramentoOC.tsx` | Adicionar `if (sol.status === 'concluida') return null;` no filtro de enriquecimento |

Alteracao minima -- uma linha.

