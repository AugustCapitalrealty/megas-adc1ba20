

## Fluxo Produto vs Serviço: Solicitante define na liberação da OC

### Contexto

Hoje, quando o solicitante libera a OC (`aguardando_aceite` → `liberado_fornecedor`), não há distinção entre produto e serviço. O plano anterior propunha usar o campo `tipo` (OC/AC) para decidir automaticamente, mas o usuário esclareceu que **é caso a caso** — o próprio solicitante deve informar no momento da liberação.

### Regra de negócio

1. **Produto**: O fornecedor precisa da OC **antes** de entregar o produto. Backoffice envia OC imediatamente.
2. **Serviço**: O fornecedor executa o serviço **primeiro**. Solicitante precisa enviar evidência do serviço executado (foto/documento + data de execução) para que o backoffice libere a OC.

### Mudanças planejadas

**1. Migration SQL** — novo status + campos:
```sql
-- Novo status
ALTER TYPE request_status ADD VALUE 'aguardando_execucao';

-- Transições
INSERT INTO status_transitions (status_from, status_to) VALUES
  ('liberado_fornecedor', 'aguardando_execucao'),
  ('aguardando_execucao', 'enviado_fornecedor'),
  ('aguardando_execucao', 'concluida');

-- Campo na solicitação para saber o tipo de entrega
ALTER TABLE solicitacoes ADD COLUMN tipo_entrega text; 
-- valores: 'produto' ou 'servico'

-- Campo para data de execução do serviço  
ALTER TABLE solicitacoes ADD COLUMN data_execucao_servico date;
```

**2. `AceiteModal` (SolicitanteModals.tsx)** — novo step `'tipo_entrega'` entre `'decidir'` e `'confirmar'`:
- Quando o solicitante escolhe "Liberar para Fornecedor", antes de confirmar, ele seleciona:
  - **"Produto"** — "O fornecedor precisa da OC antes da entrega"
  - **"Serviço"** — "O serviço será executado antes do envio da OC"
- Se escolher "Serviço", exibe campos obrigatórios: upload de evidência + data de execução

**3. `handleAceitarOC` (MinhasSolicitacoes.tsx)**:
- Salva `tipo_entrega` na solicitação
- Se `tipo_entrega === 'produto'`: status → `liberado_fornecedor` (fluxo atual)
- Se `tipo_entrega === 'servico'`: status → `aguardando_execucao`, salva evidência nos anexos e `data_execucao_servico`

**4. Backoffice — `BackofficeSolicitacaoCard.tsx`**:
- Status `aguardando_execucao`: exibe badge "Aguardando Evidência do Serviço" + botão "Liberar OC" (transiciona para `enviado_fornecedor`)
- Status `liberado_fornecedor` (produto): botão "Registrar Envio" como hoje

**5. Solicitante — `SolicitanteSolicitacaoCard.tsx`**:
- Status `aguardando_execucao`: banner informativo "Aguardando execução do serviço — envie a evidência quando concluído"
- Botão para enviar evidência tardia caso não tenha enviado na liberação

**6. Labels e notificações** (`types/index.ts`, trigger `notify_status_change`):
- `STATUS_LABELS`: `aguardando_execucao: 'Aguardando Execução do Serviço'`
- Trigger: notificação para backoffice quando serviço entra em `aguardando_execucao`

**7. Demais arquivos impactados**:
- `WorkflowProgress.tsx`: incluir etapa "Execução do Serviço"
- `SolicitacaoTimeline.tsx`: ícone/label para nova ação
- `MonitoramentoOC.tsx`: incluir novo status nos filtros
- `status-badge.tsx`: config para `aguardando_execucao`
- `useBackofficeSolicitacoes.ts`: incluir novo status nas queries

```text
PRODUTO:
aceite → liberado_fornecedor → enviado_fornecedor → concluida
         [Backoffice envia OC]

SERVIÇO:
aceite → aguardando_execucao → enviado_fornecedor → concluida
         [Solicitante envia     [Backoffice envia OC
          evidência + data]      após verificar]
```

