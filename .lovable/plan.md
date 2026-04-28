## Diagnóstico (auditoria nos 2 casos)

### 2026000146 (Amanda → Mega Itajaí)
- **Solicitante pediu cancelamento** em 2026-04-09 11:45 — gravado em `oc_acompanhamento` ✅
- **NÃO foi gravado em `historico_solicitacoes`** ❌ → tela do solicitante não mostra "quem pediu / quando"
- Backoffice **aprovou 5 vezes** (09/04, 09/04, 13/04, 16/04, 17/04) → 5 registros duplicados de `cancelamento_aprovado` (botão sem guard de idempotência / sem disable após sucesso)
- Como o `cancelamento_solicitado` não foi parar em `historico_solicitacoes`, o trigger `auto_set_ciencia_self_cancellation` **não disparou** → ficou em "Aguardando ciência" indevidamente

### 2026000272 (Amanda → Mega Itajaí)
- Solicitante pediu cancelamento em 2026-04-23 13:01 — gravado em `oc_acompanhamento` ✅
- **NÃO foi gravado em `historico_solicitacoes`** ❌
- Status mudou para `cancelado` sem **nenhum** registro de aprovação no histórico nem em `oc_acompanhamento` (último evento real é "atualizacao_fluig: Finalizada" em 07/04). Provavelmente um update direto/job. Não há rastro de "quem aprovou / quando".

### Causa raiz comum
1. **`MonitoramentoOC.handleSolicitarCancelamento`** (linhas 341-369) e **`MinhasSolicitacoes.handleCancelar`** (537-547): o primeiro **não** insere em `historico_solicitacoes`; o segundo insere. Resultado: pedidos vindos de telas diferentes têm rastreabilidade diferente. Trigger de auto-ciência depende do histórico → falha em 50% dos casos.
2. **`Backoffice.handleAprovarCancelamento`**: não verifica se o status já é `cancelado`; permite múltiplas aprovações duplicadas.
3. Pedido do usuário (correto): se o **solicitante** pediu e o **backoffice** aprovou, ciência deve ser **automática**. Hoje o trigger só dispara olhando `historico_solicitacoes` — vamos ampliá-lo para considerar também `oc_acompanhamento`.

---

## Plano de correção

### 1. Padronizar gravação do pedido de cancelamento
- Em `MonitoramentoOC.tsx → handleSolicitarCancelamento`: inserir também em `historico_solicitacoes` (mesmo padrão de `MinhasSolicitacoes`):
  ```ts
  acao: 'cancelamento_solicitado',
  status_anterior: <status atual>, status_novo: <status atual>,
  motivo: justificativa
  ```

### 2. Trigger inteligente de ciência automática
- Migration: atualizar `auto_set_ciencia_self_cancellation()` para marcar `cancelamento_ciencia_em = now()` se **qualquer** uma das condições for verdadeira:
  - existe `historico_solicitacoes.acao = 'cancelamento_solicitado'` com `user_id = solicitacoes.user_id` (atual), **OU**
  - existe `oc_acompanhamento.tipo_acao = 'cancelamento_solicitado'` com `user_id = solicitacoes.user_id` (novo).
- Garante que pedidos antigos de qualquer origem fechem o loop sozinhos.

### 3. Idempotência ao aprovar cancelamento (Backoffice)
- Em `handleAprovarCancelamento`: adicionar guard inicial — se `sol.status === 'cancelado'`, abortar com toast informativo ("Já cancelado").
- No componente do card/modal, esconder/desabilitar o botão "Aprovar cancelamento" quando `status === 'cancelado'`.
- (Opcional) Constraint parcial para impedir histórico duplicado:
  ```sql
  CREATE UNIQUE INDEX ... ON historico_solicitacoes (solicitacao_id) WHERE acao = 'cancelamento_aprovado';
  ```
  Pode ser arriscado em legado — preferimos guard no app + DELETE manual dos duplicados existentes.

### 4. Backfill / limpeza dos casos investigados
- **2026000146**: 
  - Inserir registro retroativo em `historico_solicitacoes` (`acao='cancelamento_solicitado'`, `user_id=solicitante`, `motivo` da `oc_acompanhamento`, `created_at = 2026-04-09 11:45`).
  - Apagar 4 dos 5 `cancelamento_aprovado` duplicados em `historico_solicitacoes` e `oc_acompanhamento` (manter o primeiro).
  - Marcar `cancelamento_ciencia_em = updated_at` (a aprovação já aconteceu há tempos).
- **2026000272**:
  - Inserir registro retroativo `cancelamento_solicitado` no histórico (a partir do `oc_acompanhamento` de 23/04).
  - Inserir registro retroativo `cancelamento_aprovado` (`user_id` = system/admin disponível, `motivo='Cancelamento registrado retroativamente — origem não rastreada'`).
  - Marcar `cancelamento_ciencia_em = now()` (pedido pelo próprio solicitante → ciência automática).
- Migration única, idempotente.

### 5. Limpeza de duplicatas globais
- Identificamos **3 solicitações** com `cancelamento_aprovado` duplicado. Migration de limpeza: manter o **primeiro** registro de cada par (solicitacao_id + acao='cancelamento_aprovado'), apagar os demais — tanto em `historico_solicitacoes` quanto em `oc_acompanhamento`.

### 6. UX do card "Aguardando Ciência"
- No `SolicitanteSolicitacaoCard`: ao montar, **derivar o autor do cancelamento** a partir do histórico:
  - Se existe `cancelamento_solicitado` do próprio user → exibir "Cancelada por você em DD/MM" (e nem aparece para ciência, pois o trigger marca automaticamente).
  - Se aprovado pelo backoffice sem pedido → exibir "Cancelada pelo backoffice em DD/MM por <nome>".
  - Se prazo expirado → mantém texto atual.

---

## Arquivos afetados

**Frontend**
- `src/pages/MonitoramentoOC.tsx` — adicionar insert em `historico_solicitacoes` no fluxo de pedido.
- `src/pages/Backoffice.tsx` — guard de idempotência em `handleAprovarCancelamento`.
- `src/components/backoffice/BackofficeSolicitacaoCard.tsx` / `BackofficeModals.tsx` — esconder ação se já cancelado.
- `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` — texto contextual com nome/data do autor do cancelamento.

**Backend (migration única)**
- Atualizar função `auto_set_ciencia_self_cancellation()` para olhar também `oc_acompanhamento`.
- Backfill 2026000146 e 2026000272.
- Limpeza de `cancelamento_aprovado` duplicados (3 solicitações).
- Backfill de `cancelamento_ciencia_em` para todos onde existir pedido do próprio solicitante (qualquer origem).

---

## Resultado esperado

- "Aguardando Ciência" passa a refletir apenas cancelamentos sem pedido do solicitante (auto por prazo ou unilateral pelo backoffice).
- Pedidos feitos pelo solicitante em qualquer tela (Minhas Solicitações ou Monitoramento OC) ficam totalmente rastreáveis e fecham a ciência automaticamente quando aprovados.
- Backoffice não consegue mais aprovar cancelamento duas vezes; histórico fica limpo.
- Os dois casos auditados ficam corrigidos imediatamente pela migration de backfill.
