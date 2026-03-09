

## Melhorar acessibilidade: aria-labels, skip-to-content e landmarks

### Problemas identificados

1. **Sem skip-to-content link** — usuários de teclado não conseguem pular para o conteúdo principal
2. **Landmarks ausentes** — `<div>` raiz sem role, banners sem `role="alert"`, nav sem `aria-label`
3. **Botões icon-only sem aria-label** — menu mobile, user avatar dropdown, admin dropdown, impersonation "Sair"
4. **Links icon-only sem aria-label** — nav links colapsados em telas < xl mostram só ícone sem texto acessível

### Mudanças

**`src/components/layout/AppLayout.tsx`**
- Adicionar link "Pular para conteúdo" antes do header (visível apenas com foco via `sr-only focus:not-sr-only`)
- `<main>` recebe `id="main-content"` e `role="main"`
- `<header>` recebe `role="banner"`
- `<nav>` desktop e mobile recebem `aria-label="Navegação principal"` e `aria-label="Menu mobile"`
- Banners de impersonation e offline recebem `role="alert"`
- Botão mobile menu: `aria-label="Abrir menu"`
- Botão avatar/user: `aria-label="Menu do usuário"`
- Botão admin dropdown: `aria-label="Menu administração"`
- Nav links icon-only: adicionar `aria-label={item.label}` no `<Link>`

**`src/components/NotificationBell.tsx`**
- Botão trigger: `aria-label="Notificações"` (com contagem de não lidas)

**`src/components/CommandPalette.tsx`**
- Botão trigger: `aria-label="Buscar (Ctrl+K)"`

**`src/components/FavoriteButton.tsx`**
- Já tem `aria-label` — sem mudança

### Arquivos afetados

| Arquivo | Mudança |
|---------|---------|
| `src/components/layout/AppLayout.tsx` | Skip link, landmarks, aria-labels em botões |
| `src/components/NotificationBell.tsx` | aria-label no trigger |
| `src/components/CommandPalette.tsx` | aria-label no trigger |

