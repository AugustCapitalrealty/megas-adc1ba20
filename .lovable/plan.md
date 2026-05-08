## Problema

O input "Dias de Garantia" perde o foco a cada tecla digitada — você precisa clicar de novo no campo a cada número.

## Causa

No arquivo `src/components/nova-solicitacao/steps/DetalhesStep.tsx`, o componente `GarantiaBlock` está **declarado dentro** do componente `DetalhesStep`:

```tsx
export function DetalhesStep(...) {
  ...
  const GarantiaBlock = () => ( ... );  // ← recriado a cada render
  ...
  return (... <GarantiaBlock /> ...);
}
```

Como `GarantiaBlock` é uma nova referência de função a cada render, o React desmonta e remonta o subárvore inteira sempre que o estado muda (ou seja, a cada tecla). O `<Input>` perde o foco porque é um nó DOM novo.

## Correção

Mover `GarantiaBlock` para **fora** de `DetalhesStep`, transformando-o em um componente próprio que recebe via props apenas o que precisa:

- `tipoGarantia`, `diasGarantia`, `diasGarantiaServico`, `diasGarantiaProduto`
- setters: `setTipoGarantia`, `setDiasGarantia`, `setDiasGarantiaServico`, `setDiasGarantiaProduto`

Assim o componente mantém identidade estável entre renders e o input preserva o foco.

## Escopo

- Arquivo único: `src/components/nova-solicitacao/steps/DetalhesStep.tsx`
- Apenas refator de estrutura (extrair `GarantiaBlock` para fora do componente pai). Nenhuma mudança visual, de validação ou de lógica de negócio.
