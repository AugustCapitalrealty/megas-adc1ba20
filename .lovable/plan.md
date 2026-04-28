## Diagnóstico do comportamento atual

### Solicitante — "Aguardando Ciência"
- Métrica `pendingCiencia` e a aba **Aguardando Ciência** contam **toda** solicitação `cancelado` sem `cancelamento_ciencia_em`. Inclui:
  - Auto-cancelamento por 30 dias ✅ (correto)
  - Cancelamento aprovado pelo backoffice ✅ (correto, conforme regra)
  - Mas também antigas solicitações canceladas pelo backoffice antes da feature existir (sem `acao = cancelamento_solicitado` do solicitante) → aparecem indevidamente.
- O **botão "Confirmar ciência" só aparece** quando `isPrazoExpirado` (texto do motivo contém "prazo" + "expirou"). Para cancelamentos manuais do backoffice, a solicitação aparece na aba/contagem mas **não tem botão visível** dentro do card → usuário não consegue dar ciência facilmente.
- Há um botão em massa `handleDarCiencia` no header (chip "Dar ciência"), mas dentro do card o CTA está condicionado ao prazo expirado.

### Backoffice — Cancelamento por tempo
- A função `check-correction-deadline` **já notifica** todos os usuários backoffice/admin com `tipo='action_required'`, marcando `prioridade='high'` quando a solicitação tinha `numero_chamado_fluig` (texto da mensagem inclui "verifique se há processo no Fluig para cancelar"). ✅
- **Porém** não há nenhuma indicação visual persistente no painel do backoffice de que aquela solicitação cancelada exige ação no Fluig. O badge `Cancelado por falta de resposta` existe no card, mas não há:
  - Sub-aba/filtro dedicado em **Backoffice → Canceladas** para "Auto-canceladas com Fluig (verificar)".
  - Mecanismo para o backoffice **marcar como tratado** (cancelado no Fluig), zerando a pendência.
- Notificações ficam na sineta, podem se perder no volume diário.

### Confirmação no banco
- Há registros como `protocolo 2026000153` (`numero_chamado_fluig: 150705`, status `cancelado`, sem ciência) e `2026000200` que são casos clássicos: cancelados, com Fluig aberto, sem nenhuma marcação de tratamento.

---

## Plano de correção

### 1. UI do solicitante — generalizar "Confirmar ciência"
- No `SolicitanteSolicitacaoCard.tsx`, **mostrar o bloco de "Confirmar ciência" para todo cancelamento sem `cancelamento_ciencia_em`**, não só para prazo expirado. Variantes:
  - Prazo expirado → tom warning + texto atual ("Cancelada automaticamente — prazo de 30 dias expirado").
  - Cancelado pelo backoffice → tom destructive + texto "Cancelada pelo backoffice. Motivo: ...".
  - (Cancelamento iniciado pelo próprio solicitante já é auto-marcado pelo trigger `auto_set_ciencia_self_cancellation` → não cai aqui.)

### 2. Backfill de ciência para canceladas legadas
- Migration: marcar `cancelamento_ciencia_em = updated_at` para todas as canceladas com mais de 30 dias e sem ação `cancelamento_aprovado` ou `prazo_*_expirado` recente — limpa a poluição da aba sem afetar casos novos.

### 3. Backoffice — Pendência de "Cancelado com Fluig em aberto"
- Adicionar coluna `fluig_cancelamento_tratado_em timestamptz` em `solicitacoes` (e `fluig_cancelamento_tratado_por uuid`).
- No `Backoffice.tsx`:
  - Nova sub-aba/badge dentro de **Canceladas**: "**Verificar Fluig** (N)" → lista todas as canceladas (auto ou manual) que tenham `numero_chamado_fluig` preenchido e ainda **não foram marcadas como tratadas**.
  - Card/linha com botão **"Marcar Fluig cancelado"** que:
    - Seta `fluig_cancelamento_tratado_em = now()` e `_por = auth.uid()`.
    - Insere histórico `acao = 'fluig_cancelamento_tratado'` com motivo opcional.
- Badge no card backoffice: "Fluig pendente de cancelamento" (destaque amber) quando aplicável.

### 4. Notificação proativa ao backoffice
- A função `check-correction-deadline` já cria `notifications`. Adicionar:
  - Quando o **backoffice aprovar um cancelamento** (`handleAprovarCancelamento` em `Backoffice.tsx`) **e** a solicitação tiver `numero_chamado_fluig`, criar `notifications` `action_required` para o próprio backoffice/admin grupo, com mensagem "Verifique se o processo Fluig X precisa ser cancelado".
- Card de **Insights diários** do backoffice: incluir contador "Canceladas com Fluig pendente de tratamento".

### 5. Limpeza/UX
- Renomear chip "Dar ciência" no header do solicitante para deixar claro que cobre cancelamentos automáticos **e** pelo backoffice (ex.: "Confirmar cancelamento").
- Tooltip explicando que confirmar a ciência apenas remove a pendência da lista; a solicitação permanece cancelada no histórico.

---

## Arquivos afetados (estimativa)

- `supabase/migrations/<new>.sql` — nova coluna + índice + backfill de ciência.
- `src/integrations/supabase/types.ts` — auto-regenera.
- `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` — generalizar bloco de ciência.
- `src/components/solicitante/PendingHeaderChips.tsx` — texto do chip.
- `src/pages/MinhasSolicitacoes.tsx` — selecionar nova coluna se necessário (não crítico).
- `src/pages/Backoffice.tsx` — sub-aba "Verificar Fluig", contagem, handler "marcar tratado".
- `src/components/backoffice/BackofficeSolicitacaoCard.tsx` — novo badge + botão "Marcar Fluig cancelado".
- `src/hooks/useBackofficeSolicitacoes.ts` — incluir flags na query.
- `supabase/functions/check-correction-deadline/index.ts` — nenhuma mudança obrigatória (já notifica), mas podemos enriquecer mensagem/link.
- Trigger opcional: ao aprovar cancelamento manual com Fluig, marcar a flag de pendência (alternativa a tratar no front).

---

## Resultado esperado

- Solicitante consegue confirmar ciência de **qualquer** cancelamento (auto ou backoffice) com botão visível no próprio card.
- Aba "Aguardando Ciência" passa a refletir apenas casos realmente acionáveis (sem o lixo legado).
- Backoffice tem **uma fila própria** ("Verificar Fluig") com todas as canceladas que ainda exigem cancelamento no Fluig, com botão para resolver — sem depender só da sineta.
