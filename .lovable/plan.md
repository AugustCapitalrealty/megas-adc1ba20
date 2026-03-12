

## Plano de Modificações

### 1. Remover obrigatoriedade da evidência (foto) para serviço no passado

No `AceiteModal` (SolicitanteModals.tsx), quando o solicitante seleciona "Serviço" e a data é no passado, o campo de evidência aparece como obrigatório (`*`) e bloqueia o botão "Continuar". A mudança:

| Arquivo | Mudança |
|---------|---------|
| `src/components/solicitante/SolicitanteModals.tsx` (linha 664) | Remover `*` do label "Evidência (foto/documento)" |
| `src/components/solicitante/SolicitanteModals.tsx` (linha 784) | Remover `!evidenciaFile` da condição `disabled` do botão |

O campo de upload continua visível — só deixa de ser bloqueante.

---

### 2. Adicionar "Módulo Vago" como cliente em todos os Megas

Inserir na tabela `clientes` o registro "Módulo Vago" e vinculá-lo a todos os empreendimentos existentes na tabela `clientes_empreendimentos` (mega_curitiba, mega_itajai, mega_esteio). Quando Mega Canoas for criado, vincular lá também.

Isso será feito via **insert tool** (dados, não schema).

---

### 3. Criar empreendimento "Mega Canoas"

Requer alterações no banco e no código:

**Banco (migration):**
- Alterar o enum `empreendimento` para incluir `'mega_canoas'`
- Inserir `rateio_configuracao` para mega_canoas (área m² inicial a definir — usarei 0 para o admin configurar depois)
- Atualizar a função `user_can_view_fluig_empreendimento` para incluir `mega_canoas`

**Código (múltiplos arquivos):**

| Arquivo | Mudança |
|---------|---------|
| `src/types/index.ts` (linha 4) | Adicionar `'mega_canoas'` ao type `Empreendimento` |
| `src/types/index.ts` (linhas 169-174) | Adicionar `mega_canoas: 'Mega Canoas'` no `EMPREENDIMENTO_LABELS` |
| `src/pages/Admin.tsx` (linha 19) | Adicionar `'mega_canoas'` ao array `EMPREENDIMENTOS` |
| `src/components/RateioPreview.tsx` (linha 24) | Adicionar `'mega_canoas'` ao `EMPREENDIMENTOS_RATEIO` |
| `src/components/RateioConfigTab.tsx` | Nenhuma mudança — já lê do banco |

---

### 4. Rateio seletivo — solicitante escolhe quais empreendimentos incluir

Atualmente o `RateioPreview` inclui automaticamente todos os empreendimentos do array `EMPREENDIMENTOS_RATEIO`. A modificação permite ao solicitante marcar/desmarcar quais empreendimentos participam do rateio.

| Arquivo | Mudança |
|---------|---------|
| `src/components/RateioPreview.tsx` | Adicionar checkboxes para cada empreendimento. Buscar todos do `rateio_configuracao`, mas só calcular rateio para os selecionados. Estado inicial: todos selecionados |
| `src/components/nova-solicitacao/types.ts` | Adicionar `rateioEmpreendimentosSelecionados: string[]` ao FormState e setter correspondente |
| `src/hooks/useNovaSolicitacaoForm.ts` | Adicionar estado e setter para `rateioEmpreendimentosSelecionados` |

O componente `RateioPreview` receberá props `selectedEmpreendimentos` e `onSelectedEmpreendimentosChange` para controlar quais entram no cálculo.

---

### 5. Cancelamento sempre via solicitação ao backoffice

Atualmente, solicitações pré-OC podem ser canceladas diretamente pelo solicitante. A mudança faz com que **todo** cancelamento passe pelo fluxo de aprovação do backoffice.

| Arquivo | Mudança |
|---------|---------|
| `src/pages/MinhasSolicitacoes.tsx` (linhas 422-454) | `handleCancelar` sempre usa o fluxo de `cancelamento_pendente` (flag + insert em oc_acompanhamento + historico), nunca cancela direto |
| `src/components/solicitante/SolicitanteModals.tsx` (CancelModal) | Sempre mostrar o aviso de "cancelamento será enviado para aprovação" e tornar motivo **obrigatório** para todos os casos |

---

### Resumo das migrações SQL necessárias

1. `ALTER TYPE empreendimento ADD VALUE 'mega_canoas'`
2. `INSERT INTO rateio_configuracao (empreendimento, area_m2) VALUES ('mega_canoas', 0)`
3. Atualizar `user_can_view_fluig_empreendimento` para incluir `mega_canoas`

### Resumo dos inserts de dados

1. `INSERT INTO clientes (nome) VALUES ('Módulo Vago')` → pegar o ID
2. `INSERT INTO clientes_empreendimentos` para mega_curitiba, mega_itajai, mega_esteio, mega_canoas

