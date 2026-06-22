## Objetivo
Corrigir a tela da Fatura Copel para calcular como na planilha enviada:

```text
TOTAL DA FATURA = Total Fornecimento + Iluminação Pública + Crédito/Débito + Bandeira Tarifária
```

Sem somar ICMS e PIS/COFINS novamente, porque eles já estão embutidos nos valores dos itens da fatura.

## Plano
1. Ajustar a fórmula de total na aba **Fatura Copel**:
   - `Total Fornecimento` = soma apenas dos itens com consumo/demanda/ultrapassagem.
   - `TOTAL DA FATURA` = `Total Fornecimento` + `Iluminação Pública` + `Crédito/Débito` + `Bandeira`.
   - Tributos ficam visíveis, mas não entram no total final.

2. Ajustar o valor salvo em `copel_valor_total`:
   - Hoje ele ainda salva a soma bruta dos itens de forma que pode distorcer o total.
   - Passará a salvar o mesmo **TOTAL DA FATURA** exibido na tela.

3. Ajustar a aba **Memória de Cálculo** para usar o mesmo critério:
   - O campo `TOTAL Fatura` deve bater com o total da Copel salvo.
   - Para o caso do print: deve chegar em aproximadamente **R$ 24.412,22** quando `Total Fornecimento = R$ 24.404,16` e `Iluminação Pública = R$ 8,06`.

4. Revisar labels da interface para evitar confusão:
   - Separar claramente `Total Fornecimento` de `TOTAL DA FATURA`.
   - Manter `ICMS` e `PIS/COFINS` como informação/tributo, não como parcela somada.

5. Validar na competência atual:
   - Conferir que a tela deixa de mostrar R$ 25.468,62.
   - Confirmar que o total segue o modelo da planilha enviada.