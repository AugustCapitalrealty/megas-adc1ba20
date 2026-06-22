## Diagnóstico

As tarifas exibidas na fatura do cliente vêm dos campos de **Mercado Livre** em `energia_competencia_tarifas`:

- `demanda_usd`
- `te_ponta`
- `tusd_ponta`
- `te_fora`
- `tusd_fora`

Hoje esses campos estão com os valores antigos:

```text
Demanda USD: 19,805217
Ponta:       0,394284 + 1,154727 = 1,549011
Fora Ponta:  0,245430 + 0,115238 = 0,360668
```

Esses são exatamente os valores que aparecem na fatura do cliente.

O que foi atualizado na tela **Fatura Copel** fica em campos separados `copel_tarifa_*`, apenas para conferência da conta da concessionária. Eu havia separado esses campos para não sobrescrever as tarifas Mercado Livre automaticamente. Por isso a fatura do cliente continuou mostrando as tarifas antigas.

## Correção agora, em fase de testes

Como estamos em fase de aprimoramento e você quer que tudo atualizado valha para trás também, vou ajustar para:

1. **Adicionar um botão/ação em Memória de Cálculo** para sincronizar as tarifas usadas na fatura do cliente com as tarifas corretas da Fatura Copel já digitada nesta competência.
2. Ao sincronizar, copiar:
   - `copel_tarifa_demanda_usd` → `demanda_usd`
   - `copel_tarifa_te_ponta` → `te_ponta`
   - `copel_tarifa_tusd_ponta` → `tusd_ponta`
   - `copel_tarifa_te_fora` → `te_fora`
   - `copel_tarifa_tusd_fora` → `tusd_fora`
3. Também manter a propagação das alíquotas do cadastro para todas as competências, como já foi feito.
4. Ajustar a criação/duplicação de competência para sempre aplicar as alíquotas atuais do cadastro, evitando nascer com PIS/COFINS antigos do `DEFAULT_TARIFAS` ou do mês anterior.

## Observação importante

Se a tarifa correta do Mercado Livre não deve ser igual à tarifa líquida da Copel, então precisamos de um cadastro separado de tarifas Mercado Livre. Mas pelo print e pela frase “as tarifas da Copel não está aparecendo na fatura do cliente”, a correção imediata é usar as tarifas da Fatura Copel como fonte para a fatura do cliente durante os testes.

## Arquivos

- `src/components/admin/energia/MemoriaCalculoTab.tsx`
- `src/components/admin/energia/FaturasTab.tsx` se necessário apenas para recarregar/exibir após a sincronização
- `src/lib/energia-rateio.ts` para remover defaults antigos de PIS/COFINS se necessário
