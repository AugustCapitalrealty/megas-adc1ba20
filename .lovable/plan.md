

# Alinhar cabeçalhos da tabela ao centro

A imagem mostra que os cabeçalhos "Área (m²)", "Participação" e "Valor Rateado" devem estar centralizados, enquanto os valores numéricos ficam alinhados à direita. Atualmente o `headStyles` usa `halign: 'left'` para todos.

## Alteração em `src/lib/rateio-pdf.ts`

- Linha 137: Mudar `headStyles` de `halign: 'left'` para `halign: 'center'`
- Nas `columnStyles` 1, 2 e 3: adicionar `halign: 'center'` no cabeçalho — mas como `headStyles` é global, basta o ajuste acima
- Coluna 0 (Condomínio) permanece `halign: 'left'` via columnStyles

**1 arquivo, 1 micro-ajuste.**

