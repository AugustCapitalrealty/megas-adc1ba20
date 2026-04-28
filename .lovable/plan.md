# Unificação de Histórico, Chat e Acompanhamento OC

## Diagnóstico

Hoje o sistema escreve eventos da mesma solicitação em **três tabelas diferentes**, mas a UI já mostra tudo numa timeline única (`SolicitacaoTimeline`). Isso é a causa raiz dos bugs recentes (auditoria de "Aguardando Ciência", duplicações, gatilhos que não disparam):

| Tabela | O que grava | Problema |
|---|---|---|
| `historico_solicitacoes` | Mudanças de status, ações genéricas, motivos | Fonte "oficial" usada por gatilhos |
| `solicitacao_mensagens` | Chat solicitante ↔ backoffice, notas internas | Não aparece em buscas de histórico |
| `oc_acompanhamento` | Cancelamentos/adiamentos pós-OC, previsões | Triggers de ciência não enxergavam (já parcialmente corrigido) |

Resultado: cada nova feature precisa "lembrar" de gravar nas 3 tabelas certas, e qualquer esquecimento gera fantasmas como 2026000146/2026000272.

## Estratégia

**Manter `historico_solicitacoes` como fonte única**, expandindo seu schema para absorver chat e acompanhamento OC. Migrar dados das outras duas tabelas, marcá-las como deprecated (manter por 1 release como leitura) e atualizar todas as escritas para usar a tabela unificada.

## Mudanças no banco

1. **Expandir `historico_solicitacoes`**:
   - `mensagem text` (texto livre do chat)
   - `interno boolean default false` (nota interna do backoffice)
   - `categoria text` — enum lógico: `status` | `mensagem` | `acompanhamento_oc` | `sistema`
   - `previsao_execucao date`, `previsao_nf date` (do acompanhamento OC)
   - `documento_emitido_id uuid` (referência opcional)
   - `lida boolean default false` (para badge de mensagens não lidas)

2. **Migração de dados (backfill)**:
   - Copiar `solicitacao_mensagens` → `historico_solicitacoes` com `categoria='mensagem'`, `acao='mensagem_enviada'`
   - Copiar `oc_acompanhamento` → `historico_solicitacoes` com `categoria='acompanhamento_oc'`, `acao=tipo_acao::text`

3. **RLS**: replicar as políticas de leitura/escrita atuais (incluindo regra de `interno` só visível para backoffice) na tabela unificada.

4. **Gatilhos**: atualizar `auto_set_ciencia_self_cancellation` para olhar apenas `historico_solicitacoes` (já preparado), removendo o ramo de `oc_acompanhamento`.

5. **Tabelas legadas**: manter `solicitacao_mensagens` e `oc_acompanhamento` por compatibilidade de tipos, mas todas as **novas escritas** vão para `historico_solicitacoes`. Em uma próxima onda podemos dropar.

## Mudanças no código

- **`SolicitacaoTimeline.tsx`**: passar a buscar 1 única query em `historico_solicitacoes` (com filtro de `interno` por role). Eliminar o merge manual.
- **Escritas de chat** (`SolicitacaoTimeline.handleSendMessage`): inserir em `historico_solicitacoes` com `categoria='mensagem'`.
- **Escritas de cancelamento/adiamento** (`MonitoramentoOC.tsx`, `Backoffice.tsx`, `MinhasSolicitacoes.tsx`): trocar `from('oc_acompanhamento')` por insert em `historico_solicitacoes` com a categoria certa.
- **`useUnreadMessages`**: ler `historico_solicitacoes` filtrando `categoria='mensagem' AND lida=false`.
- **`useDashboardMetrics`** e **`useMonitoramentoOC`**: ler `previsao_nf`/`previsao_execucao` da tabela unificada.
- **`JustificativaModal.tsx`**: ajustar insert.

## Benefícios

- Uma única tabela = uma única RLS, um único gatilho, um único ponto de auditoria.
- Impossível "esquecer" de gravar em uma das 3 tabelas.
- Triggers de ciência, SLA e dashboards passam a olhar uma fonte só.
- Timeline consistente sempre, independentemente de qual página criou o evento.

## Riscos & Mitigação

- **Volume de dados**: backfill é pontual (algumas centenas/milhares de linhas) — sem impacto.
- **Quebra de tipos**: `types.ts` é regerado automaticamente após a migração.
- **Tabelas legadas**: mantidas só-leitura por enquanto; remoção fica para uma próxima onda após validação.

## Entregáveis

1. Migração SQL: novas colunas + backfill + RLS + ajuste do trigger.
2. Refatoração do `SolicitacaoTimeline` para fonte única.
3. Refatoração de todas as escritas em `oc_acompanhamento` e `solicitacao_mensagens` para `historico_solicitacoes`.
4. Atualização de hooks (`useUnreadMessages`, `useDashboardMetrics`, `useMonitoramentoOC`).
