## Objetivo

Transformar o produto de "sistema de solicitações" em **Hub dos Megas**: uma home que apresenta os aplicativos disponíveis, dá acesso rápido ao que importa e deixa espaço claro para novos módulos.

## Arquitetura de navegação

```text
/                     → Hub dos Megas (nova home)
/solicitacoes         → Dashboard atual (hoje em "/")
/nova-solicitacao     → inalterado
/minhas-solicitacoes  → inalterado
/backoffice, /painel-fluig, /monitoramento-oc,
/garantias, /calendario, /notificacoes → inalterados
/admin/rateio-energia → inalterado (exposto como app "Energia")
```

- `/` passa a renderizar a nova página `Hub`; o Dashboard vira a rota `/solicitacoes`.
- Redirect de compatibilidade: quem chegar em `/dashboard` ou links antigos cai em `/solicitacoes`.
- Ambas continuam dentro do `ProtectedShell` (mesmo header/auth).

## Página Hub (`src/pages/Hub.tsx`)

1. **Saudação + contexto** — "Bom dia, {nome}", papel do usuário e data.
2. **Faixa de continuidade** — 3 atalhos contextuais por persona (ex.: solicitante → Nova Solicitação, pendências de correção, últimas solicitações; backoffice → fila de novas, aguardando solicitante).
3. **Grade de apps (bento)** — cards grandes, cada um com ícone, nome, descrição de uma linha, badge de status ao vivo e 2–3 links diretos:
   - **Solicitações** — badge com nº de itens pendentes; atalhos: Nova, Minhas, Backoffice (se papel), OC × NF, Garantias, Calendário.
   - **Energia** — rateio mensal; badge com a competência aberta; atalhos: Painel, Lançamentos, Faturas. Visível só para admin.
   - **Administração** (só admin) — usuários, SLA, eficiência, excelência.
4. **Em breve** — cards em estado desabilitado, opacidade reduzida, badge "Em breve" e sem navegação (ex.: Contratos/Jurídico, Manutenção/Facilities, Indicadores). Servem de sinalização de roadmap.
5. **Rodapé leve** — atalho para `⌘K` e link "O que há de novo".

Visibilidade por papel reaproveita `useAuth` (`isAdmin`, `isBackofficeOrAdmin`); nada de card visível sem permissão.

## Ajustes de shell (`AppLayout`)

- Logo no header aponta para `/` (Hub) e ganha rótulo "Hub".
- Item de nav "Dashboard" passa a apontar para `/solicitacoes`; menu mobile idem.
- `prefetchRoute` e `AppBreadcrumbs` atualizados com as novas rotas ("Hub" como raiz, "Solicitações" como nível intermediário).
- `CommandPalette` ganha entrada "Hub" e corrige o caminho do Dashboard.

## Detalhes técnicos

- Novo arquivo `src/pages/Hub.tsx` + `src/components/hub/AppCard.tsx` (card reutilizável com props `title/description/icon/badge/links/disabled`).
- Catálogo de apps em `src/lib/hub-apps.ts` — array tipado com `visible(auth)` e `links[]`, para adicionar apps futuros em um só lugar.
- Rotas em `src/App.tsx`: `index` → `Hub`, nova rota `solicitacoes` → `Dashboard`, redirect legado.
- Badges usam os hooks já existentes (`useDashboardMetrics`) sem novas queries pesadas; card de Energia usa contagem simples da competência aberta.
- Sem mudanças de banco, RLS ou edge functions.
- Design segue os tokens Mega (laranja `#E87722`, Montserrat) e componentes canônicos (`PageHeader`, `KpiCard`); nada de cor hardcoded.

## Fora de escopo

- Construir qualquer app novo além dos placeholders.
- Alterar regras de cálculo de energia ou fluxo de solicitações.
