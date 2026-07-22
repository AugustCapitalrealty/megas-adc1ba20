## Diagnóstico confirmado

- O chamado `2026000721` existe e está em andamento sem nenhum registro na tabela de anexos.
- Pelas regras atuais, ele é uma `OC` de `material_consumo`; portanto deveria ter `orcamento_escolhido` obrigatório.
- A proteção atual no banco só valida quando a solicitação sai de `rascunho` para outro status. Esse chamado foi criado em `2026-07-20`, antes da proteção mais recente, então conseguiu avançar sem anexo.
- Também identifiquei que a função auxiliar `solicitacao_missing_anexos` está sem permissão de execução para a ferramenta de auditoria atual, o que dificulta diagnosticar casos rapidamente.

## Plano de correção urgente

1. **Bloqueio no banco para casos legados sem anexo**
   - Ajustar a função de validação para bloquear qualquer mudança de status em solicitação não-rascunho que esteja sem anexos obrigatórios.
   - Isso impede que chamados antigos, como `2026000721`, continuem avançando sem corrigir os anexos.
   - Preservar o fluxo novo: criação em `rascunho` → upload dos anexos → promoção para `recebido`.

2. **Corrigir permissões da auditoria de anexos**
   - Restaurar permissão segura para a função que calcula anexos obrigatórios ausentes.
   - Manter bloqueio para anônimos; permitir apenas usuários autenticados e serviço interno.

3. **Criar uma visão/RPC segura de pendências de anexos**
   - Adicionar uma forma simples de listar solicitações ativas com anexos obrigatórios ausentes.
   - Acesso limitado por RLS: solicitante vê as próprias, backoffice/admin vê conforme permissões atuais.

4. **Hardening no frontend de correção/reenvio**
   - Em `Minhas Solicitações`, antes de reenviar uma correção, validar anexos existentes + novos anexos.
   - Se faltar anexo obrigatório, mostrar erro claro e não permitir mandar de volta para `recebido`.
   - Isso cobre o caso do print: correção/reenvio não deve passar se o arquivo não ficou registrado.

5. **Tratamento melhor do erro do servidor**
   - Se o banco bloquear com `MISSING_ANEXOS`, mostrar os nomes amigáveis dos anexos faltantes.
   - Evitar mensagem genérica e direcionar o usuário para anexar o arquivo correto.

6. **Auditoria do caso `2026000721`**
   - Após a correção, consultar novamente o chamado para confirmar que ele aparece como pendente de `orcamento_escolhido`.
   - Não vou inserir anexo manualmente, porque o arquivo correto precisa ser enviado pelo usuário/backoffice.