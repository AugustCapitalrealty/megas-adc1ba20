

# Plano: Otimização de Performance

## Diagnóstico (Performance Profile)

| Problema | Impacto |
|----------|---------|
| **Logo 743KB** carregada 3x na mesma página | +2.2MB de transferência, FCP de 4.6s |
| **lucide-react 158KB** bundle completo | Maior script da app |
| **useUserEmpreendimentos** não usa cache (useEffect + useState) | Refetch em cada mount de componente |
| **NotificationBell** sem staleTime, refetch em cada navegação | Queries desnecessárias |
| **MinhasSolicitacoes** fetch sequencial (correções e info requests após dados principais) | Waterfall de queries |
| **`select('*')`** em várias queries traz colunas desnecessárias | Payload inflado |
| **App.css** com estilos Vite default não usados | CSS morto |

## Alterações

### 1. Comprimir logo (~743KB → ~15KB)
O arquivo `logo-mega.webp` é uma imagem de alta resolução exibida a 40px de altura. Redimensionar para 200px de largura máxima e recomprimir. Também adicionar `loading="eager"` no header e `loading="lazy"` onde não é above-the-fold.

### 2. Otimizar imports do lucide-react
Configurar `vite.config.ts` com `optimizeDeps.include` para lucide-react e adicionar `iconResolver` para tree-shaking mais eficiente no build de produção.

### 3. Converter `useUserEmpreendimentos` para React Query
Substituir `useEffect` + `useState` por `useQuery` com `staleTime: 5min`. Evita refetch em cada mount (Dashboard, MinhasSolicitacoes, MonitoramentoOC, Backoffice todos usam esse hook).

### 4. Adicionar staleTime ao NotificationBell
Converter para `useQuery` com `staleTime: 30s` mantendo o realtime channel para novas notificações.

### 5. Paralelizar queries em MinhasSolicitacoes
As queries de `rejectionReasons` e `infoRequests` são feitas após o fetch principal. Executá-las em `Promise.all` junto com os documentos.

### 6. Remover App.css (CSS morto)
O arquivo `src/App.css` contém estilos do template Vite que não são usados (`.logo`, `.read-the-docs`, etc). Remover o arquivo e qualquer import dele.

### 7. Selects específicos nas queries
Em `MinhasSolicitacoes.fetchSolicitacoes`, trocar `select('*')` por campos necessários para reduzir payload.

### 8. React.memo no SolicitacaoCard
Envolver `SolicitacaoCard` em `React.memo` para evitar re-renders desnecessários quando a lista é filtrada.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `vite.config.ts` | Otimizar deps do lucide-react, manual chunks |
| `src/App.css` | **Deletar** |
| `src/hooks/useUserEmpreendimentos.ts` | Converter para React Query |
| `src/components/NotificationBell.tsx` | useQuery com staleTime |
| `src/pages/MinhasSolicitacoes.tsx` | Paralelizar queries, select específico |
| `src/components/ui/SolicitacaoCard.tsx` | React.memo |
| `src/assets/logos/logo-mega.webp` | Comprimir/redimensionar imagem |

## Resultado esperado
- FCP reduzido de ~4.6s para ~2s
- ~2MB menos de transferência (logo)
- Menos queries redundantes por navegação
- Navegação mais fluida entre páginas

