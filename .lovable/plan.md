

## Corrigir `data_pendente_correcao` da 2026000155

### Problema
O backfill anterior usou `MAX(h.created_at)` para preencher `data_pendente_correcao`, mas isso pegou o evento de transferência de férias (18/03) onde o status ficou `aguardando_informacoes → aguardando_informacoes`. O correto é usar a **primeira** vez que a solicitação entrou nesse status.

### Histórico da 2026000155:
1. 24/02 17:42 — Criada (recebido)
2. 24/02 18:02 — Assumida (aprovado)  
3. 24/02 18:02 — Solicitação de informações (**aguardando_informacoes** ← esta é a data correta)
4. 18/03 12:12 — Transferência férias (aguardando_informacoes → aguardando_informacoes) ← a data errada que foi usada

### Correção

#### 1. Atualizar `data_pendente_correcao` da 2026000155
Usar `UPDATE` via insert tool para setar a data correta: `2026-02-24 18:02:53.464355+00` (quando entrou pela primeira vez em `aguardando_informacoes`).

#### 2. Corrigir qualquer outro registro com o mesmo problema
Rodar um UPDATE geral que use a **primeira** transição para o status atual (filtrando por `status_anterior != status_novo` para ignorar transferências same-status):

```sql
UPDATE solicitacoes SET data_pendente_correcao = (
  SELECT MIN(h.created_at)
  FROM historico_solicitacoes h
  WHERE h.solicitacao_id = solicitacoes.id
    AND h.status_novo = solicitacoes.status::text::request_status
    AND (h.status_anterior IS NULL OR h.status_anterior != h.status_novo)
)
WHERE status IN ('aguardando_informacoes', 'pendente_correcao')
  AND data_pendente_correcao IS NOT NULL;
```

#### 3. Invocar a edge function para processar
Após a correção, invocar `check-correction-deadline` para cancelar a 2026000155 (já tem 32 dias pendente).

### Arquivos Modificados
Nenhum arquivo de código — apenas dados no banco via insert tool + invocação da edge function.

