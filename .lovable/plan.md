

# Plano Completo: Tela de Garantias Vigentes + Auditoria UX/UI

---

## PARTE 1: Nova Tela "Garantias Vigentes"

### Respostas as Perguntas de Implementacao

**1. "O backend ja tem um evento pronto quando o status muda para 'Finalizado'?"**

Sim. O sistema ja possui um trigger automatico (`trigger_track_data_conclusao`) que popula o campo `data_conclusao` quando o status muda para `concluida`. Isso significa que o "gatilho" da garantia ja existe e funciona. Nao precisamos criar nada novo no backend para iniciar a garantia.

Dados atuais: 36 solicitacoes concluidas, 9 com garantia configurada (servico, produto ou ambos), todas com `data_conclusao` preenchida automaticamente.

**2. "Se um processo for reaberto por engano, a garantia pausa ou cancela?"**

Recomendacao: A garantia deve ser **pausada** (ou seja, o `data_conclusao` e limpo quando o status sai de `concluida`). Se o processo voltar a ser concluido, o trigger regrava o `data_conclusao` com a nova data, reiniciando a contagem. Isso e o mais seguro porque:
- Evita garantias "fantasma" de processos nao realmente finalizados
- O trigger existente ja resolve automaticamente quando re-concluir

**3. "Temos como tratar processos passados (retroatividade)?"**

Sim. O `data_conclusao` ja foi retroativamente preenchido para as 36 solicitacoes concluidas. Das 9 que tem garantia, todas ja possuem `data_conclusao`. A feature funcionara imediatamente para dados existentes, sem necessidade de migracao retroativa.

---

### Implementacao Tecnica

#### 1. Nova Rota e Pagina

**Novo arquivo: `src/pages/GarantiasVigentes.tsx`**

Uma tela dedicada acessivel via menu de navegacao, com:

- **Cards resumo** no topo: Total de garantias vigentes | Expirando em 30 dias | Expiradas
- **Filtros**: Por empreendimento, tipo de garantia (servico/produto/ambos), status (vigente/expirando/expirada)
- **Lista de garantias** como cards ou tabela, mostrando:
  - Protocolo da solicitacao
  - Fornecedor
  - Tipo de garantia
  - Data de inicio (= data_conclusao)
  - Data de expiracao (calculada: data_conclusao + dias_garantia)
  - Dias restantes (com badge colorido)
  - Empreendimento
  - Descricao resumida do servico/produto

#### 2. Atualizacao da Navegacao

**Arquivo: `src/components/layout/AppLayout.tsx`**

Adicionar item de menu:
- Icone: `Shield` do lucide
- Label: "Garantias"
- Rota: `/garantias`
- Visivel para: todos os usuarios

**Arquivo: `src/App.tsx`**

Adicionar rota protegida para `/garantias`.

#### 3. Componente de Resumo (KPI Cards)

Tres cards no topo:
- **Vigentes** (verde): garantias com dias restantes > 30
- **Expirando** (amarelo): garantias com 1-30 dias restantes
- **Expiradas** (vermelho): garantias com dias restantes <= 0

#### 4. Consulta de Dados

A query sera direta na tabela `solicitacoes` filtrando:
```
status = 'concluida'
AND tipo_garantia IS NOT NULL
AND tipo_garantia != 'nenhuma'
AND data_conclusao IS NOT NULL
```

O calculo de expiracao sera feito no frontend usando `date-fns` (ja instalado), reutilizando a logica do componente `GarantiaExpiracaoInfo.tsx` que ja existe.

#### 5. Filtro por Empreendimento do Usuario

Reutilizar o hook `useUserEmpreendimentos` para filtrar garantias conforme os empreendimentos permitidos ao usuario logado.

---

### Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/pages/GarantiasVigentes.tsx` | **Criar** - Nova pagina completa |
| `src/App.tsx` | Adicionar rota `/garantias` |
| `src/components/layout/AppLayout.tsx` | Adicionar item de navegacao |

---

## PARTE 2: Auditoria UX/UI

### Friccao e UX

**1. Fluxos com mais passos do que o necessario:**

- **NovaSolicitacao.tsx (2001 linhas)**: O formulario wizard de 8 steps e completo, mas o step "Tipo" so aparece quando valor > R$1.000. Para valores <= R$1.000, o sistema classifica automaticamente como OC, o que e bom. No entanto, o step "Natureza do Servico" agora aparece para todo AC, mesmo quando o usuario so quer confirmar "nenhuma opcao" - isso adiciona 1 click extra, mas e necessario para capturar riscos. **Sugestao**: manter como esta, pois a informacao e critica.

- **Aceite de OC (3 steps)**: O fluxo de "Visualizar OC -> Decidir -> Confirmar" esta correto e foi atualizado conforme solicitado. Nenhuma friccao desnecessaria.

**2. Loading e estados de erro:**

- **Pontos positivos**: Loading spinners estao presentes em todas as acoes criticas (submit, aceite, cancelamento). Toasts de erro informam o usuario com mensagens claras.
- **Ponto de melhoria**: Na pagina `MinhasSolicitacoes`, o `fetchSolicitacoes` faz N+1 queries para buscar `documentos_emitidos` e `documentos_fiscais` para cada solicitacao. Isso pode causar delays perceptiveis com muitas solicitacoes. **Sugestao**: migrar para uma RPC como foi feito no Backoffice.

**3. Draft/rascunho automatico**: O formulario de nova solicitacao salva rascunho automaticamente no localStorage - excelente para UX.

---

### Consistencia Visual (UI)

**1. Padrao de componentes:**

O projeto segue um padrao razoavelmente consistente:
- Usa shadcn/ui como base (Button, Card, Dialog, etc.)
- Tem Design System customizado: `SolicitacaoCard`, `FilterBar`, `ActionModal`, `StatusBadge`
- `PendingActionsCard` segue o padrao visual consistente

**2. Inconsistencias encontradas:**

- **Dashboard (`Dashboard.tsx`, 90 linhas)**: Muito simples comparado ao resto do app. So mostra 4 cards estaticos sem dados em tempo real. E o unico componente que nao exibe metricas ou informacoes uteis ao usuario.
- **Backoffice (`Backoffice.tsx`, 2526 linhas)** e **MinhasSolicitacoes (`MinhasSolicitacoes.tsx`, 2080 linhas)**: Arquivos muito grandes. Dificultam manutencao e aumentam risco de bugs.
- **Cores de status**: Bem padronizadas via `StatusBadge` e CSS customizado. Consistente.

**3. Quick Win Visual:**

- **Dashboard enriquecido**: Transformar o Dashboard de 4 cards estaticos para uma pagina com metricas reais (total de solicitacoes, status atual, acoes pendentes, garantias expirando). Isso daria "outra cara" ao app sem mexer na logica existente.

---

### Performance e Produto

**1. Codigo potencialmente subutilizado:**

- **`PainelFluig.tsx`**: Painel de importacao/visualizacao Fluig. Depende de upload manual de arquivo CSV. Verificar se realmente esta sendo utilizado ou se os dados ja vem via API.
- **`FluigImport.tsx` e `FluigDashboard.tsx`**: Componentes do painel Fluig. Caso o painel nao esteja em uso ativo, sao candidatos a remocao.
- **Status legados**: `aguardando_nf_boleto`, `nf_boleto_enviados`, `enviado_pagamento` estao marcados como "(legado)" nos labels. Se nao ha mais solicitacoes nesses status, podem ser simplificados.

**2. Se pudessemos refazer uma parte para melhorar performance/usabilidade:**

- **MinhasSolicitacoes.tsx**: Refatorar para usar RPC como o Backoffice ja faz. Atualmente faz queries N+1 (1 query por solicitacao para buscar documentos emitidos + fiscais). Isso causa lentidao proporcional ao numero de solicitacoes.
- **Backoffice.tsx (2526 linhas)**: Extrair em sub-componentes (DetailsModal, ActionModal, RegistroOCModal, etc.) para facilitar manutencao.

---

## Ordem de Implementacao Recomendada

1. **Tela de Garantias Vigentes** (3 arquivos: nova pagina + rota + navegacao)
2. **Quick Win: Dashboard enriquecido** (1 arquivo, impacto visual alto)
3. **Refatoracao MinhasSolicitacoes** (performance N+1 -> RPC)
4. **Refatoracao Backoffice** (arquitetura, manutencao)

---

## Detalhes Tecnicos da Tela de Garantias

### Query de Dados

```sql
SELECT 
  s.id, s.protocolo, s.descricao, s.empreendimento, s.valor,
  s.tipo_garantia, s.dias_garantia, s.dias_garantia_servico, s.dias_garantia_produto,
  s.data_conclusao,
  f.razao_social, f.nome_fantasia, f.cnpj
FROM solicitacoes s
LEFT JOIN fornecedores f ON s.fornecedor_id = f.id
WHERE s.status = 'concluida'
  AND s.tipo_garantia IS NOT NULL 
  AND s.tipo_garantia != 'nenhuma'
  AND s.data_conclusao IS NOT NULL
ORDER BY s.data_conclusao DESC
```

### Layout da Pagina

```text
+--------------------------------------------------+
|  GARANTIAS VIGENTES                               |
|                                                   |
|  [Vigentes: 5]  [Expirando: 2]  [Expiradas: 1]  |
|                                                   |
|  Filtros: [Empreendimento v] [Tipo v] [Status v] |
|  Busca:   [_________________________]            |
|                                                   |
|  +----------------------------------------------+|
|  | #2026000007 | Servico Manutencao              ||
|  | Fornecedor: ABC Ltda                          ||
|  | Garantia Servico: 90 dias                     ||
|  | Inicio: 27/01/2026 | Fim: 27/04/2026         ||
|  | [=========---] 62 dias restantes (verde)      ||
|  +----------------------------------------------+|
|  | #2026000006 | Servico + Produto               ||
|  | Fornecedor: XYZ S/A                           ||
|  | Servico: 90d (expirando!) | Produto: 365d    ||
|  | [...badge amarelo...] [...badge verde...]     ||
|  +----------------------------------------------+|
+--------------------------------------------------+
```

### Regra de Cores dos Badges

- **Verde** (> 30 dias): `text-green-700 border-green-300`
- **Amarelo** (1-30 dias): `bg-amber-100 text-amber-800`
- **Vermelho** (expirada): `variant="destructive"`

Essas cores ja estao implementadas no componente `GarantiaExpiracaoInfo.tsx` e serao reutilizadas.

