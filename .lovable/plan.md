# Auditoria 2026000731 — correção e blindagem

## Diagnóstico
- Solicitação `AC / materiais_informatica / semMemorial / exceção de fornecedores` foi promovida a `recebido` sem nenhum registro em `anexos` nem objeto em `storage`.
- Nenhum erro em `error_logs`, nenhum evento em `solicitacao_draft_audit`, nenhuma telemetria `submit_failed` — o frontend simplesmente não travou.
- A regra desse cenário exige **Proposta do Fornecedor** e **Comprovação da Justificativa**. Como o único guard-rail hoje é no cliente, qualquer estado transitório ou race no clique fura a validação. Foi bug.

## O que fazer

### 1. Guard-rail no servidor (fim do bug para sempre)
Migration com trigger `AFTER INSERT/UPDATE OF status ON solicitacoes`:
- Quando `NEW.status` sair de `rascunho` para `recebido` (ou insert direto em `recebido`), rodar `has_required_anexos(NEW)` que replica a regra de `getRequiredAttachments`:
  - AC não-emergencial → exige `orcamento_escolhido`; exige `escopo_detalhado` se `justificativa_sem_memorial IS NULL`; exige `justificativa_anexo` se `excecao_fornecedores` ou `fornecimento_exclusivo`, senão exige `orcamento_concorrente_1/2` + `mapa_cotacao`.
  - AC emergencial → exige `orcamento_escolhido`.
  - OC água/energia → exige `fatura_agua_energia`. OC demais → exige `orcamento_escolhido`.
  - `origem_custo='cliente'` → exige `comunicado_cliente`.
- Se faltar, `RAISE EXCEPTION` com mensagem que lista os tipos faltantes. Isso garante que mesmo um POST direto no PostgREST não passa.

### 2. Telemetria do envio (para o próximo caso)
Em `src/pages/NovaSolicitacao.tsx#handleSubmit`:
- Antes do INSERT, `track('submit_attempt', { tipo, natureza, semMemorial, excecao, requiredTipos, presentTipos })`.
- Depois do INSERT bem-sucedido e antes do `uploadAnexos`, `track('submit_inserted_no_anexos', …)` **se** `Object.keys(formState.anexos).length === 0 && existingAnexoTipos.size === 0`.
- Registrar em `error_logs` (severity `warning`) qualquer submit em que a checagem de anexos passou mas o mapa está vazio — sinal claro do race.

### 3. Correção do chamado atual
Solicitação já está em `aguardando_informacoes` — Mauro pode reenviar os anexos pela tela "Minhas Solicitações". Nada a alterar em dados.

## Detalhes técnicos
- Novo arquivo de migration em `supabase/migrations/` criando função `public.solicitacao_requires_anexos(sol solicitacoes) returns text[]` + trigger `trg_solicitacao_anexos_check`.
- Reaproveitar enums existentes (`tipo`, `natureza_orcamentaria`).
- Cobrir migration com um teste manual: tentar `UPDATE solicitacoes SET status='recebido' WHERE id='<rascunho sem anexo>'` e confirmar exceção.
- No frontend, capturar erro do trigger com toast amigável ("O servidor rejeitou o envio porque faltam anexos: X, Y") e reabrir a etapa `anexos`.

## Fora de escopo
- Rever `getRequiredAttachments` (mantido como está — a regra está correta, o problema é falta de guarda no servidor).
- Alterações de UI da tela de nova solicitação além do toast do erro do trigger.
