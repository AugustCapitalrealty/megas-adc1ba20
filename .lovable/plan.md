

# Melhorias Completas no PDF de Rateio

## Alterações em `src/lib/rateio-pdf.ts`

### 1. Cards de resumo — melhorar labels e valores
- Label "DATA" → "DATA DO RATEIO"
- Valor do tipo: "Por Área (proporcional)" → "Proporcional por área"
- Aumentar fonte do valor de 13pt para 14pt

### 2. Total destacado — separar valor e área em duas linhas
- Linha 1: "TOTAL RATEADO" + valor (bold, 14pt)
- Linha 2: "Área considerada" + valor da área (8pt, cinza)
- Aumentar altura da faixa de 16 para 20mm

### 3. Tabela — já está boa, micro ajustes
- Coluna "Valor Rateado" com `fontStyle: 'bold'` + cor laranja escuro (já tem bold, adicionar cor de destaque)
- Manter zebra rows e alinhamento à direita (já implementado)

### 4. Gráfico — adicionar subtítulo
- Após "Distribuição do Rateio", adicionar subtítulo: "Participação proporcional por condomínio"
- Barras já estão boas

### 5. Valor por m² — novo bloco após total
- Calcular `valorTotal / totalArea` e exibir: "Valor rateado por m²: R$ X,XXXX / m²"
- Posicionar logo abaixo da faixa de total

### 6. Metodologia — melhorar redação
- Texto: "O valor total foi distribuído proporcionalmente à área construída de cada condomínio em relação à área total considerada."
- Adicionar: "Quantidade de condomínios considerados: X"

### 7. Conferência matemática — novo bloco
- Após metodologia, adicionar:
  - "Conferência"
  - "Soma das participações: 100,00%"
  - "Soma dos valores rateados: R$ XX.XXX,XX"

### 8. Rodapé — adicionar hora
- `formatDate()` → `formatDateTime()` com hora: "08/03/2026 às 18:40"
- Mover "Documento confidencial" para última linha
- "Protocolo" → "Protocolo: TESTE-0000"

**1 arquivo editado.**

