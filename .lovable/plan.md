

## Correção do Parser CSV — Aspas Não-Escapadas no Campo Detalhes

### Causa Raiz

O parser CSV quebra quando o campo `Detalhes` (que é citado com `"`) contém aspas duplas (`"`) soltas no meio do texto (ex: medidas como `8"`, citações, etc.). Quando o parser encontra uma `"` dentro de um campo citado sem ser escapada como `""`, ele sai do modo de citação prematuramente. A partir desse ponto, qualquer `;` no texto do Detalhes é tratado como separador de campo, criando colunas extras e deslocando todos os dados da linha para a esquerda.

Isso explica por que `numero_requisicao` recebe o valor do `numero_fluig` (ex: `2.026.000.280` ao invés de `4004`) — as colunas ficam deslocadas em 1 posição.

### Solução (2 partes)

**1. Tornar o parser CSV mais robusto** (`ProjurisImport.tsx`)
- Mudar a estratégia: ao invés de confiar cegamente nas aspas, contar as colunas do header e validar cada linha parseada
- Adicionar validação: se a linha parseada tiver mais colunas que o header, tentar re-juntar campos extras no campo Detalhes (que é o único campo multiline/com aspas problemáticas)
- Adicionar validação no `numero_requisicao`: rejeitar valores que claramente não são números Projuris (ex: contém pontos como `2.026.000.280`, ou são muito curtos como `0`, `00`)

**2. Limpar registros corrompidos no banco** (Migration SQL)
- Deletar todos os registros onde `numero_requisicao` é claramente inválido (Nº Fluig, tipo requisição, etc.)

### Detalhes Técnicos — Parser

```typescript
// Estratégia: após parsear a linha, se tiver mais colunas que o header,
// juntar as colunas extras de volta no campo Detalhes (col 4)
const expectedCols = headerRow.length; // 13
if (row.length > expectedCols) {
  // Colunas extras vieram do Detalhes com aspas quebradas
  const extraCols = row.length - expectedCols;
  const detalhesIdx = colMap['detalhes'] ?? 4;
  const detalhesEnd = detalhesIdx + extraCols + 1;
  const fixedDetalhes = row.slice(detalhesIdx, detalhesEnd).join(';');
  row.splice(detalhesIdx, extraCols + 1, fixedDetalhes);
}

// Validação: numero_requisicao deve ser um número curto
const numReq = get('numero_requisicao');
if (!numReq || numReq.includes('.') || numReq.length > 5) {
  res.errors.push(`Linha ${n}: numero_requisicao inválido: ${numReq}`);
  return null;
}
```

### Migration SQL

```sql
DELETE FROM public.projuris_requisicoes
WHERE numero_requisicao ~ '\.'        -- contém pontos (ex: 2.026.000.280, 152.642)
   OR numero_requisicao IN ('0', '00') -- valores vazios/curtos
   OR length(numero_requisicao) > 10;  -- valores absurdamente longos
```

### Arquivos

| Arquivo | Ação |
|---------|------|
| Migration SQL | Deletar registros corrompidos por padrão |
| `src/components/monitoramento/projuris/ProjurisImport.tsx` | Corrigir parser: re-juntar colunas extras no Detalhes + validar numero_requisicao |

