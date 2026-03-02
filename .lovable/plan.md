

# Plano: Expiração de previsão de NF e limpeza de type cast

## Problema identificado

A lógica atual considera uma `previsao_nf` como válida **para sempre**. Exemplo: #2025837655 tem previsão 09/03/2026. Após essa data, se não houver NF, a OC deve voltar a exigir justificativa. Atualmente não volta — fica como "Adiado" indefinidamente.

Além disso, as queries de `oc_acompanhamento` usam `as any` desnecessariamente (a tabela existe nos types).

## Alterações

### 1. `src/pages/MonitoramentoOC.tsx`

**Expiração de previsão:** Ao montar `previsao_nf` na row, verificar se a data já passou. Se `previsao_nf < hoje`, tratar como `null` (precisa justificar de novo):
```typescript
const previsaoNf = acomp?.previsao_nf || null;
const previsaoValida = previsaoNf && new Date(previsaoNf + 'T00:00:00') >= new Date(new Date().toDateString()) ? previsaoNf : null;
// usar previsaoValida no lugar de previsao_nf
```

**Remover `as any`** nas queries de `oc_acompanhamento` (linhas 146 e 311).

### 2. `src/hooks/useDashboardMetrics.ts`

**Expiração de previsão no Dashboard:** No filtro `solsWithForecast`, considerar apenas previsões futuras:
```typescript
const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
const solsWithForecast = new Set(
  (acompResult.data || [])
    .filter(a => a.previsao_nf && a.previsao_nf >= today)
    .map(a => a.solicitacao_id)
);
```

Isso garante que após 09/03, se não houver NF, #2025837655 volta a contar como pendente de justificativa.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/MonitoramentoOC.tsx` | Expirar previsão passada, remover `as any` |
| `src/hooks/useDashboardMetrics.ts` | Filtrar previsões futuras no `solsWithForecast` |

