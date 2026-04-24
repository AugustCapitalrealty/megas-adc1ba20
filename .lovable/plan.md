## Objetivo

Hoje, depois que o solicitante libera a OC (status `liberado_fornecedor`), o Backoffice só consegue **Registrar Envio ao Fornecedor** ou cancelar. Se a liberação foi equivocada (valor errado, fornecedor errado, escopo divergente, etc.), o Backoffice não tem como devolver para o solicitante.

A melhoria é adicionar a ação **"Solicitar Informações"** também para `liberado_fornecedor`, devolvendo a solicitação ao solicitante (status `aguardando_informacoes`), exatamente como já funciona em `recebido / em_analise / aprovado / em_processamento`.

## O que muda para o usuário

No card do Backoffice de uma solicitação **Liberada pelo Solicitante**:
- Botão principal continua sendo **Registrar Envio**.
- No menu "Mais ações" (dropdown secundário) passa a aparecer **Solicitar Ajuste / Informações**.
- Ao clicar, abre o modal já existente, onde o Backoffice escreve o motivo (ex.: "Liberação equivocada — favor revisar valor da OC").
- A solicitação volta para o solicitante com status **Aguardando Informações**, dispara notificação no app e no Google Chat (já implementado), e zera o SLA quando o solicitante responder (já implementado pelo trigger).

## Mudanças técnicas

### 1. Migration — nova transição de status
Adicionar em `status_transitions`:
```
liberado_fornecedor → aguardando_informacoes
```
Sem isso o trigger `validate_status_transition` bloqueia a operação.

### 2. `src/components/backoffice/BackofficeSolicitacaoCard.tsx`
Incluir `liberado_fornecedor` na lista de status que mostram o item "Solicitar Ajuste" no dropdown secundário (linha ~301):
```ts
if (['recebido', 'em_analise', 'aprovado', 'em_processamento', 'liberado_fornecedor'].includes(sol.status)) {
  secondaryItems.push(<DropdownMenuItem ... />);
}
```

### 3. `src/pages/Backoffice.tsx`
Nenhuma mudança de lógica é necessária — `handleAction` + `updateStatus` já tratam `solicitar_ajuste → aguardando_informacoes` genericamente, incluindo:
- Inserção em `historico_solicitacoes` com motivo.
- Notificação Google Chat (`gchat-notify-oc` tipo `correcao`).
- Trigger `notify_status_change` envia notificação in-app de `action_required` para o solicitante.
- Trigger `track_pendente_correcao_date` marca `data_pendente_correcao` para o badge de prazo.

### 4. Verificação de filtros / contadores
A aba **Pendentes** já agrupa `pendente_correcao` + `aguardando_informacoes`, então a solicitação "devolvida" some de **Liberadas** e aparece em **Pendentes** automaticamente — nada extra a fazer.

## Fora de escopo
- Não alterar fluxo do solicitante: ele já sabe responder `aguardando_informacoes` (tela atual).
- Não criar novo tipo de ação/motivo — reaproveita o modal "Solicitar Ajuste".
