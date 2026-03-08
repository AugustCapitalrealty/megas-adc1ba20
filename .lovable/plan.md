

# Remover duplicação de Mensagens no Backoffice

## Problema
No Backoffice, ao expandir um card de solicitação, o componente `SolicitacaoMessages` é renderizado duas vezes: uma dentro do card expandido (linha 1689) e outra no painel lateral de detalhes (linha 2488). Isso gera duas áreas de mensagens visíveis simultaneamente.

## Solução

**1 arquivo:** `src/pages/Backoffice.tsx`

Remover o bloco de Mensagens do card expandido (linhas 1683-1690), mantendo apenas o que está no painel lateral de detalhes (linha 2488, dentro do `Collapsible`). O painel lateral é o local mais adequado pois agrupa todas as informações detalhadas da solicitação.

