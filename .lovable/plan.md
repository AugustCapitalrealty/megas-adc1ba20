

## Corrigir cancelamento errado #2026000140 + Ciência de cancelamento

### Problema 1 — #2026000140 cancelada erroneamente

A solicitação entrou em `aguardando_informacoes` pela **segunda vez** em 23/03/2026. O backfill anterior usou `MIN(created_at)` e pegou a primeira entrada (12/02/2026), fazendo o sistema pensar que já tinha 44 dias. Na verdade tinha apenas 5 dias.

**Correção:** Reverter o cancelamento via INSERT tool:
- Atualizar `solicitacoes` SET `status = 'aguardando_informacoes'`, `data_pendente_correcao = '2026-03-23 16:48:41'`
- Inserir registro no histórico explicando a reversão
- O trigger `track_pendente_correcao_date` já funciona corretamente para novas transições (ele seta `NOW()` quando o status **entra** em pendente/aguardando), o bug foi exclusivo do backfill manual

**Prevenção futura:** O backfill com `MIN` já foi executado e não roda novamente. O trigger no banco usa a lógica correta (só seta quando `OLD.status NOT IN` pendente/aguardando), então para novas transições o problema não se repete.

### Problema 2 — Ciência de cancelamento automático

Quando uma solicitação é cancelada por prazo, o solicitante precisa **confirmar ciência** antes que ela saia das ações pendentes.

#### Mudanças no banco
- **Migração:** Adicionar coluna `cancelamento_ciencia_em` (timestamp, nullable) na tabela `solicitacoes` — marca quando o usuário deu ciência

#### Mudanças no frontend

**`src/hooks/useDashboardMetrics.ts`:**
- Adicionar contagem de `pendingCiencia`: solicitações com `status = 'cancelado'` que tenham histórico de `prazo_resposta_expirado` ou `prazo_correção_expirado` E `cancelamento_ciencia_em IS NULL`

**`src/components/PendingActionsCard.tsx`:**
- Adicionar novo tipo de ação `ciencia_cancelamento` com badge e botão "Dar ciência"

**`src/pages/MinhasSolicitacoes.tsx`:**
- Adicionar handler `handleDarCiencia` que atualiza `cancelamento_ciencia_em = NOW()` e insere registro no histórico com ação `ciencia_cancelamento`
- Filtrar solicitações canceladas sem ciência para a seção de ações pendentes

**`src/components/solicitante/SolicitanteSolicitacaoCard.tsx`:**
- No banner de cancelamento por prazo, adicionar botão "Confirmar ciência" que chama o handler
- Após ciência dada, mostrar "Ciência confirmada em DD/MM/YYYY"

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| INSERT tool | Reverter #2026000140 para `aguardando_informacoes` |
| Migração SQL | Coluna `cancelamento_ciencia_em` |
| `src/hooks/useDashboardMetrics.ts` | Contar pendentes de ciência |
| `src/components/PendingActionsCard.tsx` | Nova ação `ciencia_cancelamento` |
| `src/pages/MinhasSolicitacoes.tsx` | Handler + filtro ciência |
| `src/components/solicitante/SolicitanteSolicitacaoCard.tsx` | Botão ciência no card |

