## Diagnóstico verificado

A divergência do print do Restaurante vem de dois pontos concretos:

1. **Bandeira tarifária**
   - Na planilha, a bandeira amarela usa a tarifa oficial **2,5464 R$/100 kWh**.
   - No banco da competência 2026-06, o app está salvo com **2,5226775999570252**, que é a tarifa derivada/rateio fechado.
   - Por isso o Restaurante aparece com **R$ 1.093,46** em vez dos **R$ 1.103,75** da planilha.

2. **Impostos da fatura do cliente**
   - Na planilha `FATURAS CLIENTES`, o cálculo é:
     - `Total Fornecimento = SUM(I18:I20)+SUM(I13:I15)`
     - `ICMS base = Total Fornecimento`
     - `PIS/COFINS base = Total Fornecimento - ICMS`
   - No app, o cálculo atual do bloco de impostos está considerando consumo + demanda usada, mas não inclui a **ultrapassagem** na base dos impostos. Isso explica o print com bases menores.

## Plano de correção

1. **Ajustar a Fatura por Cliente para seguir a planilha**
   - Incluir `rsUltrapassagem` na base tributável.
   - Manter a demanda isenta fora do ICMS, mas dentro do PIS/COFINS sem dedução de ICMS.
   - Atualizar as sublinhas para mostrar também “Imposto da ultrapassagem”.

2. **Corrigir a lógica da bandeira no fechamento Copel**
   - Quando o modo selecionado for **Tarifa oficial (planilha)**, salvar obrigatoriamente `bandeira_valor = bandeira_tarifa_oficial`.
   - Garantir que competências carregadas em modo oficial não continuem usando tarifa derivada antiga.
   - Para 2026-06, aplicar a tarifa oficial **2,5464** ao salvar/normalizar.

3. **Corrigir rótulo Ponta/Fora da bandeira**
   - Os dados salvos mostram `bandeira_amarela_fora` com quantidade de Ponta e `bandeira_amarela_ponta` com quantidade de Fora Ponta.
   - Ajustar a separação/mapeamento para não inverter os buckets, evitando confusão futura.

4. **Adicionar uma auditoria visual curta no admin**
   - No bloco “Bandeira”, mostrar a fórmula:
     `((Ponta + Fora Ponta + perdas) / 100) × tarifa oficial`
   - Mostrar lado a lado: tarifa usada, tarifa da planilha e diferença.

5. **Validar contra a planilha enviada**
   - Conferir especificamente o Restaurante:
     - Bandeira: **R$ 1.103,75**
     - Total: **R$ 34.948,91**
     - PIS/COFINS base: **R$ 27.406,38**
     - ICMS base: **R$ 33.835,04**

## Arquivos a alterar

- `src/components/admin/energia/FaturasTab.tsx`
- `src/components/admin/energia/FaturaCopelTab.tsx`

Sem nova tabela e sem mudança estrutural no banco.