## Diagnóstico confirmado

- O chamado `2026000721` está em `enviado_fornecedor`, tipo `OC`, natureza `material_consumo`, com `numero_chamado_fluig = RM` e sem anexos registrados na tabela `anexos`.
- A trava criada para impedir envio inicial sem anexos está ativa no gatilho `trg_enforce_solicitacao_anexos_upd`.
- O problema: a função atual valida qualquer mudança de status legado ativo para outro status ativo. Por isso, ao Backoffice tentar concluir (`enviado_fornecedor` -> `concluida`) e lançar o Fluig de pagamento, ela bloqueia por falta de `orcamento_escolhido`.
- Essa validação é ampla demais para fluxos posteriores do Backoffice. A regra correta deve proteger a entrada/ativação da solicitação e correções de anexos, sem travar conclusão ou lançamento de números Fluig em solicitações já processadas.

## Plano de correção

1. Ajustar a função de validação de anexos no backend:
   - Manter bloqueio para criação direta já ativa.
   - Manter bloqueio para promoção de `rascunho` para status ativo.
   - Remover o bloqueio genérico em mudanças posteriores entre status ativos, como `enviado_fornecedor` -> `concluida`.
   - Assim, a trava continua protegendo novos envios, mas deixa o Backoffice concluir/lançar Fluig em chamados legados já avançados.

2. Criar uma nova migração com essa correção:
   - Atualizar apenas `public.enforce_solicitacao_anexos()`.
   - Não alterar RLS, permissões ou outras regras fora desse bug.

3. Validar no banco após aplicar:
   - Confirmar que `2026000721` continua identificado como legado com anexo ausente.
   - Simular/checar que a mudança para `concluida` não será mais bloqueada pela trava de anexos.
   - Confirmar que promoção de `rascunho` para ativo ainda continua bloqueada quando faltar anexo obrigatório.

4. Opcionalmente ajustar a mensagem da UI se necessário:
   - Se o erro continuar vindo do backend por outro caminho, revisar o fluxo `handleConcluirLiberadaConfirmed` em `src/pages/Backoffice.tsx`, mas a causa confirmada está no gatilho do banco.