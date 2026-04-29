## Objetivo

Adicionar uma nova aba no módulo Projuris, **visível apenas para Backoffice/Admin**, com uma tabela operacional inspirada na "Em Aberto", focada em tomada de decisão: ver o que está parado, atualizar o status diretamente e registrar ações como "Minuta enviada ao Fornecedor".

## Onde aparece

- Arquivo `src/components/monitoramento/TabProjuris.tsx`
- Nova primeira aba: **"Gestão Backoffice"** (ícone Briefcase), renderizada condicionalmente via `useAuth().isBackofficeOrAdmin`. Para usuários comuns nada muda.

## A tabela

Colunas, na ordem pedida:

1. **Nº Requisição** (`numero_requisicao`)
2. **Requisitante** (`requisitante`) — com badge "👤 Você" quando o nome do requisitante Projuris bater (case-insensitive, normalizado) com o `full_name` do usuário logado
3. **Empreendimento**
4. **Fornecedor** (parte antes do " - " em `cliente_fornecedor`)
5. **Valor** — *novo campo* `valor` em `projuris_requisicoes` (ver seção Banco). Quando ausente, mostra "—"
6. **Status** — Badge colorido + abaixo, em fonte menor, "Xd neste status" (calculado a partir do último evento que mudou o status; se não houver, usa `data_ultimo_envio_aprovacao` para AGUARDANDO APROVAÇÃO ou `updated_at` para os demais)
7. **Responsável** — destaca quando o responsável Projuris é "Backoffice" / "Jurídico" com chip primário, sinalizando "ação nossa"
8. **Data Requisição**
9. **Vínculo** — protocolo da solicitação interna ligada (mesmo botão clicável da Em Aberto, abre `OCDetalhesModal`)
10. **Ações** — botão "Tomar ação" abre o **Modal de Decisão** (abaixo)

Filtros e busca no topo (mesmo padrão da Em Aberto): busca livre, filtro por Status, filtro por Empreendimento, filtro por Responsável e um toggle **"Apenas ações nossas"** (responsavel ILIKE '%backoffice%' OR ILIKE '%jurídico%').

KPIs no topo, focados em decisão:
- Total em aberto
- Aguardando ação do Backoffice (responsável é backoffice/jurídico)
- Aguardando aprovação ≥ 7 dias
- Aguardando informações (bloqueando o requisitante)

Linhas com aging vermelho (>14d) ganham faixa lateral destacada para chamar atenção.

## Modal de Decisão (tomada de ação)

Abre ao clicar "Tomar ação" em uma linha. Contém:

- Resumo da requisição (Nº, fornecedor, status atual, dias parados, vínculo)
- **Novo Status** — Select com os valores existentes em `projuris_requisicoes.status` + opção "Manter atual"
- **Ação rápida** — chips pré-definidos que preenchem o campo de observação:
  - Minuta enviada ao Fornecedor
  - Minuta recebida do Fornecedor
  - Aguardando assinatura do Fornecedor
  - Enviado para aprovação interna
  - Solicitado complemento de informações
  - Documentação OK — pronto para execução
  - Outro (livre)
- **Observação** (textarea, obrigatória se ação = "Outro")
- **Próxima revisão** (date picker, opcional) — registra um lembrete

Ao confirmar:
1. Atualiza `projuris_requisicoes` (`status` se mudou, `updated_at`)
2. Insere registro em **nova tabela** `projuris_acoes` (histórico/auditoria) — ver Banco
3. Toast de sucesso e refresh da linha

Modal exibe também o histórico de ações anteriores daquela requisição (timeline simples).

## Banco

Migração nova, três mudanças:

```sql
-- 1) Valor da requisição (opcional, preenchido manualmente pelo backoffice ou via import futuro)
alter table public.projuris_requisicoes
  add column if not exists valor numeric;

-- 2) Histórico de ações do backoffice sobre a requisição
create table public.projuris_acoes (
  id uuid primary key default gen_random_uuid(),
  requisicao_id uuid not null references public.projuris_requisicoes(id) on delete cascade,
  user_id uuid not null,
  acao text not null,                -- ex: 'minuta_enviada_fornecedor', 'status_atualizado', 'outro'
  observacao text,
  status_anterior text,
  status_novo text,
  proxima_revisao date,
  created_at timestamptz not null default now()
);

create index on public.projuris_acoes (requisicao_id, created_at desc);

alter table public.projuris_acoes enable row level security;

create policy "Backoffice can view all projuris_acoes"
  on public.projuris_acoes for select to authenticated
  using (is_backoffice_or_admin(auth.uid()));

create policy "Backoffice can insert projuris_acoes"
  on public.projuris_acoes for insert to authenticated
  with check (is_backoffice_or_admin(auth.uid()) and auth.uid() = user_id);
```

`UPDATE` em `projuris_requisicoes` já é permitido para backoffice (policy existente "Backoffice can update projuris_requisicoes").

## Casamento Requisitante x Solicitante

Comparação **client-side** (sem mudança de schema): normaliza ambos os lados (lowercase + remove acentos + colapsa espaços) e compara `requisitante` Projuris com `profiles.full_name` do usuário logado para destacar "Você" e oferecer filtro "Minhas requisições".

Para o futuro (não nesta entrega): se quiser cravar vínculo persistente, criar tabela `projuris_requisitante_map (nome_projuris text, profile_id uuid)`.

## Arquivos

**Novos**
- `supabase/migrations/<timestamp>_projuris_gestao_backoffice.sql`
- `src/components/monitoramento/projuris/ProjurisGestaoBackoffice.tsx` (tabela + KPIs + filtros)
- `src/components/monitoramento/projuris/ProjurisDecisaoModal.tsx` (modal de tomada de ação + histórico)

**Editados**
- `src/components/monitoramento/TabProjuris.tsx` — adiciona aba condicional "Gestão Backoffice" como primeira aba quando `isBackofficeOrAdmin`
- `src/integrations/supabase/types.ts` — auto-gerado após migração

## Detalhes técnicos

- Reaproveita `STATUS_COLORS`, `formatDate`, `getFornecedorNome` de `ProjurisVisaoStatus` extraindo para `src/components/monitoramento/projuris/utils.ts`
- "Dias neste status" calculado: `differenceInDays(now, ultima_acao_de_mudanca_de_status_ou_data_requisicao)` consultando `projuris_acoes` mais recente com `status_novo not null`; fallback para `updated_at`
- Realtime opcional na tabela `projuris_acoes` para refletir mudanças entre usuários backoffice
- Acessibilidade: linhas focáveis por teclado, modal com `aria-describedby`
- Sem mudança nas demais abas Projuris

## Fora do escopo

- Importação automática do campo `valor` (será preenchimento manual nesta entrega)
- Notificação por GChat ao mudar status (pode ser próxima iteração)
- Vínculo persistente requisitante↔profile
