

# Remover seções inferiores do PDF de Rateio

## O que será removido
Seções 4b a 7 do PDF (linhas 176–276):
- Valor rateado por m²
- Gráfico de Distribuição do Rateio (barras horizontais)
- Metodologia de Cálculo + quantidade de condomínios
- Conferência matemática

## O que permanece
- Cabeçalho com logo
- Cards de resumo (Valor, Tipo, Data, Protocolo)
- Tabela detalhada
- Faixa de Total Rateado
- Rodapé institucional

## Alteração
**1 arquivo:** `src/lib/rateio-pdf.ts` — remover linhas 176–276 (seções 4b, 5, 6, 7), mantendo o footer intacto.

