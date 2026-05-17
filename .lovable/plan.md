## Objetivo

Endurecer o **Modo Rascunho** já implementado, cobrindo riscos identificados em uso real: ausência de aba dedicada, anexos duplicados, drafts vazando em KPIs/listas, perda de trabalho, concorrência entre abas e falta de notificação ao promover o rascunho.

## Riscos atuais x correção

| # | Risco hoje | Correção |
|---|---|---|
| 1 | Rascunhos aparecem na aba "Todas" / contadores do solicitante (RLS só esconde para colegas, não para o dono) | Filtrar `status !== 'rascunho'` em todos os `statusCounts` e tabs gerais; adicionar aba dedicada "Rascunhos" |
| 2 | Não existe botão **Excluir rascunho**; storage fica órfão se o usuário apagar manualmente | Botão "Excluir" no card + handler que apaga `anexos` (DB) + arquivos em `storage.objects` antes de deletar a linha |
| 3 | Anexos ficam **duplicados** se o usuário salvar o rascunho 2× com o mesmo arquivo no mesmo `tipo` | Antes de inserir, deletar `anexos` existentes de mesmo `(solicitacao_id, tipo)` e o respectivo arquivo no storage |
| 4 | Ao carregar `?rascunho=id`, os anexos já salvos **não aparecem** no step de anexos → usuário re-anexa (duplica) ou pensa que precisa enviar tudo de novo | Buscar `anexos` no load e popular `formState.anexos` com placeholders "(já enviado: nome.pdf)" + lista em `outrosAnexos`; expor opção "Remover" que apaga do servidor |
| 5 | `useFormPersistence` (localStorage) continua salvando enquanto o usuário edita um rascunho do servidor → conflito ao reabrir | Pausar autosave quando `draftId` está setado (já há `clearDraft()` no load — adicionar flag `disabled` no hook) |
| 6 | Duas abas editando o mesmo rascunho → última escrita ganha sem aviso | Versionamento otimista: incluir `updated_at` no payload do `update` com `.eq('updated_at', loadedUpdatedAt)` — se 0 linhas afetadas, mostrar toast "Rascunho foi alterado em outra aba, recarregue" |
| 7 | Saída acidental da página com mudanças não salvas perde dados | `beforeunload` quando há campos preenchidos e `savingDraft === false` e draft está "sujo" (dirty flag) |
| 8 | Quando rascunho é promovido a `recebido`, o trigger `notify_new_solicitacao` (AFTER INSERT) **não dispara** → o solicitante não recebe a notificação in-app "Sua solicitação foi criada" | Estender `handle_rascunho_envio` para também inserir em `public.notifications` na promoção |
| 9 | RLS UPDATE de rascunho permite `WITH CHECK (auth.uid() = user_id)` — sem restrição de `status`. Já cobre promoção, mas permite o dono "mover" para qualquer status manualmente (ex.: `concluida`). Não é exploitável via UI mas é folgado | Restringir `WITH CHECK` para `status IN ('rascunho','recebido')` (apenas manter rascunho ou enviar) |
| 10 | Card de rascunho pode renderizar com `descricao/valor/fornecedor` nulos e quebrar componentes que assumem valores | Guards defensivos no `SolicitanteSolicitacaoCard`: placeholders "Sem descrição", "Sem valor", "Sem fornecedor"; ocultar ações de fluxo (NF, ciência, transferir) quando `status === 'rascunho'` |
| 11 | Badge do status "Rascunho" usa classe `status-cancelado` (vermelho — confunde com cancelado) | Trocar para classe neutra (cinza/info), ícone `FileEdit` mantido |
| 12 | Limite implícito 0 → usuário pode acumular centenas de rascunhos | Limite de **20 rascunhos por usuário** (check no `handleSaveDraft`: contar antes do insert) |
| 13 | Ao apagar rascunho durante o submit (caso raro de UPDATE com `.eq('id', draftId)`), se outra aba já excluiu, o update retorna 0 linhas e o frontend mostra "sucesso silencioso" | Após o `update` do submit, validar `data` retornado; se nulo → toast "Rascunho não existe mais" |
| 14 | `handleSaveDraft` limpa `setAnexos({})` mesmo se o upload falhar parcialmente | Só limpar os `tipos` cujo upload foi confirmado (Promise.allSettled) |

## Mudanças

### Migration

- Atualizar policy `Users can update own rascunho` para `WITH CHECK (auth.uid() = user_id AND status IN ('rascunho','recebido'))`.
- Atualizar função `handle_rascunho_envio` para inserir notificação in-app no momento da promoção.

### Frontend

**`src/pages/NovaSolicitacao.tsx`**
- Load de `?rascunho=id`: ler `anexos` existentes + popular placeholders no step de anexos; guardar `loadedUpdatedAt`.
- `handleSaveDraft`: limite 20, dedup de anexos por `tipo` (delete antigo antes de inserir), `Promise.allSettled` para parcial, `updated_at` check otimista.
- `beforeunload` listener quando dirty.
- Desabilitar autosave do `useFormPersistence` quando `draftId` está setado.
- Submit: tratar `data === null` após `update`.

**`src/hooks/useFormPersistence.ts`**
- Aceitar prop `disabled` para pausar leitura/escrita no localStorage.

**`src/pages/MinhasSolicitacoes.tsx`**
- Nova aba **"Rascunhos"** dentro de "Em Andamento" com contador.
- Excluir rascunhos das demais abas (`status_counts` + filtros) usando `status !== 'rascunho'` na base `solicitacoesFiltradasBase`.
- Modal de confirmação "Excluir rascunho" + handler que lista `anexos`, faz `supabase.storage.from('anexos').remove([paths])` e depois `delete().eq('id', draftId)`.

**`src/components/solicitante/SolicitanteSolicitacaoCard.tsx`**
- Quando `status === 'rascunho'`: card simplificado mostrando empreendimento, descrição (ou "Sem descrição"), valor (ou "—"), data da última atualização, dois botões **"Continuar editando"** e **"Excluir"**. Esconder badges/ações de fluxo normal.

**`src/components/ui/status-badge.tsx`**
- Classe `rascunho` → `status-pendente` neutra (cinza), não `status-cancelado`.

### Sem alterações

- Trigger `set_protocolo` (já trata rascunho).
- RLS de anexos/documentos_fiscais (já cobrem via `user_can_access_solicitacao` + dono).
- Backoffice / Dashboard / SLA (RLS já oculta rascunho deles).

## Não escopo

- Compartilhar rascunho com colegas do empreendimento (continua privado do autor).
- Histórico de versões do rascunho.
- Edição de rascunho fora do wizard `/nova-solicitacao`.
