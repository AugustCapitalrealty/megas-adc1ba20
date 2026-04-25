# Revisão ponta a ponta — Nova Solicitação

Após auditar o fluxo completo (`NovaSolicitacao.tsx`, `useNovaSolicitacaoForm`, `useNovaSolicitacaoErrors`, `FormNavigation`, `useFormPersistence`, guards de rota e RLS), identifiquei pontos que afetam usuários em diferentes situações. A maior parte da fundação está correta (lock anti-duplicidade, retry de protocolo, cooldown, validação por etapa). Os ajustes abaixo cobrem os casos restantes.

## Problemas encontrados

### 1. Rascunho restaurado deixa o usuário travado em "Anexos"
O draft salvo no localStorage **não inclui arquivos** (são `File` não-serializáveis). Quando o usuário restaura um rascunho que estava na etapa "Anexos" ou "Revisão", o `canSubmit` fica `false` porque `formState.anexos` está vazio, mas o usuário não percebe — ele vê a etapa "Revisão" e o botão desabilitado sem entender o motivo claramente.

**Correção:** quando o draft for restaurado, voltar automaticamente o `currentStep` para `'anexos'` se existir alguma etapa anterior à de anexos já preenchida; e mostrar um aviso explícito informando que os anexos precisam ser reenviados.

### 2. Empreendimento "todos" (rateio) não é validado
Se o usuário escolhe `empreendimento = todos`, o sistema espera `tipoRateio` e `rateioValores`, mas `validateStep` e `useStepErrors` não cobrem esse caso. O usuário pode enviar com rateio inválido (soma diferente do valor total ou nenhum empreendimento selecionado) e a solicitação cai com rateio nulo no banco.

**Correção:** adicionar validação da etapa `detalhes` (ou `descricao`, conforme onde o componente Rateio aparece) quando `empreendimento === 'todos'`:
- `rateioValores.length >= 2`
- soma de `rateioValores` igual a `valorNumerico` (tolerância 0.01)
- exibir `FieldError` correspondente

### 3. Origem "cliente" + anexo `comunicado_cliente` sem visibilidade no toast
Quando a origem é `cliente`, o anexo `comunicado_cliente` é exigido. Está coberto via `getRequiredAttachments`, mas se o usuário pular para a revisão sem ter passado por anexos, o toast só diz "Faltam informações". Já melhorado pelo `firstInvalidStep`, porém o toast pode listar quais anexos faltam para acelerar a correção.

**Correção:** quando o passo inválido for `anexos`, incluir no toast os labels dos anexos faltantes (já temos `stepErrors.anexos` com a lista).

### 4. "Solicitação criada com pendência" deixa estado inconsistente
Se o insert da solicitação é OK mas todos os retries de upload de anexos falham (ex: usuário em rede ruim), o código navega para `/minhas-solicitacoes` deixando a solicitação **sem os anexos obrigatórios**. O backoffice recebe o caso incompleto.

**Correção:** ao invés de aceitar a solicitação parcial, oferecer um botão "Reenviar anexos agora" no toast (ação) e manter o usuário na tela com `solicitacao_id` armazenado, permitindo o re-upload sem recriar a solicitação. O draft é limpo só após o upload bem-sucedido.

### 5. `effectiveProfile` x `user.id` no insert
`useNovaSolicitacaoForm` usa `effectiveProfile?.id ?? user?.id` para carregar empreendimentos (suporta impersonation), mas o `insertData.user_id` no `handleSubmit` usa **sempre** `user.id`. Em modo impersonation, isso cria a solicitação no nome do super_admin em vez do usuário simulado.

**Correção:** usar `effectiveUserId` consistentemente no insert (e no log de histórico). Mantém comportamento normal para usuários comuns e funciona corretamente em impersonation para QA.

### 6. Botão "Enviar" sem hint quando o problema está em outra etapa
O Tooltip atual diz apenas "Complete todas as etapas obrigatórias". O usuário não sabe **qual** etapa.

**Correção:** quando `canSubmit === false`, o tooltip mostra o nome da `firstInvalidStep` ("Falta completar: Fornecedor"). Tornar o conteúdo dinâmico passando `firstInvalidStepLabel` para `FormNavigation`.

### 7. Indicador de etapa não destaca etapas inválidas
Hoje o `StepIndicator` mostra apenas a etapa corrente. Usuário não vê de relance quais etapas têm pendência ao chegar na "Revisão".

**Correção:** marcar visualmente no `StepIndicator` as etapas com `validateStep(s.id) === false` (badge de alerta). Permite clique direto na etapa pendente.

### 8. Resetar `outrosAnexos` no `resetForm`
`resetForm` zera `anexos` mas no log atual não está em contexto: `setOutrosAnexos([])` está presente — ok. Mantido.

### 9. `nenhumaOpcaoNatureza` na etapa Natureza não bloqueia avanço
A etapa `natureza_servico` retorna `true` sempre em `validateStep`. Para AC, o usuário deveria marcar pelo menos uma opção ou "Nenhuma das opções acima" para registrar a escolha consciente.

**Correção:** na etapa `natureza_servico`, exigir que ao menos uma das checkboxes (incluindo `nenhumaOpcaoNatureza`) esteja marcada. Adicionar erro inline.

### 10. Telemetria de falhas
Hoje só fica em `console.error`. Não há rastro para diagnosticar por que um usuário específico não consegue enviar.

**Correção:** disparar `track('submit_failed', { step, reason })` em cada return cedo de `handleSubmit` e `track('submit_success', { protocolo })` no caminho feliz. Já temos `useTrackEvent` ativo.

## Arquivos a alterar

- `src/pages/NovaSolicitacao.tsx`
  - usar `effectiveUserId` no insert/histórico
  - passar `firstInvalidStepLabel` para `FormNavigation`
  - melhorar toast de "Faltam informações" (incluir lista de anexos)
  - tratamento de pendência de anexos com retry manual
  - eventos de telemetria
  - lógica de redirecionamento ao restaurar draft sem anexos
- `src/hooks/useNovaSolicitacaoForm.ts`
  - validação extra exposta para rateio quando `empreendimento === 'todos'`
- `src/hooks/useNovaSolicitacaoErrors.ts`
  - novo case para `natureza_servico`
  - erros de rateio em `detalhes` (ou onde o componente é exibido)
- `src/components/nova-solicitacao/FormNavigation.tsx`
  - tooltip dinâmico com nome da etapa pendente
- `src/components/StepIndicator.tsx`
  - aceitar prop opcional `invalidSteps: string[]` e renderizar badge de alerta

## Não muda

- Schema do banco, RLS, edge functions, triggers.
- Estrutura geral do wizard, persistência de rascunho (24h), retry de protocolo.

## Resultado esperado

Qualquer usuário (solicitante, backoffice, admin, super_admin com impersonation) consegue criar uma solicitação até o fim com mensagens claras a cada bloqueio, sem ficar com botão desabilitado "sem motivo aparente" e sem criar registros parciais quando o upload falha.