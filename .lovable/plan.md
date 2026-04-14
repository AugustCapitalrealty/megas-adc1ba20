

## Limpeza dos 3 registros com mapeamento errado

### Problema

Existem exatamente 3 registros criados pela importação antiga (posição fixa) onde todas as colunas estão deslocadas:

| ID | numero_requisicao (errado) | status (errado) | Correto já existe? |
|----|---------------------------|-----------------|-------------------|
| `e9e9086d` | `2.026.000.280` | `Termo de contratação_Megas` | Sim (4004) |
| `323d062b` | `00` | `Contrato de Prestação de Serviços_Megas` | Sim |
| `513943ec` | `0` | `Contrato de Comodato_ADM Megas` | Sim |

Os registros corretos já foram importados pelo parser baseado em header. Basta deletar esses 3 lixo.

### Solução

**Migration SQL** — Deletar os 3 registros por ID:

```sql
DELETE FROM public.projuris_requisicoes
WHERE id IN (
  'e9e9086d-a171-4dc9-8550-9994eed25492',
  '323d062b-cc19-4ef7-b4f0-f635ef522455',
  '513943ec-1c0a-4d3d-95a5-18259f76b9bd'
);
```

Nenhuma alteração de código necessária — apenas a limpeza de dados.

