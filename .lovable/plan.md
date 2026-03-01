

# Painel de Monitoramento OC x NF

## Visao geral

Criar uma nova pagina `/monitoramento-oc` com painel interativo para controle de OCs emitidas vs NFs recebidas, aging, justificativas de adiamento, e fluxo de cancelamento com aprovacao do backoffice.

## Escopo dividido em fases

### Fase 1: Infraestrutura de dados (migracao SQL)

**Nova tabela `oc_acompanhamento`** para rastrear acoes sobre OCs emitidas:

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid PK | |
| solicitacao_id | uuid FK | Referencia solicitacao |
| documento_emitido_id | uuid FK | Referencia ao doc OC |
| tipo_acao | enum | `justificativa_adiamento`, `previsao_atualizada`, `cancelamento_solicitado`, `cancelamento_aprovado`, `cancelamento_rejeitado` |
| justificativa | text | Motivo obrigatorio |
| previsao_execucao | date | Nova previsao de execucao |
| previsao_nf | date | Nova previsao de NF |
| user_id | uuid | Quem registrou |
| created_at | timestamptz | |

RLS: solicitante ve os proprios, backoffice ve todos.

**Nova coluna em `solicitacoes`**: `cancelamento_pendente boolean default false` — flag para travar cancelamento direto e exigir aprovacao do backoffice.

**Alterar `status_transitions`**: Remover transicoes diretas para `cancelado` a partir de status pos-OC (`oc_ac_emitida`, `aguardando_aceite`, `liberado_fornecedor`, `enviado_fornecedor`, `aguardando_nf_boleto`, `nf_boleto_enviados`, `enviado_pagamento`). Nesses casos, o cancelamento passa por aprovacao.

### Fase 2: Fluxo de cancelamento com aprovacao

**Em `MinhasSolicitacoes.tsx`** — alterar `handleCancelar`:
- Se status e pos-OC: em vez de cancelar direto, setar `cancelamento_pendente = true` e registrar na `oc_acompanhamento` com `tipo_acao = 'cancelamento_solicitado'`. Status muda para um indicador visual mas nao para `cancelado`.
- Se status e pre-OC: manter fluxo atual (cancelamento direto).

**Em `Backoffice.tsx`** — adicionar acoes:
- Botao "Aprovar Cancelamento" e "Rejeitar Cancelamento" para solicitacoes com `cancelamento_pendente = true`.
- Ao aprovar: status → `cancelado`, registrar historico e `oc_acompanhamento`.
- Ao rejeitar: limpar flag, notificar solicitante.

### Fase 3: Pagina do Painel de Monitoramento

**Novo arquivo: `src/pages/MonitoramentoOC.tsx`**

Layout:
- KPIs no topo: Total OCs ativas, Sem NF este mes, Pendentes justificativa (dia 23+), Cancelamentos pendentes
- Tabela principal com colunas: Protocolo, Fornecedor, Valor, Data OC, Dias em aberto (aging), Status NF, Acoes
- Filtros: Empreendimento, Status, Periodo
- Badges de aging com cores: verde (< 15 dias), amarelo (15-23 dias), vermelho (> 23 dias ou sem justificativa apos dia 23)

**Status possiveis no painel:**
- `em_prazo` — OC emitida, dentro do mes
- `pendente_justificativa` — Dia 23+ sem NF e sem justificativa
- `aguardando_nf` — NF esperada (com previsao informada)
- `adiado_proximo_mes` — Solicitante justificou adiamento
- `cancelamento_solicitado` — Aguardando aprovacao backoffice
- `cancelado_aprovado` — Cancelamento efetivado

### Fase 4: Modal de justificativa (solicitante)

**Em `MinhasSolicitacoes.tsx`** — para solicitacoes com OC emitida e sem NF:
- Apos dia 23: exibir alerta obrigatorio com formulario:
  - Motivo do adiamento (textarea obrigatorio)
  - Previsao de execucao do servico (date picker)
  - Previsao de emissao da NF (date picker)
- Salvar em `oc_acompanhamento`

### Fase 5: Historico completo

No modal de detalhes (Backoffice e MonitoramentoOC):
- Timeline de todas as acoes da `oc_acompanhamento` ordenadas por data
- Mostra: emissao, justificativas, alteracoes de prazo, cancelamentos

### Fase 6: Rota e navegacao

- Adicionar rota `/monitoramento-oc` em `App.tsx` (requireBackoffice)
- Adicionar link no menu de navegacao em `AppLayout.tsx` na secao admin
- Lazy load do componente

---

## Ordem de implementacao

1. Migracao SQL (tabela + enum + RLS)
2. Fluxo de cancelamento com aprovacao (MinhasSolicitacoes + Backoffice)
3. Pagina MonitoramentoOC com tabela e filtros
4. Modal de justificativa do solicitante
5. Rota e navegacao

