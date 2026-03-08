

# Plano: Login exclusivo Google com popup (funciona no preview)

## Problema

1. O login Google atual usa **redirect** (`signInWithOAuth`), que não funciona bem dentro do iframe do preview do Lovable — o redirect sai do iframe e perde o contexto.
2. O formulário de email/senha ainda está presente, mas o usuário quer apenas Google.

## Solução

1. **Migrar para `lovable.auth.signInWithOAuth("google")`** — o SDK do Lovable Cloud abre uma **janela popup** para o Google, que funciona perfeitamente dentro do preview (sem sair do iframe).
2. **Remover completamente** o formulário de email/senha da tela de login.
3. **Simplificar** a tela de login: logo, título, botão Google grande, e pronto.

## Alterações

### 1. Configurar Social Login (ferramenta do Lovable)
Usar a ferramenta "Configure Social Login" para gerar o módulo `src/integrations/lovable/index` com suporte a Google OAuth via popup.

### 2. `src/hooks/useAuth.tsx`
- Trocar `supabase.auth.signInWithOAuth({ provider: 'google' })` por `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`.
- Importar `lovable` de `@/integrations/lovable/index`.

### 3. `src/pages/Login.tsx`
- Remover todo o bloco de email/senha (states, form, handlers).
- Manter apenas o botão Google com visual limpo.
- Remover imports não usados (`Input`, `Label`, `ChevronDown`, `ChevronUp`).

| Arquivo | Alteração |
|---------|-----------|
| Configuração Social Login | Gerar módulo lovable com Google OAuth |
| `src/hooks/useAuth.tsx` | Usar `lovable.auth.signInWithOAuth` |
| `src/pages/Login.tsx` | Remover email/senha, manter só Google |

