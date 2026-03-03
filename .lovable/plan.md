

# Plano: Eliminar carregamento duplo e acelerar transições

## Diagnóstico

O usuário vê **até 3 telas de loading** ao trocar de página:

1. **Suspense fallback** (tela cheia com logo + spinner) — enquanto o chunk JS carrega via lazy import
2. **ProtectedRoute loading** (outra tela cheia idêntica) — enquanto o auth verifica `loading === true`
3. **Loading interno da página** (spinner dentro do conteúdo) — enquanto os dados são buscados

Além disso, o `QueryClient` não tem `staleTime` global, então toda navegação re-busca dados do zero.

## Alterações

### 1. `src/App.tsx` — Eliminar loading duplo

- Mover o `<Suspense>` para **dentro** do `ProtectedRoute`, após o check de auth. Assim o usuário vê no máximo 1 tela de loading (auth), nunca duas sequenciais.
- Alternativamente, o `ProtectedRoute` pode retornar `null` durante loading (sem tela cheia) já que o Suspense já está mostrando. Melhor: deixar o Suspense com fallback **mínimo** (sem tela cheia) e manter apenas o ProtectedRoute como loading principal.

**Solução escolhida**: Remover a tela cheia do Suspense. Usar um fallback mínimo (vazio ou só spinner pequeno) no Suspense, pois os chunks carregam em <200ms após primeira visita. O loading "real" fica apenas no ProtectedRoute.

### 2. `src/App.tsx` — Adicionar `staleTime` global ao QueryClient

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10,
      refetchOnWindowFocus: false,
    },
  },
});
```

Isso faz com que ao navegar de volta para uma página já visitada, os dados apareçam instantaneamente do cache.

### 3. `src/pages/MinhasSolicitacoes.tsx` — Converter para React Query

A página usa `useState` + `useEffect` + `fetchSolicitacoes()` manual. Isso significa que **cada vez que o usuário volta para esta tela, todos os dados são buscados do zero** com loading spinner.

Converter para `useQuery` com `queryKey: ['minhas-solicitacoes', effectiveUserId, viewMode]`. Isso mantém cache entre navegações e mostra dados antigos instantaneamente enquanto revalida em background.

### 4. `src/components/layout/AppLayout.tsx` — Prefetch ao hover nos links

Adicionar `onMouseEnter` nos links de navegação para pré-carregar o chunk da página antes do clique, eliminando o delay do lazy loading.

```typescript
const prefetchRoute = (path: string) => {
  // Trigger chunk preload
  const routeMap: Record<string, () => Promise<any>> = {
    '/': () => import('@/pages/Dashboard'),
    '/minhas-solicitacoes': () => import('@/pages/MinhasSolicitacoes'),
    // ...
  };
  routeMap[path]?.();
};
```

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Suspense fallback mínimo, QueryClient com staleTime global |
| `src/pages/MinhasSolicitacoes.tsx` | Converter fetch para useQuery |
| `src/components/layout/AppLayout.tsx` | Prefetch de chunks ao hover |

## Resultado esperado

- Transição entre telas: dados do cache aparecem **instantaneamente**, sem loading
- Apenas 1 tela de loading na primeira visita (nunca dupla)
- Hover nos links pré-carrega o chunk antes do clique
- Dados revalidam silenciosamente em background

