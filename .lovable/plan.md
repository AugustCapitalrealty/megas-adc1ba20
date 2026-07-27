## Objetivo

A Área Comum **não** é rateada entre os clientes. Ela é uma fatura própria da DEMERCADO (assim como a Obra). Ajustar a tela **Faturas por Cliente** para refletir isso.

## O que muda

1. **Sem rateio por m²**
   - Deixar de chamar `redistribuirAreaComumPorArea` em `FaturasTab.tsx`. A lista de faturas passa a ser exatamente o resultado de `agruparPorCliente` (Área Comum incluída como um cliente normal).
   - Remover o campo/legenda "Área Comum — sempre rateada por m² nas faturas dos clientes" do cabeçalho, e o selo "rateada por m²" / nota "já distribuída nos clientes acima" na linha da lista.

2. **Área Comum entra no somatório**
   - Hoje a linha é exibida "fora" do total (`faturasComArea` = faturas + areaComumInfo separado). Passa a ser uma linha comum: entra no total da Fatura Energy, no contador de clientes e na comparação com a Fatura Copel.
   - Manter apenas um selo discreto identificando que é conta da DEMERCADO (Área Comum / Obra), sem alterar valores.

3. **Consistência dos totais**
   - Com a Área Comum somando, o total Energy deve continuar batendo com a Copel (antes o rateio redistribuía o mesmo valor; agora ele fica concentrado numa linha). Verificar Fatura Copel × Fatura Energy × Diferença e a tabela de multas após a mudança.

## Detalhes técnicos

- Arquivo afetado: `src/components/admin/energia/FaturasTab.tsx` (import de `redistribuirAreaComumPorArea`, `useMemo` das linhas 142-218, `faturasComArea` na 244, render da linha 590-600 e o bloco de legenda no cabeçalho).
- `redistribuirAreaComumPorArea` continua existindo em `src/lib/energia-rateio.ts` (não utilizada pela tela) — sem mudanças no motor de cálculo.
- Sem alteração de banco de dados.
