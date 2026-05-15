## Objetivo

Permitir que o solicitante crie uma solicitação **incompleta** (rascunho) e a salve sem enviar para o backoffice. Mais tarde ele retoma, completa as informações faltantes e envia. Anexos podem ser carregados desde o rascunho.

## Como o usuário vai usar

```text
Nova Solicitação
 ├─ preenche o que tem
 ├─ adiciona anexos parciais
 ├─ [Salvar Rascunho]  ← novo botão (sempre visível)
 └─ [Enviar Solicitação] (continua existindo, exige tudo válido)

Minhas Solicitações
 └─ aba "Rascunhos" (nova) → lista somente os rascunhos do usuário
      ├─ Continuar  → reabre o wizard pré-preenchido
      └─ Excluir    → apaga rascunho + anexos
```

Backoffice **nunca vê** rascunhos. Colegas do mesmo empreendimento **também não** — rascunho é privado do autor até ser enviado.

## Comportamento

**Salvar Rascunho:**
- Disponível em qualquer etapa do wizard.
- Exige apenas `empreendimento` + `descrição` (mínimo para identificar). Demais campos podem ficar vazios/null.
- Cria a `solicitacao` com `status = 'rascunho'`, **sem** gerar protocolo (ou com protocolo prefixado `RAS-...` para não consumir contador). Decisão: **não gerar protocolo** enquanto for rascunho — protocolo definitivo é atribuído no envio.
- Não dispara notificações (e-mail, GChat, histórico de "criacao").
- Anexos podem ser enviados normalmente vinculados ao id do rascunho.

**Continuar Rascunho:**
- Rota `/nova-solicitacao?rascunho={id}` carrega os campos da `solicitacoes` + anexos existentes.
- Salvar de novo: `UPDATE` no mesmo registro.
- Botão Enviar: valida tudo, faz `UPDATE` mudando `status` para `recebido`, gera **protocolo agora**, insere histórico de criação e dispara as notificações que hoje rodam no submit.

**Excluir Rascunho:**
- Delete em `solicitacoes` + cascata manual em `anexos` + arquivos do storage.
- Disponível apenas para o dono.

## Mudanças técnicas

### 1. Banco (migration)

- Adicionar valor `'rascunho'` ao enum `request_status`.
- Tornar `protocolo` aceitar `NULL` ou string vazia (já é `''` default). Verificar a unique constraint de protocolo — ignorar `''`/`NULL` (`CREATE UNIQUE INDEX ... WHERE protocolo <> ''`). Se já existir constraint simples, recriar como índice parcial.
- Tornar `fornecedor_id` e demais campos hoje obrigatórios para insert continuarem opcionais (a maioria já é nullable; confirmar `descricao`, `valor`, `tipo`, `natureza_orcamentaria`).
  - Estratégia: manter colunas `NOT NULL` para registros enviados, mas o rascunho exige relaxar. Alternativa segura: adicionar `valor` default 0, `tipo` default `'OC'`, `natureza_orcamentaria` default `'servicos_diversos'` — para rascunho preencher placeholders. **Preferida**: relaxar `NOT NULL` desses campos e validar via trigger só quando `status <> 'rascunho'`.
- Policies RLS:
  - **Esconder rascunho do backoffice**: alterar `Backoffice can view all solicitacoes` para `... AND status <> 'rascunho'`. (Ou criar policy nova e ajustar a antiga.)
  - **Esconder rascunho do empreendimento**: alterar `Users can view solicitacoes from their empreendimento` para excluir rascunhos (`status <> 'rascunho'`). Dono continua vendo via `Users can view own solicitacoes`.
  - **UPDATE do dono em rascunho**: adicionar policy `Users can update own rascunho` (`auth.uid() = user_id AND status = 'rascunho'`).
  - **DELETE do dono em rascunho**: adicionar policy `Users can delete own rascunho`.
  - **anexos / documentos_fiscais**: as policies atuais usam `user_can_access_solicitacao`. Como rascunho fica invisível para empreendimento, garantir que a policy "own" cubra inserts em anexos quando status = rascunho. Já cobre.
- Trigger/edge: `protocol` generation hoje provavelmente roda em insert. Verificar e mover geração para quando status muda de `rascunho` → `recebido` (ou rodar no insert apenas se status != rascunho).

### 2. Frontend

**`src/pages/NovaSolicitacao.tsx`**
- Adicionar botão `Salvar Rascunho` no header e/ou no `FormNavigation` (sempre habilitado se `empreendimento` + `descricao` preenchidos).
- Novo handler `handleSaveDraft`: monta payload parcial, faz insert com `status: 'rascunho'`, OU update se já existir `draftId` no estado.
- Detectar `?rascunho={id}` na URL → buscar `solicitacao` + `anexos`, popular `formState` via setters, guardar `draftId` em estado.
- No `handleSubmit` existente: se `draftId`, faz `UPDATE` em vez de `INSERT`, definindo `status: 'recebido'` e disparando geração de protocolo (RPC ou deixar trigger gerar quando status != rascunho).

**`src/components/nova-solicitacao/FormNavigation.tsx`**
- Aceitar prop `onSaveDraft` e renderizar botão secundário ao lado de Voltar.

**`src/pages/MinhasSolicitacoes.tsx`**
- Nova aba/filtro "Rascunhos" mostrando `status = 'rascunho'` do próprio usuário.
- Card simplificado com: empreendimento, descrição (se houver), valor (se houver), data atualização, botões "Continuar" (navega para `/nova-solicitacao?rascunho=<id>`) e "Excluir".

**`src/types/index.ts`**
- Adicionar `'rascunho'` em `RequestStatus`, `STATUS_LABELS` ("Rascunho"), `STATUS_ACTION_LABELS` ("Complete e envie quando estiver pronto").

**`src/components/ui/status-badge.tsx`**
- Novo `statusConfig.rascunho` com ícone `FileEdit` e classe neutra (cinza).

**Hooks de dashboard / KPIs / backoffice**
- Filtrar `status <> 'rascunho'` em queries de contagem (dashboard, SLA, backoffice list, monitoramento). Usar busca global por `status` para ajustar.

### 3. Anexos

- Upload de anexos para rascunho usa o mesmo bucket. Storage path continua `{user_id}/{solicitacao_id}/...`. Nada muda na policy.
- Ao excluir rascunho, remover arquivos do storage (loop sobre `anexos.storage_path`).

### 4. Notificações

- Não enviar nada em `salvar rascunho`.
- Manter notificações atuais no envio (rascunho → recebido).

## Pontos de atenção

- **Protocolo**: precisa garantir que rascunho não consuma `protocolo_counters`. Se a geração for por trigger BEFORE INSERT, condicionar a `status <> 'rascunho'`. Se for via RPC chamada do frontend, simplesmente não chamar.
- **Limite de rascunhos por usuário**: opcional — sugestão de 10 para evitar acúmulo. Decidir com base em feedback futuro; nesta entrega: sem limite.
- **localStorage `nova_solicitacao_draft`**: continua existindo para resgatar trabalho não salvo no servidor. Quando o usuário abre um rascunho do servidor, o autosave local fica desabilitado (ou é limpo) para não conflitar.
- **Edição em rascunho não passa por validações de envio**, mas o `handleSubmit` já roda todas as validações antes de mudar status para `recebido`.

## Perguntas para confirmar

1. O botão "Salvar Rascunho" deve aparecer **em todas as etapas** do wizard ou só a partir de uma etapa mínima?
2. Confirmar que **rascunho é privado do autor** (colegas do empreendimento não enxergam até ser enviado)?
3. Quando o usuário "Continuar" um rascunho e clicar em Enviar, o registro mantém o **mesmo id** e ganha **protocolo novo no envio** — ok?
