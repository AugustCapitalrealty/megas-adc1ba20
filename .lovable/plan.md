
# Correcao Definitiva do Dashboard - Erro de Relacionamento Ambiguo

## Causa Raiz Identificada

O erro e **100% claro** nos logs do console:

```
PGRST201: Could not embed because more than one relationship was found
for 'solicitacoes' and 'fornecedores'
```

A tabela `solicitacoes` possui **3 chaves estrangeiras** apontando para `fornecedores`:
- `fornecedor_id` (fornecedor principal)
- `fornecedor_concorrente_1_id`
- `fornecedor_concorrente_2_id`

Quando o codigo faz `.select('fornecedor:fornecedores(...)')`, o PostgREST nao sabe qual das 3 relacoes usar e retorna erro. Os dados nunca chegam, os KPIs ficam zerados.

## Solucao

Uma unica linha precisa mudar no arquivo `src/hooks/useDashboardMetrics.ts`, linha 60:

**De:**
```
fornecedor:fornecedores(razao_social, nome_fantasia)
```

**Para:**
```
fornecedor:fornecedores!solicitacoes_fornecedor_id_fkey(razao_social, nome_fantasia)
```

Isso diz ao PostgREST explicitamente: "use a relacao via `fornecedor_id`", eliminando a ambiguidade.

## Secao Tecnica

**Arquivo alterado:** `src/hooks/useDashboardMetrics.ts` (1 linha)

**Risco:** Zero. Apenas especifica qual FK usar, sem alterar dados ou logica.

**Tempo de implementacao:** Menos de 1 minuto.
