

# Plano: Experiencia por Persona + Notificacoes Inteligentes + Onboarding Persistido + Central de Notificacoes

Quatro melhorias interligadas que transformam a experiencia de "tamanho unico" para uma UX adaptada por perfil.

---

## 1. Navegacao e CTAs por Persona

**Problema:** Solicitante ve links de Backoffice/Monitoramento/Garantias que nao usa. Backoffice ve "Nova Solicitacao" em destaque quando raramente cria.

**Solucao:** Ajustar `AppLayout.tsx` e `Dashboard.tsx` com base no role do usuario.

| Elemento | Solicitante | Backoffice | Admin |
|----------|-------------|------------|-------|
| CTA principal header | "Nova Solicitacao" | "Backoffice" (destaque) | "Admin" dropdown |
| Nav items visiveis | Solicitacoes, Painel Fluig | + Backoffice, Monitoramento, Garantias | + Admin items |
| Dashboard home | KPIs pessoais + acoes pendentes | KPIs gerais + fila de trabalho | KPIs gerais + metricas admin |
| FAB mobile | Nova Solicitacao | Ir ao Backoffice | — |

**Arquivos:** `src/components/layout/AppLayout.tsx`, `src/pages/Dashboard.tsx`

**Logica:** Usar `effectiveRoles` do `useAuth` para determinar persona. Solicitante = sem role backoffice/admin. Backoffice = tem role backoffice. Admin = tem role admin. Manter toggle "Minhas/Geral" para backoffice que tambem cria solicitacoes.

---

## 2. Notificacoes com Prioridade e Governanca SLA

**Problema:** Todas as notificacoes tem o mesmo peso visual. `action_required` misturado com `info` sem urgencia temporal.

**Solucao:** Adicionar campo `prioridade` na tabela `notifications` e logica de urgencia baseada em SLA.

**Migration SQL:**
- Adicionar coluna `prioridade` (`critical`, `high`, `normal`, `low`) com default `normal`
- Atualizar triggers existentes para definir prioridade:
  - `pendente_correcao` → `critical` (requer acao do solicitante)
  - `aguardando_nf_boleto` → `high`
  - `oc_ac_emitida`, `liberado_fornecedor` → `high` (backoffice)
  - `info`, `success` → `normal`
- Criar funcao `update_notification_priority_by_age()` que pode ser chamada para escalar prioridade de notificacoes nao lidas apos X dias

**NotificationBell atualizado:**
- Ordenar por prioridade (critical primeiro) depois por data
- Badge vermelho pulsante para critical
- Separar em 3 grupos: "Urgente", "Acoes pendentes", "Informativo"
- Mostrar tempo restante para acoes com prazo (ex: "2 dias para corrigir")

**Arquivos:** Migration SQL, `src/components/NotificationBell.tsx`, triggers `notify_status_change`, `notify_from_historico`

---

## 3. Onboarding Persistido por Perfil

**Problema:** `localStorage('onboarding_done')` — reseta em novo browser, ignora perfil.

**Solucao:** 
- Adicionar coluna `onboarding_completed_at` na tabela `profiles`
- Criar steps diferentes por role:
  - **Solicitante:** Criar solicitacao → Acompanhar status → Notificacoes
  - **Backoffice:** Fila de trabalho → Analisar solicitacao → Emitir OC/AC → Painel Fluig
  - **Admin:** Gerenciar usuarios → Dashboard SLA → Configurar rateio
- `WelcomeTour` le do banco se `onboarding_completed_at` e null, salva no banco ao completar
- Fallback: manter localStorage como cache para evitar flash

**Arquivos:** Migration SQL (profiles), `src/components/WelcomeTour.tsx`, `src/pages/Dashboard.tsx`

---

## 4. Central de Notificacoes (pagina dedicada)

**Problema:** "Ver todas" no sino leva para `/minhas-solicitacoes`. Notificacoes antigas somem do dropdown (limit 20).

**Solucao:** Criar pagina `/notificacoes` com:
- Lista completa paginada (infinite scroll, 50 por pagina)
- Filtros: Tipo (acao/info/sucesso/erro), Prioridade, Lida/Nao lida
- Busca por texto no titulo/mensagem
- Acoes em massa: marcar como lida, excluir
- Link direto para solicitacao associada
- Atualizar `NotificationBell` para linkar "Ver todas" → `/notificacoes`

**Arquivos:** `src/pages/Notificacoes.tsx` (novo), `src/App.tsx` (rota), `src/components/NotificationBell.tsx`, `src/components/layout/AppLayout.tsx` (nav)

---

## Resumo de Implementacao

| Item | Tipo | Arquivos |
|------|------|----------|
| Navegacao por persona | Code | AppLayout, Dashboard |
| Prioridade notificacoes | SQL + Code | Migration, NotificationBell, triggers |
| Onboarding persistido | SQL + Code | Migration (profiles), WelcomeTour |
| Central notificacoes | Code + Route | Notificacoes.tsx, App.tsx, NotificationBell |

**2 migrations SQL** + **6 arquivos editados** + **1 pagina nova**

