Plano para corrigir com foco:

1. Na aba `Fatura Copel`, parar de calcular a diferença usando apenas os totais buscados diretamente da tabela de lançamentos.
2. Repetir a mesma regra exibida em `Lançamentos > Consumo por Cliente`:
   - `TOTAL Fatura Copel` vem de `energia_competencia_tarifas` (`copel_consumo_ponta_kwh` e `copel_consumo_fora_kwh`).
   - `TOTAL Preenchido` vem da soma dos lançamentos por módulo (`consumo_ponta_kwh` e `consumo_fora_kwh`).
   - `Diferença = TOTAL Fatura Copel − TOTAL Preenchido`, com o mesmo tratamento visual: zero em verde, positivo em âmbar com `+`, negativo em vermelho.
3. Ajustar a tabela “Diferença da Fatura Copel” para espelhar exatamente essa estrutura dos lançamentos:
   - `TOTAL Preenchido`
   - `TOTAL Fatura Copel`
   - `Diferença (Copel − Preenchido)`
   - colunas de Ponta, Fora da Ponta e Total.
4. Usar esses mesmos valores também na coluna “Diferença Copel” do bloco “Medidor (Energy)”, mantendo o salvamento das perdas Copel baseado nesse cálculo.
5. Não alterar banco, backend, nem regras de rateio — apenas conectar a tela da Fatura Copel aos mesmos dados e lógica já usados em Lançamentos.