

# Botão "Gerar PDF Teste" na aba Rateio

## O que será feito
Adicionar um botão "Gerar PDF Teste" na `RateioConfigTab` que gera um PDF de demonstrativo de rateio com dados fictícios (valor aleatório entre R$10.000 e R$100.000, protocolo "TESTE-0000") usando as áreas reais cadastradas. Isso permite visualizar o layout do PDF sem precisar ter uma solicitação real.

## Alteração

### `src/components/RateioConfigTab.tsx`
- Importar a lógica de geração de PDF do `RateioCard` (extrair a função `handleDownloadPDF` ou reimportar os mesmos deps: `jsPDF`, `autoTable`, `logoMega`)
- Adicionar um botão "Gerar PDF Teste" ao lado do botão "Salvar Configurações"
- Ao clicar, gerar valores de rateio com base nas áreas editadas e um valor total aleatório, e chamar a mesma lógica de PDF

**1 arquivo editado.**

