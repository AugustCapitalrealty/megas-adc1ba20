

## Separar "Liberadas" e "Enviadas" no Backoffice

### Problema

A aba "Liberadas" atualmente agrupa 5 status diferentes numa única lista:
- `liberado_fornecedor`, `enviado_fornecedor` → OC já enviada ao fornecedor
- `aguardando_execucao` → em execução
- `aguardando_nf_boleto`, `nf_boleto_enviados` → aguardando/recebendo documentos fiscais

Isso mistura solicitações em fases muito distintas do fluxo.

### Solução

Dividir em duas abas:

| Aba | Label | Status incluídos |
|-----|-------|-----------------|
| **Liberadas** | Liberadas | `liberado_fornecedor` (OC aceita, ainda não enviada ao fornecedor) |
| **Enviadas** | Enviadas | `enviado_fornecedor`, `aguardando_execucao`, `aguardando_nf_boleto`, `nf_boleto_enviados` |

### Arquivo: `src/pages/Backoffice.tsx`

**1. Tipo `BackofficeTab`** (linha 56): adicionar `'enviadas'`

**2. `groupedSolicitacoes`** (linhas 1219-1223): separar em dois grupos:
```
liberadas: [...].filter(s => s.status === 'liberado_fornecedor')
enviadas: [...].filter(s => 
  s.status === 'enviado_fornecedor' || s.status === 'aguardando_execucao' ||
  s.status === 'aguardando_nf_boleto' || s.status === 'nf_boleto_enviados'
)
```

**3. FilterBar tabs** (linha 1529): adicionar tab "Enviadas" após "Liberadas"

**4. Tab content** (linha 1573): adicionar renderização da aba `enviadas`

### Arquivo: `src/components/backoffice/BackofficeKPIs.tsx`

Atualizar o KPI "Liberadas" se necessário para refletir a nova contagem, ou manter como está (soma de ambas).

