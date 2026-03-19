

## Diagnóstico: Por que o nome do responsável não atualiza após transferência de férias

### Problema Raiz (2 bugs independentes)

**Bug 1 — `enrichWithResponsavelInfo` usa heurística errada:**
Em `src/hooks/useBackofficeSolicitacoes.ts` (linha 102), a função busca o responsável filtrando por `status_novo = 'aprovado'`. Isso encontra quem **aprovou** a solicitação originalmente — não quem a **assumiu** por último. A transferência de férias insere `acao: 'Assumido pelo backoffice'` sem alterar status, então o registro antigo da Laureane continua sendo retornado.

**Bug 2 — `user_id` no histórico é o do admin, não o do destino:**
Em `src/pages/Admin.tsx` (linha 442), o histórico de transferência é inserido com `user_id: user.id` (o admin logado), para satisfazer a RLS (`auth.uid() = user_id`). Mesmo corrigindo o Bug 1, o responsável apareceria como o admin, não a Paloma.

### Plano de Correção

#### 1. Criar função SECURITY DEFINER para inserir histórico sem restrição de RLS

Migração SQL para criar uma função que permite inserir no `historico_solicitacoes` com qualquer `user_id`, restrita a admins/backoffice:

```sql
CREATE OR REPLACE FUNCTION public.insert_historico_admin(
  p_solicitacao_id uuid,
  p_user_id uuid,
  p_acao text,
  p_status_anterior text DEFAULT NULL,
  p_status_novo text DEFAULT NULL,
  p_motivo text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_backoffice_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  INSERT INTO historico_solicitacoes (solicitacao_id, user_id, acao, status_anterior, status_novo, motivo)
  VALUES (p_solicitacao_id, p_user_id, p_acao, p_status_anterior::request_status, p_status_novo::request_status, p_motivo);
END;
$$;
```

#### 2. Atualizar `handleVacationTransfer` em `src/pages/Admin.tsx`

Substituir o insert direto no `historico_solicitacoes` por chamadas à nova função RPC, usando `vacationTargetUserId` como `user_id` (o verdadeiro novo responsável):

```typescript
// Em vez de insert batch direto, chamar RPC para cada solicitação
for (const sol of solicitacoesDaCarteira) {
  await supabase.rpc('insert_historico_admin', {
    p_solicitacao_id: sol.id,
    p_user_id: vacationTargetUserId,  // Paloma, não o admin
    p_acao: 'Assumido pelo backoffice',
    p_status_anterior: sol.status,
    p_status_novo: sol.status,
    p_motivo: `Redistribuição por férias: de ${sourceUserName} para ${targetUserName}`,
  });
}
```

Para manter performance, usar `Promise.all` com batches de ~50 chamadas paralelas.

#### 3. Corrigir `enrichWithResponsavelInfo` em `src/hooks/useBackofficeSolicitacoes.ts`

Alterar a query de `status_novo = 'aprovado'` para `acao = 'Assumido pelo backoffice'` — assim ela encontra **quem assumiu por último**, que é o significado real de "responsável":

```typescript
const { data: histData } = await supabase
  .from('historico_solicitacoes')
  .select('solicitacao_id, created_at, user_id')
  .in('solicitacao_id', solIds)
  .eq('acao', 'Assumido pelo backoffice')  // ← corrigido
  .order('created_at', { ascending: false });
```

#### 4. Remover o registro de auditoria duplicado

Remover o insert avulso de auditoria no final (linhas 492-497) que cria um registro `redistribuicao_ferias` redundante — a informação já está no motivo de cada transferência.

### Arquivos Modificados

- **Migração SQL**: nova função `insert_historico_admin`
- **src/pages/Admin.tsx**: usar RPC em vez de insert direto
- **src/hooks/useBackofficeSolicitacoes.ts**: corrigir heurística de responsável

