## Objetivo

1. Criar uma página inicial do app Financeiro em `/financeiro`, com três cards de entrada.
2. Limpar a Home do Hub: remover a faixa de atalhos (Fila do Backoffice, Aguardando solicitante, Nova solicitação), deixando apenas "Seus aplicativos" (e "Em breve").

## 1. Home do Financeiro (`/financeiro`)

Nova página `src/pages/FinanceiroHome.tsx`:

- Cabeçalho com nome do app, saudação curta e data.
- Grid com 3 cards clicáveis, cada um com ícone, contagem em destaque e descrição:
  - **Minhas Solicitações** → `/minhas-solicitacoes` — total de solicitações do usuário.
  - **Aprovações pendentes** → `/minhas-solicitacoes?filter=oc_emitida` — OCs aguardando liberação/aceite do usuário (para backoffice/admin, a fila de aprovação).
  - **Devoluções** → `/minhas-solicitacoes?filter=correcoes` — solicitações devolvidas para correção.
- Números vêm de `useDashboardMetrics` (`total`, `pendingAcceptance`, `pendingCorrections`), já existente. Estado de carregamento com skeleton nos números.
- Abaixo dos cards, uma linha discreta de links para o restante do app (Dashboard, Backoffice, OC × NF, Calendário), conforme permissão.

Rota: `<Route path="financeiro" element={<FinanceiroHome />} />` dentro de `ProtectedShell` em `src/App.tsx` (lazy, como as demais).

Navegação:
- `src/lib/hub-nav.ts`: incluir `/financeiro` em `FINANCEIRO_ROUTES`, trocar `home` do app para `/financeiro` e adicionar o item "Início" no menu do Financeiro (mantendo Dashboard em `/solicitacoes`).
- `src/lib/hub-apps.ts`: o card Financeiro do Hub passa a apontar para `/financeiro`.
- Breadcrumbs: `Hub › Financeiro` na nova rota.

## 2. Hub mais limpo

Em `src/pages/Hub.tsx`:
- Remover a seção "Atalhos" (os três cards) e o array `atalhos`.
- Manter saudação, "Seus aplicativos", "Em breve" e a dica do ⌘K.
- Manter o badge de pendências no card do Financeiro (usa `useDashboardMetrics`), removendo imports que ficarem sem uso.

## Notas técnicas

- Sem mudanças de banco de dados nem de regras de negócio; apenas UI e rotas.
- Reaproveita tokens e componentes existentes (`Card`, `ds-text-h1`, `AppCard`), sem cores hardcoded.
- `/solicitacoes` continua funcionando como o Dashboard atual; `/financeiro` é apenas a porta de entrada do app.
