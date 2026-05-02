## Objetivo

Permitir que **admin e backoffice** definam um **valor mensal** para solicitações com `contrato_mensal = true`. No calendário, contratos mensais passam a mostrar o **valor da parcela mensal** (não o valor total do contrato repetido em cada mês). Preparar o terreno para um futuro módulo "Contratos".

## Mudanças

### 1. Banco — nova coluna `valor_mensal`

Migração em `solicitacoes`:
- Adicionar `valor_mensal numeric NULL` (nullable; quando nulo, calendário cai no comportamento atual).
- Sem alteração de RLS — o policy "Backoffice can update all solicitacoes" já cobre updates por admin/backoffice.
- Sem default; sem trigger. É campo manual e opcional.

### 2. Calendário — usar `valor_mensal` quando contrato mensal

`src/hooks/useCalendarioServicos.ts`:
- Adicionar `valor_mensal: number | null` ao tipo `ServicoCalendario` e selecionar no `SELECT`.
- Na expansão de contratos mensais (linha 239+), atribuir ao chip `valor = valor_mensal ?? (valor / nMeses)` como fallback inteligente, em vez do `valor` total cru.
- Demais casos: mantém `valor` total atual.

### 3. Edição inline para admin/backoffice

Adicionar um pequeno editor de "Valor mensal" acessível a partir do **modal de detalhes** (`OCDetalhesModal`):
- Visível apenas se `isBackofficeOrAdmin && contrato_mensal === true`.
- No card de cabeçalho (já tem valor total), exibir uma linha extra "Valor mensal: R$ X,XX [✏️ editar]".
- Clicar abre um pequeno input + botão Salvar; faz `update` direto na coluna `valor_mensal`.
- Após salvar: toast de sucesso e refetch dos detalhes; o calendário recarrega ao reabrir/refresh (já tem botão refresh — ok por agora).
- Mostrar também a sugestão automática "(sugerido: R$ Y baseado em N meses)" igual ao helper do form.

### 4. Exibição no Sheet do Dia

`DiaServicosSheet`: quando `s.contrato_mensal`, mostrar o `valor` (que já será o mensal vindo do hook) e abaixo, em texto pequeno, "Total contrato: R$ X" usando uma propriedade extra. Para isso, vou propagar `valor_total` no tipo (= valor original do banco), e o `valor` do chip vira o efetivo (mensal ou total).

## Detalhes técnicos

- Migração via tool `supabase` (schema change).
- Campo nullable, sem CHECK constraint de tempo.
- Frontend: tipo `ServicoCalendario` ganha `valor_mensal: number | null` e `valor_total: number`. `valor` continua sendo o "valor a exibir no chip/dia".
- `OCDetalhesModal`: novo bloco de edição (componente local pequeno). Update simples: `supabase.from('solicitacoes').update({ valor_mensal: x }).eq('id', id)`.
- Sem mudança no fluxo de criação (form continua salvando só o total). Edição é apenas para backoffice/admin no modal.

## Preparação para módulo "Contratos"

A coluna `valor_mensal` já fica reusável no futuro módulo. Não criamos tabela nova agora — quando o módulo for desenvolvido, podemos extrair `solicitacoes` com `contrato_mensal = true` para uma view/tabela `contratos`.

## Fora de escopo

- Criar tabela `contratos` agora.
- Histórico de alterações do `valor_mensal` (pode entrar em `historico_solicitacoes` no futuro se necessário).
- Edição em massa.