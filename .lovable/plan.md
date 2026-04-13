

## Painel de Contratos (Projuris) — Plano de Implementação

Substituir a `TabProjuris` atual dentro de `MonitoramentoOC` por uma versão completa com 4 sub-abas.

---

### Estrutura de Sub-Abas

A aba "Projuris" no MonitoramentoOC passará a ter 4 sub-abas internas:

1. **Visão por Status** — Pipeline macro com KPIs e tabela filtrável por etapa/empreendimento/responsável
2. **Parados para Assinatura** — Contratos com etapa `enviado_assinatura` há mais de 3 dias, ordenados por tempo parado, destaque vermelho > 7 dias
3. **Fluxo de Aprovações** — Timeline por contrato mostrando tempo em cada etapa e identificação do gargalo (etapa com maior tempo médio)
4. **Compliance** — Solicitações que deveriam ter Projuris (regra: `instrumento_juridico != 'oc'` e `numero_projuris IS NULL`, ativas) com ações inline

---

### Detalhamento Técnico

**Arquivo principal:** `src/components/monitoramento/TabProjuris.tsx` — será reescrito com sub-tabs

**Novos componentes:**
- `src/components/monitoramento/projuris/ProjurisVisaoStatus.tsx` — Painel 1 (evolução do código atual)
- `src/components/monitoramento/projuris/ProjurisParadosAssinatura.tsx` — Painel 2
- `src/components/monitoramento/projuris/ProjurisFluxoAprovacoes.tsx` — Painel 3
- `src/components/monitoramento/projuris/ProjurisCompliance.tsx` — Painel 4

**Dados usados (sem novas tabelas):**
- `solicitacoes` — para identificar contratos sem Projuris (Painel 4) e dados base
- `acompanhamento_juridico` — para etapas, tempos, timeline (Painéis 1-3)
- `fornecedores` — nomes dos fornecedores
- `profiles` — nomes dos responsáveis

**Painel 1 — Visão por Status:**
- KPIs no topo: Total ativos, Em Minuta, Em Assinatura, Vigentes (mantém lógica atual)
- Tabela com filtros por status, empreendimento, etapa jurídica
- Clique abre detalhes (OCDetalhesModal existente)

**Painel 2 — Parados para Assinatura:**
- Filtra `acompanhamento_juridico` com etapa `enviado_assinatura` e calcula dias parados
- Threshold: verde < 3 dias, amarelo 3-7 dias, vermelho > 7 dias
- Ordenação automática por maior tempo parado
- Colunas: Protocolo, Fornecedor, Valor, Data envio assinatura, Dias parado, Empreendimento

**Painel 3 — Fluxo de Aprovações:**
- Para cada contrato ativo, calcula tempo entre etapas consecutivas no `acompanhamento_juridico`
- Exibe timeline visual (reutiliza padrão do JuridicoTracker)
- Seção de KPI no topo: "Etapa com maior tempo médio" calculada agregando todos os contratos
- Clique no contrato expande a timeline detalhada

**Painel 4 — Compliance:**
- Query: `instrumento_juridico IN ('termo_contratacao', 'contrato_prestacao', 'contrato_empreitada') AND numero_projuris IS NULL AND status NOT IN ('concluida', 'cancelado', 'rejeitado')`
- Lista com: Protocolo, Data criação, Solicitante, Tipo instrumento, Empreendimento, Valor
- Ações inline:
  - "Adicionar Projuris" — abre input para digitar número e salva em `solicitacoes.numero_projuris`
  - "Não aplicável" — exige justificativa, registra no `historico_solicitacoes`

**Priorização (Painel 1):**
- Score simples: `(dias_na_etapa * 2) + (valor >= 70000 ? 3 : valor >= 10000 ? 2 : 1)`
- Coluna "Prioridade" com badge (Alta/Média/Baixa) baseada no score
- Ordenação padrão por score decrescente

---

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `src/components/monitoramento/TabProjuris.tsx` | Reescrever como wrapper com 4 sub-tabs |
| `src/components/monitoramento/projuris/ProjurisVisaoStatus.tsx` | Criar — migra lógica atual + priorização |
| `src/components/monitoramento/projuris/ProjurisParadosAssinatura.tsx` | Criar |
| `src/components/monitoramento/projuris/ProjurisFluxoAprovacoes.tsx` | Criar |
| `src/components/monitoramento/projuris/ProjurisCompliance.tsx` | Criar |

Nenhuma alteração de banco de dados necessária.

