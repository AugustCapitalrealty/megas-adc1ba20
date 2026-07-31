## Objetivo

Arrumar a barra superior do Financeiro: unificar Início/Dashboard, renomear OC × NF, agrupar itens secundários num menu suspenso e corrigir a quebra de linha do header.

## 1. Remover a home nova do Financeiro

- Excluir `src/pages/FinanceiroHome.tsx`.
- `src/App.tsx`: remover a rota `/financeiro` e o lazy import.
- `src/lib/hub-apps.ts`: card do Financeiro volta a apontar para `/solicitacoes`.
- `src/components/layout/AppBreadcrumbs.tsx`: remover `/financeiro` e renomear `/solicitacoes` para "Início".

## 2. Novo menu do Financeiro (`src/lib/hub-nav.ts`)

- `home` volta a ser `/solicitacoes`.
- CTA primário continua **Nova Solicitação**.
- Itens visíveis na barra:
  1. **Início** → `/solicitacoes` (o Dashboard atual, apenas renomeado)
  2. **Solicitações** → `/minhas-solicitacoes`
  3. **Backoffice** → `/backoffice` (só backoffice/admin)
  4. **Painel** → `/painel-fluig`
  5. **Calendário** → `/calendario`
  6. **Monitoramento** → `/monitoramento-oc` (antigo "OC × NF")
- Novo campo opcional `menu` no `AppNavContext`: grupo suspenso **"Mais"** com
  - Garantias (backoffice/admin)
  - SLA (backoffice/admin)
  - Eficiência (backoffice/admin)
  - Notificações (solicitante)
  O grupo só aparece se tiver itens.

## 3. Header (`src/components/layout/AppLayout.tsx`)

- Renderizar o grupo "Mais" como `DropdownMenu` (trigger com ícone + rótulo), marcado como ativo quando a rota atual pertence ao grupo.
- Corrigir o bug visual: `flex-nowrap` + `whitespace-nowrap` nos links e exibir os rótulos a partir de `lg` (hoje só em `xl`), evitando o texto quebrar em duas linhas como no print.
- No menu mobile, os itens do grupo aparecem numa seção "Mais" abaixo dos principais (sem dropdown).
- Manter prefetch das rotas.

## Notas técnicas

- Somente UI/rotas; nenhuma mudança de dados ou regras de negócio.
- `/monitoramento-oc` continua a mesma rota, só muda o rótulo; breadcrumb passa a "Monitoramento".
- Command Palette: atualizar os rótulos correspondentes (Dashboard → Início, OC × NF → Monitoramento).
