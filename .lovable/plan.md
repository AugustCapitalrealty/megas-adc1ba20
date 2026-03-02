

# Plano: Corrigir visibilidade do Monitoramento OC x NF para todos os usuários

## Problema raiz

As tabelas `documentos_emitidos` e `oc_acompanhamento` têm políticas RLS que só permitem SELECT para o dono da solicitação ou backoffice/admin. Usuários com acesso por empreendimento não conseguem ver os dados — o painel fica vazio para eles.

## Alterações

### 1. Adicionar políticas RLS por empreendimento

Criar novas políticas SELECT nas tabelas:

**`documentos_emitidos`** — Permitir SELECT quando o usuário tem acesso ao empreendimento da solicitação vinculada:
```sql
CREATE POLICY "Users can view documentos from their empreendimento"
ON public.documentos_emitidos FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));
```

**`oc_acompanhamento`** — Mesma lógica:
```sql
CREATE POLICY "Users can view oc_acompanhamento from their empreendimento"
ON public.oc_acompanhamento FOR SELECT
USING (user_can_access_solicitacao(solicitacao_id));
```

A função `user_can_access_solicitacao` já existe e verifica: dono da solicitação OU backoffice/admin OU empreendimento do usuário. Isso resolve o acesso sem expor dados indevidos.

### 2. Adicionar política INSERT em `oc_acompanhamento` por empreendimento

Usuários com acesso ao empreendimento precisam inserir justificativas e solicitações de cancelamento:
```sql
CREATE POLICY "Users can insert oc_acompanhamento for their empreendimento"
ON public.oc_acompanhamento FOR INSERT
WITH CHECK (auth.uid() = user_id AND user_can_access_solicitacao(solicitacao_id));
```

### 3. Corrigir filtro de NF em `documentos_fiscais`

No `MonitoramentoOC.tsx` (linha 142), o filtro `.eq('tipo', 'nota_fiscal')` pode não corresponder aos dados reais. Remover esse filtro para considerar qualquer documento fiscal como NF recebida (a tabela é exclusiva para documentos fiscais).

### 4. Ajuste no `useDashboardMetrics.ts`

A query de justificativas pendentes faz as mesmas consultas em `documentos_emitidos` e `oc_acompanhamento`. Com as novas políticas RLS, os dados passarão a ser retornados corretamente — nenhuma mudança de código necessária aqui.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migration SQL | 3 novas políticas RLS |
| `src/pages/MonitoramentoOC.tsx` | Remover `.eq('tipo', 'nota_fiscal')` do filtro de documentos fiscais |

