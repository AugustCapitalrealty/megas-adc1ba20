## Diagnóstico confirmado

- Os dados existem no backend: há **640 documentos emitidos** e **622 solicitações com OC**.
- A tela não está zerada por falta de dados nem por filtro de usuário.
- O erro real é **Bad Request (400)** na chamada que busca `solicitacoes` com um `id=in.(...)` contendo centenas de IDs de uma vez.
- Isso explica por que “funcionava ontem”: ao crescer a quantidade de OCs, a URL da consulta ficou grande demais/instável para a API, e a tela passou a cair no erro e mostrar zero para todos.

## Plano de correção

1. **Quebrar consultas grandes em lotes**
   - Ajustar `useMonitoramentoOC.ts` para buscar `solicitacoes`, `documentos_fiscais` e `historico_solicitacoes` em chunks menores de IDs.
   - Evitar qualquer `.in('id', ids)` gigante em uma única requisição.

2. **Aplicar o mesmo padrão nas buscas auxiliares**
   - Também quebrar em lotes as buscas de `fornecedores` e `profiles`, caso a lista cresça muito.
   - Manter a mesma lógica atual de permissões: o backend continua filtrando pelo acesso do usuário.

3. **Manter fallback visual útil**
   - Preservar a mensagem de erro na tela caso alguma chamada falhe.
   - Melhorar a mensagem para diferenciar “não existe dado” de “falha ao carregar”.

4. **Validar o cenário real**
   - Abrir `/monitoramento-oc` no navegador local.
   - Confirmar que não há mais 400 na rede.
   - Confirmar que os contadores/lista voltam a mostrar as OCs existentes para backoffice/admin e usuários comuns conforme permissão.