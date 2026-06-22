Problema encontrado: na Fatura Copel você digita a tarifa em **Preço unit (R$)**, mas a fatura do cliente está usando a coluna calculada **Tarifa unit.**. Por isso, para 2026-06, o cliente mostra Ponta **1,549011** porque soma **0,394284 + 1,154727**, em vez de usar a soma dos preços digitados **0,549525 + 1,609375**.

Plano de correção:

1. Ajustar o salvamento da aba **Fatura Copel**
   - Quando salvar a Fatura Copel, gravar as tarifas usadas pelo cálculo do cliente a partir de `preco_unit`, não de `tarifa_unit`.
   - Mapeamento correto por competência:
     - `demanda_usd` ← preço unitário de DEMANDA USD
     - `te_ponta` ← preço unitário de ENERGIA ELÉTRICA TE PONTA
     - `tusd_ponta` ← preço unitário de ENERGIA ELÉTRICA USD PONTA
     - `te_fora` ← preço unitário de ENERGIA ELÉTRICA TE F PONTA
     - `tusd_fora` ← preço unitário de ENERGIA ELÉTRICA USD F PONTA

2. Ajustar o salvamento antigo dentro de **Memória de Cálculo**
   - Existe outro salvamento de Fatura Copel no componente antigo que ainda pode manter o comportamento errado.
   - Corrigir também esse ponto para evitar que uma tela sobrescreva a outra.

3. Corrigir os dados já salvos
   - Aplicar uma atualização na base para competências já lançadas, incluindo **2026-06**, copiando os `preco_unit` do JSON da Fatura Copel para as colunas usadas pela fatura do cliente.
   - Assim não depende de você abrir e salvar de novo manualmente.

4. Validar o resultado
   - Conferir no banco que 2026-06 ficou com:
     - Ponta = `0,549525 + 1,609375`
     - Fora Ponta = `0,342063 + 0,160611`
     - Demanda = `27,603090`
   - Conferir que a fatura do cliente passa a usar essas tarifas da Fatura Copel da mesma competência.