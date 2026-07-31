## Objetivo

Transformar `/admin` em um **Hub de Administração**, onde o admin define, por usuário: quais apps do Hub ele enxerga e qual papel ele tem **dentro de cada app**.

## Modelo de acesso

Novo conceito: `app_key` + `app_role`.

```text
usuario ──► app_access ──► { app: financeiro, papel: backoffice }
                       └─► { app: energia,    papel: leitor    }
```

Apps e papéis (mantendo a nomenclatura atual):

| App | Papéis |
|---|---|
| Financeiro | solicitante · backoffice · admin |
| Energia | leitor · editor · fechador |
| Administração | admin (gestor do Hub) |

Regras:
- Sem registro em `app_access` para um app ⇒ o app **não aparece** no Hub nem nas rotas.
- `super_admin` continua acima de tudo (vê e faz tudo, sem depender de `app_access`).
- Empreendimentos continuam como hoje (`user_empreendimentos`), aplicados ao Financeiro.

## Migração automática (sem ninguém perder acesso)

A partir das roles atuais:
- `solicitante` ⇒ Financeiro/solicitante
- `backoffice` ⇒ Financeiro/backoffice
- `admin` ⇒ Financeiro/admin + Energia/fechador + Administração/admin
- `super_admin` ⇒ inalterado

## Banco de dados

- Enums `app_key` e `app_role_level`; tabela `user_app_access (user_id, app, papel)` com unicidade por usuário+app, timestamps e trigger de `updated_at`.
- GRANTs para `authenticated` (leitura própria) e `service_role`; RLS: cada um lê o próprio acesso, `admin`/`super_admin` gerenciam tudo (via função security definer, sem recursão).
- Funções: `has_app_access(_user, _app)`, `app_role_of(_user, _app)`, `is_app_at_least(_user, _app, _nivel)`.
- Backfill dos registros conforme a migração acima.
- As tabelas de energia passam a exigir `has_app_access(auth.uid(),'energia')` para escrita (leitura para quem tem o app), mantendo admin/super_admin.

## Tela: Hub de Administração (`/admin`)

Nova home do app Administração, em cards:
1. **Usuários & Acessos** (novo, principal)
2. **Solicitações** (gestão existente)
3. **Rateio / Configurações** (existente)
4. **Integrações** (WhatsApp/GChat, existente)
5. **Excelência** e **Design System** (existentes)

### Usuários & Acessos
- Lista com busca, filtro por app e por status (aprovado/pendente/sem acesso).
- Linha do usuário mostra chips: `Financeiro · backoffice`, `Energia · leitor`.
- Painel lateral ao clicar no usuário:
  - aprovar/revogar acesso à plataforma;
  - **matriz de apps**: switch por app + select do papel daquele app;
  - empreendimentos (como hoje);
  - modo férias/transferência (mantido);
  - resumo em texto do que a pessoa passa a enxergar.
- Ações em lote: aplicar um "preset" (Facilities, Backoffice Financeiro, Energia, Admin) a vários usuários.

## Frontend

- `src/hooks/useAppAccess.ts`: carrega o acesso do usuário efetivo (respeita impersonação) e expõe `hasApp(app)` / `appRole(app)` / `canApp(app, nivel)`.
- `useAuth` passa a expor esses dados; `isBackofficeOrAdmin`/`isAdmin` são recalculados a partir de Financeiro para não quebrar chamadas existentes.
- `src/lib/hub-apps.ts` e `src/lib/hub-nav.ts` filtram apps/itens por `hasApp`, não mais só por role global.
- `src/routes/guards.tsx`: novo `RequireApp app="energia" nivel="editor"` usado nas rotas de Energia e Administração; `RequireRole` mantido como wrapper.
- Estado vazio no Hub quando o usuário não tem nenhum app liberado.

## Detalhes técnicos

- Roles nunca ficam em `profiles`; `user_roles` continua existindo para `super_admin` e compatibilidade, `user_app_access` é a fonte de verdade dos apps.
- Toda checagem de UI é espelhada em RLS no banco — a tela nunca é a única barreira.
- Admin não consegue remover o próprio acesso de Administração (guarda no banco e na UI).
