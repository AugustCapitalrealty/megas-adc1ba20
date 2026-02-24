

# Correção: Exibir Email e Telefone do Fornecedor no Card do Backoffice

## Problema

Os campos `fornecedor_email_contato` e `fornecedor_telefone_contato` existem no banco e estão preenchidos (ex: protocolo #2026000141 tem `jean.tecservi@gmail.com` e `48 98418-4244`), mas:

1. A RPC `get_solicitacoes_backoffice` **não retorna** esses campos na listagem
2. O card na lista do Backoffice **não exibe** esses dados
3. A seção de contato só aparece no painel lateral "Ver Detalhes", que o analista pode não abrir

O analista precisa ver o email e telefone diretamente no card da solicitação para enviar a OC.

## Solução

Adicionar os campos de contato à RPC da listagem e exibi-los diretamente no card do Backoffice quando o status for `liberado_fornecedor` ou `enviado_fornecedor`.

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| Migration SQL | Atualizar RPC `get_solicitacoes_backoffice` para incluir `fornecedor_email_contato` e `fornecedor_telefone_contato` |
| `src/hooks/useBackofficeSolicitacoes.ts` | Adicionar os dois campos à interface `SolicitacaoBackoffice` |
| `src/pages/Backoffice.tsx` | Adicionar bloco de contato diretamente no card (antes dos botões de ação), visível nos status `liberado_fornecedor` e `enviado_fornecedor` |

## Detalhes técnicos

**Migration SQL** - Adicionar ao SELECT da RPC:
```text
s.fornecedor_email_contato,
s.fornecedor_telefone_contato
```

**Interface `SolicitacaoBackoffice`** - Novos campos:
```text
fornecedor_email_contato: string | null;
fornecedor_telefone_contato: string | null;
```

**Card do Backoffice** - Novo bloco visual entre as infos do card e os botões de ação (linha ~1265), com destaque em verde:
```text
Contato para envio da OC:
  [Mail icon] jean.tecservi@gmail.com
  [Phone icon] 48 98418-4244
```

A seção existente no painel lateral "Ver Detalhes" será mantida como está.
