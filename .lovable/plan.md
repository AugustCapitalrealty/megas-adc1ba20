## Objetivo

Remover a aba "Rateio Energia" de `/admin/usuarios` e criar uma página dedicada `/admin/rateio-energia`, acessível apenas para admin, com experiência completa (header próprio, breadcrumb, item no menu lateral e prefetch).

## Mudanças

### 1. Nova página `src/pages/AdminRateioEnergia.tsx`
- `PageContainer` + `PageHeader` com título "Rateio de Energia", descrição e ícone `Zap`.
- Renderiza `<RateioEnergiaTab />` (mantém as sub-abas internas: Memória de Cálculo, Contratos, Grandezas Contratadas, Cadastros — esse é o conteúdo da página, não muda).
- Guarda local: se `!isAdmin`, redireciona para `/` (mesma defesa em profundidade que `Admin.tsx`).

### 2. Rota em `src/App.tsx`
- Adicionar dentro do `ProtectedShell`:
  ```tsx
  <Route path="admin/rateio-energia" element={<RequireRole role="admin"><AdminRateioEnergia /></RequireRole>} />
  ```
- `lazyWithRetry` import da nova página.

### 3. Menu lateral `src/components/layout/AppLayout.tsx`
- Adicionar item admin: `{ href: '/admin/rateio-energia', label: 'Rateio de Energia', icon: Zap }` (após "Design System" ou agrupado com os demais admin).
- Adicionar entrada no mapa de prefetch: `'/admin/rateio-energia': () => import('@/pages/AdminRateioEnergia')`.

### 4. Breadcrumb `src/components/layout/AppBreadcrumbs.tsx`
- Adicionar `'/admin/rateio-energia': 'Rateio de Energia'`.

### 5. Remover da página de Usuários `src/pages/Admin.tsx`
- Remover `TabsTrigger value="rateio-energia"` (linha ~779) e o `TabsContent value="rateio-energia"` (linhas ~1082-1083).
- Remover o import `RateioEnergiaTab` e o ícone `Zap` se não for mais usado.
- Se a rota antiga `?tab=rateio-energia` for acessada, redirecionar via `useEffect` para `/admin/rateio-energia` (compatibilidade com links salvos).

## Não muda
- Conteúdo interno de `RateioEnergiaTab` e suas sub-abas permanece intacto.
- Aba "Rateio (áreas)" antiga (`RateioConfigTab`) continua em Usuários — o pedido é só sobre Rateio de Energia.
- Permissões já existentes (`RequireRole admin`).
