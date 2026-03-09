

## Virtualização de listagens de solicitações

### Análise do cenário atual

Existem 3 listagens principais que renderizam todos os itens sem virtualização:

1. **MinhasSolicitacoes** — cards via `.map()`, sem paginação, principal candidata
2. **GarantiasVigentes** — cards via `.map()`, sem paginação
3. **Admin SolicitacoesManagement** — tabela via `.map()`, sem paginação

O **Backoffice** já usa paginação com `ITEMS_PER_PAGE`, então não precisa de virtualização.

### Problema com react-window

Os cards de solicitação têm **altura variável** (conteúdo expandível, banners condicionais, anexos). O `react-window` exige alturas fixas ou pré-calculadas via `VariableSizeList`, o que gera complexidade significativa com conteúdo dinâmico.

**Recomendação**: usar `@tanstack/react-virtual` — suporta alturas dinâmicas nativamente, mede elementos após render, e é mais leve (~2KB). Se preferir manter `react-window`, funciona mas com mais código de medição.

### Plano de implementação (com @tanstack/react-virtual)

**1. Instalar dependência**
- `@tanstack/react-virtual`

**2. Criar componente `VirtualizedList`** (`src/components/ui/VirtualizedList.tsx`)
- Wrapper genérico que recebe `items`, `renderItem`, `estimateSize`
- Usa `useVirtualizer` com `measureElement` para alturas dinâmicas
- Container com altura fixa e overflow-y auto
- ~60 linhas

**3. Aplicar em MinhasSolicitacoes**
- Substituir o `.map()` de `SolicitanteSolicitacaoCard` pelo `VirtualizedList`
- `estimateSize` ~200px (altura típica de um card colapsado)
- Overscan de 3-5 itens para scroll suave

**4. Aplicar em GarantiasVigentes**
- Substituir o `.map()` de `GarantiaCard` pelo `VirtualizedList`

**5. Aplicar em Admin SolicitacoesManagement**
- Virtualizar as `TableRow` dentro do `TableBody`
- Requer wrapper especial para manter semântica de tabela

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `package.json` | Adicionar `@tanstack/react-virtual` |
| `src/components/ui/VirtualizedList.tsx` | Novo componente genérico |
| `src/pages/MinhasSolicitacoes.tsx` | Usar VirtualizedList no `.map()` |
| `src/pages/GarantiasVigentes.tsx` | Usar VirtualizedList no `.map()` |
| `src/components/admin/SolicitacoesManagement.tsx` | Virtualizar tabela |

