## Problema

Ao tentar registrar a OC **#063787** na solicitação `#2026000274`, o backoffice recebe o erro genérico **"Erro ao registrar — Não foi possível registrar o(s) documento(s)"**.

A causa raiz está no banco: já existe uma OC `063787` registrada nessa solicitação desde **06/04/2026**. A tabela `documentos_emitidos` tem o constraint:

```
UNIQUE (solicitacao_id, numero_documento, tipo_documento)
```

Resultado: o upload do PDF vai para o Storage, mas o `INSERT` falha com violação de unique key (código `23505`). O `try/catch` engole o erro e mostra apenas a mensagem genérica — o usuário não entende o que aconteceu, e fica um arquivo órfão no bucket `documentos-emitidos`.

> Validei pelos dados: a solicitação `e6109425-…-330a39117bc1` (protocolo 2026000274) já possui `OC 063787` em `documentos_emitidos`.

## Correção (frontend, em `src/pages/Backoffice.tsx`)

1. **Pré-validação antes do upload**: antes do loop de upload em `handleRegistrarOCAC`, consultar `documentos_emitidos` por `(solicitacao_id, tipo_documento='OC', numero_documento IN [...])`. Se houver duplicidade, abortar com toast claro:
   - "OC nº 063787 já registrada nesta solicitação. Use outro número ou remova-a antes de continuar."
2. **Mensagens de erro detalhadas**: capturar `error.code === '23505'` no catch e exibir mensagem amigável citando o(s) número(s) conflitantes. Para outros erros, exibir `error.message` em vez do texto genérico.
3. **Cleanup de arquivo órfão**: se o `INSERT` falhar após o upload bem-sucedido, remover o arquivo recém-enviado do bucket `documentos-emitidos` (`supabase.storage.from('documentos-emitidos').remove([filePath])`) para não deixar lixo.
4. **Logging**: manter `console.error` com o objeto de erro completo para diagnóstico futuro.

## Fora de escopo

- Não alterar políticas RLS (verificadas, estão corretas para `is_backoffice_or_admin`).
- Não alterar o constraint único — ele é desejado.
- Não mexer no fluxo de NF/AC, apenas no caminho de OC do backoffice.

## Detalhes técnicos

- Arquivo único alterado: `src/pages/Backoffice.tsx`, função `handleRegistrarOCAC` (linhas ~338–450).
- Sem migrations, sem mudanças em edge functions.
