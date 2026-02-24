
# Correção: Exibir Email e Telefone do Fornecedor no Backoffice

## Problema

Quando o solicitante libera a OC para o fornecedor, ele informa o email e telefone de contato do fornecedor (campos `fornecedor_email_contato` e `fornecedor_telefone_contato`). Esses dados são salvos corretamente no banco, mas **nunca são exibidos** na visão do Backoffice.

O Backoffice precisa dessas informações para enviar a OC ao fornecedor.

## Solução

Adicionar uma seção destacada no painel de detalhes do Backoffice que aparece quando a solicitação está nos status `liberado_fornecedor` ou `enviado_fornecedor`, mostrando os dados de contato informados pelo solicitante.

A seção será exibida logo após o card do Documento Emitido (que é a primeira coisa que o analista vê), com destaque visual em verde para chamar a atenção.

## Arquivo modificado

| Arquivo | Alteração |
|---|---|
| `src/pages/Backoffice.tsx` | Adicionar bloco de "Contato do Fornecedor" no painel de detalhes, visível para status `liberado_fornecedor` e `enviado_fornecedor` |

## Detalhes técnicos

No painel de detalhes (`detalhes?.solicitacao`), logo após a seção de Documento Emitido (linha ~1619), será inserido um novo bloco:

```text
Contato do Fornecedor (para envio da OC)
-----------------------------------------
Email: fornecedor_email_contato
Telefone: fornecedor_telefone_contato
```

- Os dados já existem no objeto `detalhes.solicitacao` (vêm do `s.*` na RPC `get_solicitacao_detalhes`)
- A seção só aparece quando pelo menos um dos campos estiver preenchido
- Inclui ícones de Mail e Phone para facilitar a leitura
- Card com destaque visual (borda verde) para o analista localizar rapidamente

Também será adicionada uma indicação visual no card da lista (não apenas no detalhe) quando o status for `liberado_fornecedor`, mostrando que há dados de contato disponíveis.
