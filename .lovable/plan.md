## Objetivo

O Hub (`/`) vira uma home limpa: sem a faixa de navegação de módulos no topo. Essa faixa passa a ser **contextual do app**, aparecendo apenas quando a pessoa entra no app hoje chamado "Solicitações", que passa a se chamar **Financeiro**.

## 1. Header em dois modos

`src/components/layout/AppLayout.tsx` passa a decidir o modo pela rota atual:

- **Modo Hub** (`/`): apenas logo Mega, busca (⌘K), sino de notificações e avatar. Sem itens de módulo, sem CTA "Nova", sem dropdown Admin. No mobile, o menu lateral também some (só perfil/tema/sair).
- **Modo App** (demais rotas do shell): logo + um "app switcher" discreto à esquerda mostrando o app atual (ex.: `Mega | Financeiro`) com link de volta ao Hub, seguido da faixa de navegação daquele app.

A faixa de navegação deixa de ser uma lista global e passa a ser derivada do app atual.

## 2. Navegação por app

Criar um mapa em `src/lib/hub-apps.ts` (ou arquivo irmão `hub-nav.ts`) que, dado o `pathname`, resolve o app ativo e sua navegação:

- **Financeiro** — rotas `/solicitacoes`, `/nova-solicitacao`, `/minhas-solicitacoes`, `/backoffice`, `/painel-fluig`, `/calendario`, `/monitoramento-oc`, `/garantias`, `/notificacoes`, `/admin/sla`, `/admin/eficiencia`
  Nav: Dashboard · Solicitações · Backoffice (backoffice/admin) · Painel · Calendário · OC × NF · Garantias (backoffice/admin) · Notificações (solicitante)
  CTA primário: **Nova solicitação**
- **Energia** — `/admin/rateio-energia` → nav própria (Painel do rateio), sem itens de Financeiro
- **Administração** — `/admin/usuarios`, `/admin/excelencia`, `/admin/design-system` → nav própria (Usuários · Excelência · Design System)

O dropdown "Admin" atual, que misturava tudo, é removido do header; seus itens passam a viver nos apps correspondentes e no card do Hub.

## 3. Renomear Solicitações → Financeiro

Apenas rótulos de interface (as rotas continuam `/solicitacoes` etc., sem quebrar links salvos):

- `src/lib/hub-apps.ts`: card `Financeiro`, descrição "Compras, contratos, OCs e acompanhamento financeiro de ponta a ponta".
- `src/pages/Hub.tsx`: badge e textos de atalho.
- `src/components/layout/AppBreadcrumbs.tsx`: breadcrumb `Hub › Financeiro › <página>`.
- `src/components/CommandPalette.tsx`: grupo "Financeiro".
- Dentro do app, o item de nav que hoje é "Solicitações" (lista) continua "Minhas solicitações"; o "Dashboard" continua "Dashboard".

## 4. Ajustes na Home do Hub

- Ampliar o respiro do topo (sem a faixa, a saudação vira o primeiro elemento).
- Atalhos e cards continuam como estão, com o card principal renomeado para Financeiro.
- Card "Energia" e "Administração" ganham o mesmo tratamento de entrada por app.

## Detalhes técnicos

- Resolução do app ativo por prefixo de rota, com fallback "sem app" → modo Hub.
- `prefetchRoute` continua, mas alimentado pela lista de rotas do app ativo.
- Sem mudanças de backend, permissões ou regras de negócio; `RequireRole` permanece intacto.
- Atualizar `src/App.guards.test.tsx` apenas se algum seletor de texto quebrar.
