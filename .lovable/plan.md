## Problema

Na aba **Memória de Cálculo → Consumo por Cliente**, as linhas:
- **TOTAL Preenchido**
- **Diferença (Copel − Preenchido)**

são calculadas hoje somando os inputs editáveis do card de cada cliente (`consumoCli[g.key]`). Isso diverge dos **lançamentos por módulo** que efetivamente geram a fatura (tabela `energia_competencia_lancamentos`, sumarizada também na aba Fatura Copel como "Clientes Ponta/Fora").

Quando o usuário ajusta o rateio por módulo ou os dados foram importados/redistribuídos, o card mostra valores que não batem com os lançamentos reais, e a Diferença vs Copel fica incorreta.

## Mudança

Em `src/components/admin/energia/MemoriaCalculoTab.tsx`:

1. **Passar `lancamentos` como prop** para `ConsumoClienteCard` (já existe no escopo do componente pai).
2. **Substituir o cálculo de `sumD` / `sumCP` / `sumCF`** dentro do card: em vez de somar `consumoCli` por grupo, somar os campos `demanda_usd_medida_kw`, `consumo_ponta_kwh` e `consumo_fora_kwh` de **todos os módulos** em `lancamentos`. Isso casa exatamente com a soma "Clientes Ponta/Fora" da aba Fatura Copel.
3. **Manter** as linhas:
   - TOTAL Fatura Copel (`copelTotais`) — sem mudança.
   - Diferença (Copel − Preenchido) — agora reflete `copelTotais − soma(lançamentos)`.
   - ENTRADA MEDIDOR / ENERGY Medidor − ENERGY Clientes / COPEL − ENERGY MEDIDOR — sem mudança de fórmula, mas usando o mesmo `sumCP/sumCF` baseado em lançamentos para a linha "ENERGY Medidor − ENERGY Clientes".
4. **`restoD/restoCP/restoCF`** (linha "MÓDULOS VAGOS → Mega") continua sendo `copel − sum` com os novos `sum`, então segue consistente.

Sem alterações de schema, sem mudanças no engine de rateio (`energia-rateio.ts`) e sem mexer em outras abas.

## Resultado esperado

Após salvar o consumo por cliente (que distribui para os módulos) — ou quando os lançamentos foram editados/importados diretamente — as linhas TOTAL Preenchido e Diferença passam a refletir a realidade dos lançamentos e batem com o que aparece na aba Fatura Copel.
