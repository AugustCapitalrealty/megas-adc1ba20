

# Auditoria Completa: Funcionalidades e Melhorias UI/UX

## Problemas Identificados e Diagnosticos

---

### 1. Dashboard Nao Condiz com a Realidade

**Diagnostico:** O Dashboard (`useDashboardMetrics.ts`) filtra apenas por `user_id = user.id` (linha 46). Se o usuario logado nao e o "Jose Ernesto" que tem 13 solicitacoes aguardando aceite, o dashboard mostra os numeros DAQUELE usuario especifico, nao do sistema todo.

**Problema real:** O Dashboard mostra dados corretos para o usuario logado, mas pode parecer "errado" porque:
- KPI "Pendentes" inclui `oc_ac_emitida` (linha 69) que nao existe mais como status real no sistema (so `aguardando_aceite` e usado). Isso infla o contador.
- KPI "Em Andamento" inclui `aguardando_informacoes` que na verdade e uma acao pendente do solicitante, nao algo "em andamento" com backoffice.

**Correcao:**
- Remover `oc_ac_emitida` da contagem de `pendingAcceptance` (status fantasma)
- Mover `aguardando_informacoes` para "Pendentes" (pois exige acao do usuario)
- Adicionar link nos KPI cards para navegar diretamente ao filtro correspondente em MinhasSolicitacoes

---

### 2. Solicitacao 2026000121 - Botao "Liberar para Fornecedor"

**Diagnostico:** A solicitacao existe com status `aguardando_aceite`, tem documento emitido (OC #063204), e pertence ao usuario "Jose Ernesto" (user_id: e03b0bd3...).

O codigo esta correto:
- O banner verde "OC DISPONIVEL" aparece quando `status === 'aguardando_aceite'` E `canTakeAction === true` (linhas 987-1061)
- `canTakeAction = isOwner = sol.user_id === effectiveUserId` (linha 1395)

**Causa provavel:**
1. O usuario pode estar no modo **"Empreendimento"** em vez de **"Minhas"** - nesse caso, se esta vendo solicitacoes de outros, `isOwner` e falso e o banner nao aparece
2. O usuario pode ter feito login com outra conta que nao e a dona da solicitacao

**Correcao proposta:** Mesmo no modo "Empreendimento", se o usuario e o dono, o banner deveria aparecer. Verificar e garantir que `canTakeAction` considera o dono mesmo no modo empreendimento (ja faz isso - linha 1395 usa `isOwner` independente do viewMode). A unica situacao que nao mostra e se o usuario logado nao e o user_id `e03b0bd3`. 

**Melhoria:** Adicionar um indicador visual mais claro no card quando a solicitacao tem acao pendente, mesmo no modo empreendimento. Adicionar texto explicativo: "Apenas o solicitante pode liberar a OC".

---

### 3. Dashboard: Melhorias Visuais Especificas

**Problemas encontrados:**
- Os cards de KPI nao sao clicaveis (nao levam a nenhum filtro)
- A lista "Ultimas Solicitacoes" leva sempre para `/minhas-solicitacoes` generica (linha 139), nao para a solicitacao especifica
- Nao ha informacao de backoffice no Dashboard (para usuarios com acesso backoffice)

**Correcoes:**
- Tornar KPI cards clicaveis com navegacao para o filtro correspondente
- Ao clicar numa solicitacao recente, navegar com filtro ou scroll ate ela
- Para usuarios backoffice/admin: mostrar secao adicional com metricas do backoffice (recebidas nao assumidas, em processamento, etc.)

---

### 4. MinhasSolicitacoes: Melhorias de Organizacao

**Problemas encontrados:**
- N+1 queries: Para cada solicitacao, busca `documentos_emitidos` e `documentos_fiscais` individualmente (linhas 198-225). Com 50+ solicitacoes, isso causa lentidao perceptivel.
- FilterBar com 3 grupos e labels e complexa demais para usuarios comuns
- O botao "Ver Anexos" ja foi adicionado, mas pode ser melhorado visualmente
- Falta um estado de carregamento melhor (skeleton em vez de spinner centralizado)

**Correcoes:**
- Otimizar queries: buscar documentos em batch com `.in('solicitacao_id', ids)` em vez de N queries individuais
- Simplificar FilterBar: considerar tabs em linha unica com contadores
- Adicionar skeleton loading para cards

---

### 5. Backoffice: Melhorias Visuais e Organizacao

**Estado atual apos ultimas mudancas:**
- Botoes primarios (Assumir, Informar Lancamento, Registrar OC, Concluir) ja foram movidos para o CardHeader (linhas 1161-1192) -- OK
- Hierarquia de botoes secundarios e destrutivos ja aplicada -- OK

**Problemas remanescentes:**
- O card do Backoffice (linhas 1146-1400+) e muito denso: tem CardHeader com badges, CardContent com 4-5 linhas de metadata, SLA info, flag emergencial, 5+ botoes, descricao expandivel, e historico expandivel
- Os botoes de acao secundaria (Ver Detalhes, Solicitar Ajuste, Rejeitar) ficam em `flex-wrap` sem separacao visual clara (linha 1250)
- Quando ha muitos botoes (status `aprovado` ou `em_processamento`), eles empilham de forma desorganizada no mobile
- Nao ha indicador visual rapido de "quanto tempo faz que esta parado" alem do texto SLA
- O campo de busca nao tem placeholder claro sobre o que busca

**Correcoes propostas:**
- Separar botoes de acao em duas linhas: primarios acima, secundarios/destrutivos abaixo
- Adicionar `Separator` visual entre secoes do card
- Melhorar indicadores de SLA com cores (verde/amarelo/vermelho) em vez de apenas texto
- Adicionar tooltip nos botoes para clarificar a acao
- No mobile, usar layout vertical para botoes em vez de flex-wrap

---

### 6. Melhoria Visual: Backoffice Cards Redesenhados

**Layout proposto para cada card do Backoffice:**

```text
+----------------------------------------------------------+
| [OC] #2026000121 [Aguardando Aceite] [Jose]  [Assumir]  |
|                                                          |
| Servico de Manutencao Preventiva em Equipamentos de...  |
|                                                          |
| Solicitante: Jose Ernesto                                |
| Mega Esteio | R$ 118,68 | 09/02/2026                   |
| -- 2d desde abertura -- (SLA: OK)                        |
|                                                          |
| [Ver Detalhes] [Sol. Ajuste]              [Rejeitar]    |
+----------------------------------------------------------+
```

Mudancas:
- Descricao como conteudo principal (ja implementado no SolicitacaoCard, mas Backoffice usa card proprio)
- Metadata compacta em 1-2 linhas
- Botao primario isolado no header (ja feito)
- Botoes secundarios com espacamento claro
- SLA com badge colorido em vez de texto

---

### 7. Melhoria: Indicador de Progresso no Workflow

Para o solicitante, adicionar uma barra de progresso simples no card mostrando em qual etapa o processo esta:

```text
Recebido > Em Analise > Aprovado > OC Emitida > Liberado > Concluido
   [x]        [x]         [x]        [->]
```

Isso daria contexto imediato sem precisar entender os nomes dos status.

---

## Resumo de Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useDashboardMetrics.ts` | Fix status fantasma `oc_ac_emitida`, reclassificar `aguardando_informacoes` |
| `src/pages/Dashboard.tsx` | KPIs clicaveis, secao backoffice para admins, link especifico nas solicitacoes recentes |
| `src/pages/MinhasSolicitacoes.tsx` | Otimizar N+1 queries, indicador visual para dono no modo empreendimento |
| `src/pages/Backoffice.tsx` | Separar botoes em linhas, SLA com cores, melhorar layout mobile |
| `src/components/ui/SolicitacaoCard.tsx` | Considerar adicionar mini barra de progresso do workflow |

## Ordem de Execucao

1. Fix Dashboard metricas incorretas (`oc_ac_emitida` fantasma, reclassificacao)
2. Dashboard KPIs clicaveis + secao backoffice
3. Otimizacao N+1 queries em MinhasSolicitacoes
4. Backoffice: separacao visual de botoes + SLA colorido
5. Barra de progresso do workflow nos cards

