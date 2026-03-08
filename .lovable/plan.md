

# Mostrar badge Projuris no card do solicitante

## Problema
O backoffice atribui `numero_projuris` à solicitação, mas o badge só aparece no Backoffice. No card do solicitante (`SolicitacaoCard.tsx`), não há indicação visual do número Projuris.

## Solução
Adicionar um badge "Projuris: {numero}" no `SolicitacaoCard.tsx`, logo após o badge do Fluig, usando o mesmo padrão visual mas com cor roxa para diferenciar.

### Arquivo: `src/components/ui/SolicitacaoCard.tsx`

Após a linha 139 (badge Fluig), adicionar:

```tsx
{(sol as any).numero_projuris && (
  <Badge variant="outline" className="text-xs bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
    Projuris: {(sol as any).numero_projuris}
  </Badge>
)}
```

Usa `(sol as any)` porque `numero_projuris` existe na tabela `solicitacoes` e é retornado nas queries, mas não está no tipo `Solicitacao` do TypeScript (mesmo padrão já usado em MinhasSolicitacoes).

**1 arquivo, 5 linhas adicionadas.**

