

# Plano: Painel OC x NF Interativo (Fase 2)

## Requisitos identificados

1. **Clicar na linha abre detalhes completos da solicitacao** -- tanto backoffice quanto solicitante
2. **Solicitante deve poder acessar o painel** (atualmente requer backoffice -- precisa abrir rota)
3. **Justificativa obrigatoria apos dia 23 sem NF** -- modal com motivo, previsao execucao, previsao NF
4. **Excecoes**: contas de agua/energia (`natureza_orcamentaria` = `agua` ou `energia_eletrica`) nao devem aparecer no painel

---

## Alteracoes

### 1. Abrir rota para todos os usuarios autenticados

**`src/App.tsx`**: Remover `requireBackoffice` da rota `/monitoramento-oc`.

### 2. Filtrar utilidades (agua/energia) do painel

**`src/pages/MonitoramentoOC.tsx`**: Na query de `solicitacoes`, adicionar campo `natureza_orcamentaria` ao select. No enriquecimento, excluir solicitacoes onde `natureza_orcamentaria` seja `agua` ou `energia_eletrica`.

### 3. Modal de detalhes ao clicar na linha

Ao clicar em qualquer linha da tabela, abrir um `Dialog` largo (`max-w-3xl`) que usa o hook `useSolicitacaoDetalhes` para carregar dados completos via RPC `get_solicitacao_detalhes`. O modal exibe:
- Dados da solicitacao (protocolo, valor, empreendimento, fornecedor, status)
- Documentos emitidos (OC/AC)
- Documentos fiscais (NF/Boleto)
- Timeline de historico da solicitacao (reusar `SolicitacaoTimeline`)
- Historico de acompanhamento OC (`oc_acompanhamento`)

### 4. Modal de justificativa obrigatoria (dia 23+)

Para OCs com status `pendente_justificativa`, exibir botao "Justificar" na tabela (alem do "Historico"). Ao clicar, abre modal com:
- Textarea: motivo do adiamento (obrigatorio)
- DatePicker: previsao de execucao do servico
- DatePicker: previsao de emissao da NF (obrigatorio)
- Salva em `oc_acompanhamento` com `tipo_acao = 'justificativa_adiamento'`

Apos salvar, atualiza o estado local da linha para refletir o novo status `adiado_proximo_mes`.

### 5. Adicionar campo `natureza_orcamentaria` ao OCMonitorRow

Necessario para o filtro de utilidades. Adicionar ao select da query e ao interface.

---

## Resumo tecnico

| Arquivo | Alteracao |
|---------|-----------|
| `src/App.tsx` | Remover `requireBackoffice` da rota monitoramento-oc |
| `src/pages/MonitoramentoOC.tsx` | Adicionar: filtro agua/energia, modal detalhes com `useSolicitacaoDetalhes`, modal justificativa com datepickers, clique na linha |
| `src/components/layout/AppLayout.tsx` | Mover link do menu para secao acessivel a todos |

Nenhuma migracao SQL necessaria -- a tabela `oc_acompanhamento` ja existe com as colunas corretas e RLS permite insert pelo proprio usuario.

