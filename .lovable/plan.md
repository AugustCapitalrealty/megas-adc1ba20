## Objetivo

Remover o limite de 12 parcelas no wizard de Nova Solicitação (AC) e melhorar a UI/UX do campo, trocando o `Select` por um `Input` numérico com controles e feedback visual.

## Mudanças

### 1. `src/components/nova-solicitacao/steps/DetalhesStep.tsx`

Substituir o bloco atual:

```tsx
<Label>Parcelas (máx. 12)</Label>
<Select value={parcelas} onValueChange={setters.setParcelas}>
  <SelectTrigger>...</SelectTrigger>
  <SelectContent>
    {[...Array(12)].map(...)}
  </SelectContent>
</Select>
```

Por um novo componente `<ParcelasField>` com:

- **Input numérico** (`type="number"`, `min=1`, sem `max`) — aceita qualquer quantidade de parcelas.
- **Botões `-` / `+`** ao lado do input para incrementar/decrementar (UX de stepper).
- **Atalhos rápidos** (chips): `1x`, `3x`, `6x`, `12x`, `24x`, `36x` para os casos mais comuns.
- **Helper dinâmico** abaixo do input: mostra o valor de cada parcela calculado a partir do `valorNumerico` (ex.: "12x de R$ 1.250,00") ou "À vista" quando 1x.
- **Validação suave**: se o usuário digitar `0` ou vazio, normaliza para `1`. Sem teto rígido, mas exibe um aviso discreto (texto âmbar) quando passar de 60 parcelas: "Confirme se realmente são X parcelas".
- Mantém o estado como string (compatível com `setters.setParcelas` atual) para não tocar no hook `useNovaSolicitacaoForm`.

### 2. Layout / estilo

- Usar tokens do design system (sem cores hardcoded): `bg-muted/30`, `border-input`, chips como `Button variant="outline" size="sm"`.
- Container com `rounded-lg border p-3 space-y-2`, alinhado aos demais blocos do step (Garantia, Faturamento Direto).
- Acessibilidade: `aria-label` nos botões `+`/`-`, `htmlFor` no label.

## Fora de escopo

- Não alterar o schema do banco (coluna `parcelas integer` já aceita qualquer valor).
- Não mexer em validações de submit nem no hook `useNovaSolicitacaoForm`.
- Não tocar em outros formulários.

## Arquivos alterados

- `src/components/nova-solicitacao/steps/DetalhesStep.tsx` (único)
