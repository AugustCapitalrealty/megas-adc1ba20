

# Duas melhorias: Mensagem obrigatória no reenvio + Fluig de Cadastro separado

## 1. Mensagem obrigatória ao reenviar solicitação corrigida

**Problema:** O solicitante pode reenviar sem explicar o que corrigiu.

**Solução:** Adicionar campo de mensagem obrigatório no modal de edição/reenvio em `MinhasSolicitacoes.tsx`. Salvar como `solicitacao_mensagens` para que o backoffice veja na timeline.

**Alterações em `src/pages/MinhasSolicitacoes.tsx`:**
- Novo state `editMensagemCorrecao`
- No modal de edição, quando `editingSolicitacao.status === 'pendente_correcao'`, exibir um `Textarea` obrigatório com label "O que foi corrigido?" antes do botão Reenviar
- No `handleResubmit`, validar que a mensagem não está vazia e inserir em `solicitacao_mensagens` após o reenvio
- Desabilitar botão "Reenviar" se mensagem vazia

## 2. Fluig de Cadastro separado do Fluig principal

**Problema:** Ao clicar "Solicitar Cadastro", o sistema abre o modal de Fluig e salva no campo `numero_chamado_fluig` — o mesmo usado para o Fluig do processo de aprovação. Isso confunde o solicitante.

**Solução:** Criar campo `numero_fluig_cadastro` na tabela `solicitacoes` para armazenar o Fluig de cadastro separadamente.

### Alterações no banco:
- Migration: `ALTER TABLE solicitacoes ADD COLUMN numero_fluig_cadastro text;`

### Alterações em `src/pages/Backoffice.tsx`:
- No `handleSolicitarCadastro`, ao abrir o modal Fluig automaticamente, usar um modo separado que salva em `numero_fluig_cadastro` ao invés de `numero_chamado_fluig`
- Criar estado `editFluigCadastroOpen` e `editFluigCadastroValue` para o modal de Fluig de cadastro
- No histórico, usar ação `fluig_cadastro_adicionado` ao invés de `numero_fluig_adicionado`
- Exibir o badge do Fluig de cadastro separado do badge do Fluig principal (apenas para backoffice)

### Alterações em `src/components/SolicitacaoTimeline.tsx`:
- Para solicitantes: exibir "Cadastro solicitado à Contabilidade" sem mostrar o número Fluig
- Para backoffice: exibir "Cadastro solicitado (Fluig #XXX)" com o número
- Adicionar mapeamento para `fluig_cadastro_adicionado` no `getActionDetails`

### Alterações em `src/components/FluigStatusCard.tsx` e timeline:
- Eventos de `fluig_cadastro_adicionado` ficam ocultos para solicitantes (filtrar por role no componente)

**Estimativa:** 3 arquivos + 1 migration.

