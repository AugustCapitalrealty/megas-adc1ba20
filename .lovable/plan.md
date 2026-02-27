

# Fix: Truncar nomes longos de arquivos no AnexoCard

## Problema
Nomes de arquivo longos expandem o card além do espaço disponível, quebrando o layout. A classe `truncate` existe mas o container não limita a largura efetivamente.

## Alteração

### `src/components/AnexoCard.tsx`

1. Adicionar `overflow-hidden` no container raiz do card (a `div` principal do flex)
2. Garantir que o `<p>` do nome do arquivo tenha truncamento funcional com `max-w-[200px] sm:max-w-[300px] md:max-w-[400px]` para forçar limites responsivos
3. O tooltip já existe mostrando o nome completo ao hover — comportamento preservado

Mudança mínima: apenas ajustar classes CSS no container e no `<p>` do nome.

