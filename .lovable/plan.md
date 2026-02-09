

# Redesign UX/UI: Busca e Organizacao de Solicitacoes

## Diagnostico Atual

Apos analisar detalhadamente as telas de **MinhasSolicitacoes** (2080 linhas), **Backoffice** (2526 linhas), **Dashboard** (90 linhas) e a **Navegacao**, identifiquei os seguintes problemas de experiencia:

---

## Problemas Encontrados

### 1. Dashboard vazio e sem valor
O Dashboard atual e apenas 4 cards estaticos que funcionam como "atalhos". O usuario entra no app e nao tem nenhuma informacao util imediata - precisa clicar para descobrir se tem algo pendente.

### 2. Navegacao sobrecarregada
O header horizontal acumula 7 itens (Nova Solicitacao, Minhas Solicitacoes, Backoffice, Painel Fluig, Garantias, Usuarios, Dashboard SLA). No desktop ja fica apertado; no mobile, tudo vai para o hamburger.

### 3. Busca inconsistente entre telas
- **MinhasSolicitacoes**: busca local com debounce 300ms, campo dentro do FilterBar
- **Backoffice**: busca via RPC (server-side) com debounce 500ms, campo dentro de um Card separado
- Duas implementacoes diferentes para a mesma funcionalidade

### 4. Filtros duplicados e confusos
- Ambas as telas usam FilterBar com "tab groups" (Em Andamento / Acoes Pendentes / Finalizadas), mas com tabs diferentes
- Backoffice tem filtro de Empreendimento SEPARADO do FilterBar (dentro de um Card proprio)
- Botao "Minhas (X)" no Backoffice fica escondido no fim da barra de filtros

### 5. Hierarquia de informacao invertida
- Na tela MinhasSolicitacoes, o PendingActionsCard e bom mas aparece ABAIXO do seletor de modo ("Minhas" vs "Empreendimento"), e os filtros ficam abaixo dele
- O usuario precisa rolar para encontrar a informacao mais importante: "o que preciso fazer agora?"

### 6. Cards de solicitacao muito densos
- Os cards mostram muita informacao de uma vez (protocolo, status, badges, tipo, empreendimento, fornecedor, valor, data, descricao)
- No mobile, a informacao fica espremida e dificil de escanear

### 7. Acoes de botoes inconsistentes
- No Backoffice, cada card tem 3-6 botoes de acao diferentes dependendo do status
- Os botoes ficam em uma unica linha `flex-wrap`, sem hierarquia visual clara
- "Ver Detalhes" compete visualmente com "Assumir" e "Rejeitar"

---

## Solucao Proposta

### A. Dashboard Enriquecido (Home Inteligente)

Transformar o Dashboard em um painel operacional com metricas reais:

```text
+----------------------------------------------------------+
|  Bom dia, Joao!                                          |
|                                                          |
|  +-----------+ +-----------+ +-----------+ +-----------+ |
|  | Total     | | Pendentes | | Com Back  | | Concluidas| |
|  |    42     | |    3 (!!) | |    15     | |    22     | |
|  +-----------+ +-----------+ +-----------+ +-----------+ |
|                                                          |
|  [!! ACOES PENDENTES - Card destacado com contadores !!] |
|  | 2 Correcoes | 1 Liberar OC |                         |
|                                                          |
|  ULTIMAS SOLICITACOES                                    |
|  +----------------------------------------------------+ |
|  | #2026000042 | Servico Manutencao | R$5.200 | 2h atras| |
|  | #2026000041 | Material Eletrico | R$1.800 | 1d atras | |
|  +----------------------------------------------------+ |
|                                                          |
|  [+ Nova Solicitacao]    [Ver Todas ->]                  |
+----------------------------------------------------------+
```

**Impacto**: O usuario abre o app e ja sabe o que precisa fazer, sem navegar.

### B. Navegacao Simplificada

Reorganizar a navegacao em grupos logicos:

```text
ANTES (7 itens soltos):
[Nova] [Minhas] [Backoffice] [Fluig] [Garantias] [Usuarios] [SLA]

DEPOIS (agrupado por contexto):
[+ Nova] [Solicitacoes] [Backoffice] [Painel Fluig] [Garantias] [Admin v]
                                                                    |
                                                              [Usuarios]
                                                              [Dashboard SLA]
```

- Separar botao "Nova Solicitacao" visualmente (cor diferente, destaque)
- Agrupar itens admin (Usuarios + SLA) em um dropdown "Admin"
- No mobile: botao "+" flutuante para nova solicitacao + menu simplificado

### C. Busca e Filtros Unificados

Criar um padrao unico de busca/filtro para ambas as telas:

```text
+----------------------------------------------------------+
|  [Busca por protocolo, descricao, fornecedor...]         |
|  [Empreendimento v] [Tipo v] [Minhas apenas: toggle]    |
|                                                          |
|  TABS DE STATUS (simplificados):                         |
|  [Todas (42)] [Pendentes (3)] [Em Andamento (15)]       |
|  [Emitidas (5)] [Finalizadas (22)]                      |
+----------------------------------------------------------+
```

Mudancas-chave:
- **Busca sempre visivel no topo** (nao escondida dentro de cards)
- **Filtro de empreendimento JUNTO com a busca** (nao separado)
- **Tabs de status em uma unica linha**, sem grupos com labels
- **Mesmo padrao visual** para MinhasSolicitacoes e Backoffice
- **Contadores nos tabs** para orientacao rapida

### D. Cards de Solicitacao Redesenhados

Simplificar a hierarquia visual dos cards:

```text
+----------------------------------------------------------+
| [!! ACAO NECESSARIA - Corrigir Agora !!]    <-- banner   |
|                                                          |
| #2026000042  [Recebido]  [AC]  [Emergencial]            |
|                                                          |
| Servico de Manutencao Preventiva em Equipamentos de...  |
| Mega Curitiba  |  ABC Fornecedores Ltda  |  R$ 5.200    |
|                                                          |
| [Ver Detalhes]  [Assumir]  [Rejeitar]        [v Expand] |
+----------------------------------------------------------+
```

Mudancas:
- **Descricao resumida como conteudo principal** (nao numa grid key-value)
- **Dados complementares em linha unica** (empreendimento | fornecedor | valor)
- **Acoes com hierarquia**: acao primaria (botao cheio), secundaria (outline), destrutiva (texto vermelho)
- **Expand colapsado por padrao** - historico e anexos so quando pedido

### E. Acoes do Backoffice com Hierarquia Clara

Reorganizar os botoes de acao por importancia:

```text
ANTES (tudo junto em flex-wrap):
[Ver Detalhes] [Assumir] [Sol. Ajuste] [Rejeitar] [Fluig] [Projuris] [Cadastro]

DEPOIS (hierarquia visual):
ACAO PRIMARIA:    [Assumir]  ou  [Registrar OC]  ou  [Concluir]
ACOES SECUNDARIAS: [Ver Detalhes] [Solicitar Ajuste]
DESTRUTIVA:       [Rejeitar] (texto, sem destaque)
UTILITARIOS:      [Fluig: #123 (editar)] [Projuris: #45 (editar)]  (badges clicaveis, nao botoes)
```

### F. Experiencia Mobile Aprimorada

- Botao flutuante "+" no canto inferior direito para nova solicitacao
- Cards com layout vertical otimizado (stack em vez de grid)
- Filtros colapsaveis (dropdown) em vez de tabs horizontais
- Swipe em cards para acoes rapidas (futuro)

---

## Detalhes Tecnicos da Implementacao

### Fase 1: Dashboard Enriquecido

**Arquivo: `src/pages/Dashboard.tsx`**
- Criar hook `useDashboardMetrics` que busca contadores via RPC existente (`get_solicitacoes_count_by_status`)
- KPI cards com contadores reais
- PendingActionsCard reutilizado do componente existente
- Lista "Ultimas 5 solicitacoes" com SolicitacaoCard variant="compact"
- Botoes "Nova Solicitacao" e "Ver Todas" como CTAs

### Fase 2: Navegacao Simplificada

**Arquivo: `src/components/layout/AppLayout.tsx`**
- Botao "Nova Solicitacao" estilizado como CTA (bg-primary)
- Itens admin agrupados em DropdownMenu
- Mobile: FAB (Floating Action Button) para nova solicitacao
- Reduzir itens visiveis de 7 para 5 no header

### Fase 3: FilterBar Unificado

**Arquivo: `src/components/ui/FilterBar.tsx`**
- Simplificar: remover conceito de "tabGroups" com labels
- Tabs ficam em unica linha horizontal com scroll
- Busca e filtro de empreendimento na mesma linha
- Toggle "Apenas minhas" integrado

**Arquivos: `src/pages/MinhasSolicitacoes.tsx` e `src/pages/Backoffice.tsx`**
- Ambos usam o mesmo padrao de FilterBar
- Remover o Card separado de filtros do Backoffice
- Integrar filtro de empreendimento no FilterBar

### Fase 4: Cards Simplificados

**Arquivo: `src/components/ui/SolicitacaoCard.tsx`**
- Novo layout: descricao como conteudo principal
- Metadata em linha unica compacta
- Remover grid key-value do variant "detailed"

**Arquivo: `src/pages/Backoffice.tsx` (SolicitacaoCard local)**
- Reorganizar botoes de acao com hierarquia visual
- Acao primaria em destaque, secundarias em outline, destrutivas em texto

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/pages/Dashboard.tsx` | Reescrever com metricas reais e acoes pendentes |
| `src/components/layout/AppLayout.tsx` | Reorganizar navegacao, agrupar admin, CTA nova solicitacao |
| `src/components/ui/FilterBar.tsx` | Simplificar tabs, integrar empreendimento |
| `src/pages/MinhasSolicitacoes.tsx` | Usar FilterBar unificado, layout simplificado |
| `src/pages/Backoffice.tsx` | Remover Card de filtros separado, hierarquia de botoes |
| `src/components/ui/SolicitacaoCard.tsx` | Novo layout com descricao como foco |
| `src/hooks/useDashboardMetrics.ts` | **Criar** - Hook para metricas do dashboard |

---

## Ordem de Implementacao Recomendada

Como sao muitas mudancas, recomendo implementar em etapas para validar cada uma:

1. **Dashboard Enriquecido** - Impacto visual alto, risco baixo (pagina isolada)
2. **Navegacao Simplificada** - Melhora orientacao global
3. **FilterBar Unificado** - Padroniza busca entre telas
4. **Cards Simplificados** - Melhora escaneabilidade
5. **Hierarquia de Acoes do Backoffice** - Reduz confusao operacional

Cada etapa pode ser validada independentemente antes de avancar.

