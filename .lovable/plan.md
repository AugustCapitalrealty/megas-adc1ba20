## Diagnóstico

O trigger `trg_enforce_solicitacao_anexos_ins` da migration anterior está bloqueando **todo envio novo**. Motivo: o frontend faz `INSERT` da solicitação com `status='recebido'` **antes** de subir os anexos (os anexos precisam do `id` gerado). Como o trigger `BEFORE INSERT` consulta `public.anexos` naquele instante, sempre encontra vazio e aborta com "Envio bloqueado: anexos obrigatórios ausentes: orcamento_escolhido".

A prova está no print: OC de Material de Consumo com 2 anexos já selecionados no wizard → erro no INSERT antes dos uploads acontecerem.

## Correção

### 1. Ajustar o guard no banco (migration)
- **Remover** o trigger `BEFORE INSERT` (`trg_enforce_solicitacao_anexos_ins`). Não dá para validar anexos no mesmo `INSERT` que cria a solicitação — os arquivos ainda não têm `solicitacao_id` para existir.
- **Manter** o trigger `BEFORE UPDATE OF status` — esse continua sendo a guarda real: só deixa sair de `rascunho` para qualquer status ativo se os anexos estiverem lá.
- Função `solicitacao_missing_anexos` e a de enforce continuam iguais.

### 2. Ajustar o fluxo de envio no frontend
`src/pages/NovaSolicitacao.tsx#handleSubmit` passa a operar em três passos, todos dentro do try/catch já existente:
1. `INSERT` da solicitação com `status='rascunho'` (não dispara o guard).
2. `uploadAnexos(solicitacaoId, ...)` como hoje.
3. `UPDATE solicitacoes SET status='recebido' WHERE id=?` — aqui o trigger valida. Se faltar anexo, exceção → toast atual + volta para a etapa `anexos`; a solicitação fica como rascunho e o usuário completa sem perder nada.

Telemetria (`submit_attempt`, warning em `error_logs` para mapa vazio) permanece igual, só é emitida antes do passo 1.

### 3. Chamado atual (Mega Itajaí / caminhão pipa)
Nada de dados a mexer — assim que o fix subir, o usuário reenvia normalmente pelo wizard e a solicitação vai criada com anexos.

## Detalhes técnicos
- Migration nova em `supabase/migrations/` só com `DROP TRIGGER IF EXISTS trg_enforce_solicitacao_anexos_ins ON public.solicitacoes;` (mantém o `_upd`).
- `NovaSolicitacao.tsx`: alterar payload do `insert` para forçar `status: 'rascunho'` no envio novo (rascunho existente já entra como rascunho), e adicionar `UPDATE ... status='recebido'` depois do `uploadAnexos`. Tratamento do erro `MISSING_ANEXOS:` do trigger já existe — reaproveitar.
- Ordem das notificações (`notifyBackofficeNewSolicitacao`, etc.) fica **depois** do UPDATE bem-sucedido, para não avisar de solicitação que ficou em rascunho por falha de anexo.

## Fora de escopo
- Alterar regras de `solicitacao_missing_anexos` (a lógica em si está certa).
- Refatorar `uploadAnexos` ou UI do wizard além do necessário.