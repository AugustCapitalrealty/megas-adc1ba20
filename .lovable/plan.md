

# Plano: Acompanhamento Jurídico (Conciliação Backoffice ↔ Solicitante)

## Resumo

Criar um sistema de acompanhamento jurídico que permite ao **backoffice** registrar etapas do fluxo de contratos/termos diretamente na solicitação. O andamento fica visível para **solicitantes** (que tenham acesso ao empreendimento) tanto no card da solicitação quanto no modal de detalhes.

## Etapas do Fluxo Jurídico

| Etapa | Label |
|-------|-------|
| `minuta_elaboracao` | Minuta em Elaboração |
| `minuta_revisao` | Minuta em Revisão |
| `enviado_assinatura` | Enviado para Assinatura |
| `assinado_fornecedor` | Assinado pelo Fornecedor |
| `assinado_contratante` | Assinado pela Contratante |
| `contrato_vigente` | Contrato Vigente |
| `aditivo_necessario` | Aditivo Necessário |
| `encerrado` | Encerrado |

## Alterações

### 1. Banco de Dados (migração)

Nova tabela `acompanhamento_juridico`:
- `id` uuid PK
- `solicitacao_id` uuid FK → solicitacoes
- `etapa` text (valor do enum acima)
- `observacao` text nullable
- `user_id` uuid (quem registrou)
- `created_at` timestamptz

RLS:
- Backoffice/admin: INSERT + SELECT tudo
- Solicitantes: SELECT via `user_can_access_solicitacao(solicitacao_id)`

### 2. Componente `JuridicoTracker` (novo)

Stepper visual horizontal com as etapas. Mostra etapas concluídas (verde), atual (azul), futuras (cinza). Cada etapa concluída exibe quem registrou, quando, e observação.

Dois modos:
- **Interativo** (backoffice): botão "Registrar Etapa" abre modal com select da próxima etapa + campo observação
- **Read-only** (solicitante): apenas visualização do progresso

### 3. Integração no Backoffice (`src/pages/Backoffice.tsx`)

- No modal de detalhes: exibir `JuridicoTracker` quando `instrumento_juridico` não é `'oc'` (logo abaixo do badge de Instrumento Jurídico)
- Ao registrar etapa: inserir registro em `acompanhamento_juridico` + inserir em `historico_solicitacoes` com ação `etapa_juridica` para aparecer na timeline

### 4. Integração na visão do Solicitante (`src/pages/MinhasSolicitacoes.tsx`)

- No conteúdo expandido da solicitação, quando `instrumento_juridico` não é `'oc'`, exibir `JuridicoTracker` em modo read-only
- Solicitante pode acompanhar em que ponto está o contrato

### 5. Tipos (`src/types/index.ts`)

Adicionar tipo `EtapaJuridica` e labels correspondentes.

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Tabela `acompanhamento_juridico` + RLS |
| `src/types/index.ts` | Tipo `EtapaJuridica` + labels |
| `src/components/JuridicoTracker.tsx` | Novo componente stepper + modal de registro |
| `src/pages/Backoffice.tsx` | Integrar tracker no modal de detalhes |
| `src/pages/MinhasSolicitacoes.tsx` | Exibir tracker read-only no detalhe expandido |

