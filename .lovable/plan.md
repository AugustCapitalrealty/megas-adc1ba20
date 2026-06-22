## Problema

Ao atualizar PIS/COFINS/ICMS em **Cadastros → Parâmetros**, as faturas existentes continuam usando o snapshot antigo gravado em `energia_competencia_tarifas` no momento em que a competência foi criada. Exemplo na fatura do Mercado Livre: aparece PIS/COFINS = 9,25% (antigo 1,65 + 7,60) em vez de 7,06% (novo 1,26 + 5,80).

A decisão do usuário: **enquanto estamos em fase de testes, salvar no cadastro deve sobrescrever todas as competências existentes**. Histórico versionado de tributos/tarifas fica para depois.

## Mudança

Atualizar o handler `handleSaveParametros` em `src/components/admin/energia/EnergiaCadastrosTab.tsx` para, após salvar `energia_parametros`, propagar os três percentuais para `energia_competencia_tarifas` de **todas** as competências.

```text
salvar parametros (cadastro)
        │
        ▼
UPDATE energia_competencia_tarifas
   SET icms_pct   = <novo>/100,
       pis_pct    = <novo>/100,
       cofins_pct = <novo>/100
 WHERE 1=1     -- todas as competências
```

Detalhes:
- Em `energia_parametros` os valores ficam em escala 0–100 (ex.: 19, 5.8, 1.26). Em `energia_competencia_tarifas` ficam em escala 0–1 (ex.: 0.19, 0.058, 0.0126). A propagação divide por 100.
- Toast de confirmação mostrando "Parâmetros salvos e propagados para N competências".
- O `useEffect` de auto-cálculo de tributos em `FaturaCopelTab.tsx` e `MemoriaCalculoTab.tsx` (que já lê `aliquotas` do parâmetro) continua igual — apenas vai recalcular corretamente assim que a competência for reaberta, pois a base agora é fresca.

## Fora do escopo (deixar para depois)

- Cadastro central de tarifas Mercado Livre (Demanda USD, TE/TUSD Ponta/Fora) com propagação — o usuário confirmou que hoje só as alíquotas mudaram.
- Versionamento histórico de tributos/tarifas por vigência (planejado para o futuro, quando faturas não puderem mais ser alteradas retroativamente).

## Arquivos

- `src/components/admin/energia/EnergiaCadastrosTab.tsx` — adicionar update propagando alíquotas após salvar parâmetros.
