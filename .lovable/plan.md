

## Propostas de Melhoria para a Plataforma

Analisei o código completo da aplicação e identifiquei melhorias de alto impacto em UX, performance e funcionalidade:

---

### 1. Resumo Executivo no Dashboard (Insight Rápido)

Atualmente o Dashboard mostra KPIs numéricos, mas falta um **resumo textual inteligente** que diga em linguagem natural o que merece atenção.

**Proposta:** Adicionar um card de "Resumo do Dia" no topo do Dashboard que gere frases como:
- "Você tem 3 OCs aguardando liberação e 1 correção pendente."
- "2 solicitações foram concluídas desde ontem."
- "Nenhuma ação pendente -- tudo em dia!"

**Arquivo:** `src/pages/Dashboard.tsx` -- novo componente inline baseado nos dados de `useDashboardMetrics`.

---

### 2. Atalhos de Teclado Globais

O `CommandPalette` já existe (Cmd+K), mas falta documentação visível e atalhos diretos para ações frequentes.

**Proposta:** Adicionar um rodapé discreto na paleta de comandos mostrando atalhos (ex: `N` = Nova Solicitação, `B` = Backoffice). Registrar esses atalhos globalmente no `AppLayout`.

**Arquivos:** `src/components/CommandPalette.tsx`, `src/components/layout/AppLayout.tsx`

---

### 3. Indicador de Tempo no Status (SLA Visual no Card)

Os cards de solicitação mostram status textual, mas o solicitante não tem noção de **há quanto tempo** está naquele status.

**Proposta:** Adicionar um texto discreto no card tipo "Há 3 dias neste status" usando o componente `TimeInStatusBadge` que já existe mas não está integrado nos cards do solicitante.

**Arquivo:** `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` -- integrar `TimeInStatusBadge` no header do card.

---

### 4. Filtro por Empreendimento nas Solicitações

Na página "Minhas Solicitações", quando o usuário está no modo "Por Empreendimento", não há filtro para selecionar qual empreendimento visualizar.

**Proposta:** Adicionar um `Select` de empreendimento no `FilterBar` quando `viewMode === 'empreendimento'`, filtrando a lista por projeto específico.

**Arquivo:** `src/pages/MinhasSolicitacoes.tsx` -- adicionar um `FilterConfig` condicional ao `FilterBar`.

---

### 5. Feedback de Sucesso ao Criar Solicitação (Celebração)

Após criar uma solicitação, o usuário é redirecionado para "Minhas Solicitações" com um toast simples. Falta um momento de **celebração visual**.

**Proposta:** Ao chegar em `/minhas-solicitacoes` com query param `?created=PROTOCOLO`, exibir um banner temporário verde no topo: "Solicitação #PROTOCOLO criada com sucesso! O backoffice foi notificado." que desaparece após 8 segundos.

**Arquivos:** `src/pages/NovaSolicitacao.tsx` (adicionar query param no navigate), `src/pages/MinhasSolicitacoes.tsx` (ler param e exibir banner).

---

### Resumo de Impacto

| Melhoria | Esforço | Impacto UX |
|----------|---------|------------|
| Resumo do Dia | Baixo | Alto -- contexto imediato |
| Atalhos de Teclado | Médio | Médio -- power users |
| Tempo no Status | Baixo | Alto -- reduz ansiedade |
| Filtro Empreendimento | Baixo | Alto -- usabilidade |
| Celebração ao Criar | Baixo | Médio -- satisfação |

