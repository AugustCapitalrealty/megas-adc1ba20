

# Plano: App Shell + Prefetch de Dados + Nova Logo

## Problema raiz

Toda página importa e renderiza `<AppLayout>` individualmente. Quando o React Router troca de rota, o componente da página anterior desmonta completamente (incluindo o AppLayout com header, logo, menu) e a nova página monta um novo AppLayout do zero. Isso causa:

- Logo "pisca" a cada navegação (remonta a `<img>`)
- Header e menu recarregam desnecessariamente
- Transição visualmente lenta mesmo com chunks já carregados

## Estratégia

### 1. App Shell: Layout fixo no Router (maior impacto)

Mover o `<AppLayout>` para o nível do Router, envolvendo todas as rotas protegidas. As páginas deixam de importar/renderizar `AppLayout` internamente.

```text
Antes:
  Route "/" → ProtectedRoute → Dashboard (monta AppLayout)
  Route "/backoffice" → ProtectedRoute → Backoffice (monta OUTRO AppLayout)

Depois:
  Route "/" → ProtectedRoute → AppLayout (monta UMA VEZ)
    ├── Route index → Dashboard (só conteúdo)
    ├── Route "backoffice" → Backoffice (só conteúdo)
    └── Route "minhas-solicitacoes" → MinhasSolicitacoes (só conteúdo)
```

Com isso, ao trocar de página o header/logo/menu permanecem fixos na tela e apenas o conteúdo central é substituído via `<Outlet />`.

**Arquivos afetados:**
- `src/App.tsx` — Reestruturar rotas com layout wrapper usando `<Outlet />`
- `src/components/layout/AppLayout.tsx` — Trocar `{children}` por `<Outlet />`
- **Todas as 10 páginas protegidas** — Remover import e wrapper `<AppLayout>`

### 2. Prefetch de dados após login

Quando o usuário faz login e cai no Dashboard, aproveitar esse momento para pré-carregar dados das rotas mais usadas em background:

```typescript
// No Dashboard, após montar:
useEffect(() => {
  // Prefetch dados de MinhasSolicitacoes em background
  queryClient.prefetchQuery({
    queryKey: ['minhas-solicitacoes', userId],
    queryFn: fetchSolicitacoes,
    staleTime: 1000 * 60 * 5,
  });
}, []);
```

Isso garante que quando o usuário clicar em "Solicitações", os dados já estarão no cache.

### 3. Atualizar logo

Substituir `src/assets/logos/logo-mega.webp` pelo arquivo PNG enviado pelo usuário. Atualizar referências para usar o novo arquivo.

### 4. Cache de retorno (já parcialmente implementado)

O `staleTime: 5min` global no QueryClient já garante que dados cacheados são exibidos instantaneamente ao voltar para uma página. Com o App Shell, o efeito será ainda mais visível pois o layout não remonta.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/assets/logos/logo-mega.png` | Nova logo (copiar upload do usuário) |
| `src/App.tsx` | Reestruturar rotas com layout wrapper + Outlet |
| `src/components/layout/AppLayout.tsx` | Usar Outlet, atualizar import da logo |
| `src/pages/Dashboard.tsx` | Remover AppLayout, adicionar prefetch |
| `src/pages/MinhasSolicitacoes.tsx` | Remover AppLayout |
| `src/pages/Backoffice.tsx` | Remover AppLayout |
| `src/pages/NovaSolicitacao.tsx` | Remover AppLayout |
| `src/pages/PainelFluig.tsx` | Remover AppLayout |
| `src/pages/Admin.tsx` | Remover AppLayout |
| `src/pages/DashboardSLA.tsx` | Remover AppLayout |
| `src/pages/DashboardEficiencia.tsx` | Remover AppLayout |
| `src/pages/GarantiasVigentes.tsx` | Remover AppLayout |
| `src/pages/MonitoramentoOC.tsx` | Remover AppLayout |
| `src/pages/Login.tsx` | Atualizar import da logo |

## Resultado esperado

- Header, logo e menu **nunca mais recarregam** durante navegação
- Transições entre páginas são instantâneas (só o conteúdo central muda)
- Dados pré-carregados em background após login
- Retorno a páginas já visitadas é imediato via cache
- Logo atualizada para a versão enviada

