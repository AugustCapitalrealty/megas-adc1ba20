

# Plano: Trocar Logo + Eliminar Loading Duplo

## Diagnóstico

Dois problemas distintos:

**1. Logo desatualizada** — Precisa trocar para a nova versão enviada.

**2. Três shells separados causam remontagem do layout:**

```text
Atual (App.tsx):
  <Route element={<ProtectedShell />}>           ← Shell A (monta AppLayout)
    Dashboard, MinhasSolicitacoes, etc.
  </Route>
  <Route element={<ProtectedShell requireBackoffice />}>  ← Shell B (OUTRO AppLayout)
    Backoffice, DashboardSLA, etc.
  </Route>
  <Route element={<ProtectedShell requireAdmin />}>       ← Shell C (OUTRO AppLayout)
    Admin
  </Route>
```

Ao navegar de Dashboard (Shell A) para Backoffice (Shell B), o React desmonta o Shell A inteiro (incluindo header/logo/menu) e monta o Shell B do zero. Isso causa o efeito de "carregar duas vezes" — primeiro o loading do auth no novo shell, depois o loading dos dados da página.

## Alterações

### 1. Trocar logo
Copiar `user-uploads://logo-mega-removebg-preview-2.png` para `src/assets/logos/logo-mega.png`. Todas as referências já apontam para esse arquivo.

### 2. Unificar em um único Shell (`src/App.tsx`)
Usar **um único** `<ProtectedShell>` para todas as rotas protegidas. Cheques de permissão (backoffice/admin) movidos para componentes wrapper inline nas rotas individuais:

```text
Depois:
  <Route element={<ProtectedShell />}>     ← UM ÚNICO Shell (AppLayout monta 1 vez)
    Dashboard
    MinhasSolicitacoes
    Backoffice         ← permissão checada internamente
    Admin              ← permissão checada internamente
    DashboardSLA       ← permissão checada internamente
    etc.
  </Route>
```

Criar um componente `<RequireRole>` que checa permissão e redireciona se não autorizado, sem mostrar loading (auth já foi verificado pelo shell pai).

### 3. Loading mais leve no ProtectedShell
Ao invés da tela cheia com logo + spinner (que compete visualmente com o Suspense), usar apenas um spinner discreto centralizado. A logo já está no header do AppLayout — não precisa repetir no loading.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/assets/logos/logo-mega.png` | Substituir pela nova logo |
| `src/App.tsx` | Unificar 3 shells em 1, criar RequireRole, loading simplificado |

