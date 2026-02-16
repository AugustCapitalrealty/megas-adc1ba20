
# Reformulacao do Dashboard de Eficiencia

## O que muda (e por que)

### Marco do Lead Time: Correcao Critica

**Hoje (errado):** Usa o evento `numero_fluig_adicionado` do historico como "data da OC". Isso marca quando o backoffice digitou o numero Fluig, nao quando efetivamente emitiu a OC.

**Correcao:** Usar a tabela `documentos_emitidos` (coluna `created_at`), que registra o exato momento em que o backoffice fez upload do PDF da OC/AC. Existem 96 registros nessa tabela, com dados confiáveis.

### Calculo em Dias Uteis

**Hoje (errado):** Usa `differenceInCalendarDays` (dias corridos).

**Correcao:** Calcular usando dias uteis, excluindo sabados, domingos e feriados da tabela `feriados` ja existente no banco.

---

## Os 4 KPIs Reformulados

| KPI | O que mede | Como calcula |
|---|---|---|
| **Lead Time Medio** | Tempo total do processo ponta-a-ponta | Media de dias uteis entre `solicitacoes.created_at` e `documentos_emitidos.created_at` |
| **% Same-Day** | Eficiencia imediata | % de solicitacoes onde a OC foi emitida no mesmo dia calendario da criacao |
| **Backlog Critico** | Risco operacional | Solicitacoes abertas ha mais de 15 dias uteis sem documento de OC emitido (exclui concluidas/rejeitadas/canceladas) |
| **Vazao (Throughput)** | Capacidade do time | Total de OCs emitidas (documentos uploadados) no periodo filtrado |

---

## Novos Indicadores Solicitados

### Lead Time por Empreendimento
- Barra horizontal comparando a media de dias uteis de cada empreendimento (Curitiba, Itajai, Esteio)
- Permite identificar qual unidade tem processo mais rapido ou mais lento

### Taxa de Retrabalho
- % de solicitacoes que foram devolvidas para correcao (`status_novo = 'pendente_correcao'` no historico)
- Numero absoluto e percentual
- Mostra quantas vezes o solicitante errou e gerou retrabalho no processo

### Tempo em Cada Etapa
- Grafico de barras empilhadas mostrando quanto tempo (dias uteis) a solicitacao ficou em cada status:
  - "Recebido/Em Analise" (fila do backoffice)
  - "Pendente Correcao" (com o solicitante)
  - "Aprovacao" (aguardando aprovadores)
  - "Em Processamento" (gerando OC)
- Calculado a partir das transicoes de status no `historico_solicitacoes`

### Top Solicitantes / Fornecedores
- Ranking dos 10 maiores solicitantes por volume de pedidos
- Ranking dos 10 fornecedores mais frequentes
- Ajuda a identificar concentracao e padroes de compra

---

## Graficos Existentes (Ajustados)

### Histograma de Dispersao
- Mesmo conceito, porem recalculado com dias uteis e usando `documentos_emitidos.created_at`
- Faixas: 0d, 1-2d, 3-5d, 6-10d, 11-15d, 15d+

### Evolucao Semanal (Year-over-Year)
- Linha com media semanal de lead time em dias uteis
- Checkbox para comparar com ano anterior (2025 vs 2026)

---

## Secao Tecnica

### Arquivo: `src/hooks/useEficienciaDashboard.ts` (reescrever)

**Mudancas principais:**

1. **Fonte de dados do marco final:** Trocar de `historico_solicitacoes` (evento `numero_fluig_adicionado`) para `documentos_emitidos` (coluna `created_at`)
2. **Calculo de dias uteis:** Carregar feriados da tabela `feriados` e implementar funcao `calcularDiasUteis(dataInicio, dataFim, feriados)` que exclui sabados, domingos e feriados
3. **Novas queries:**
   - Taxa de retrabalho: contar eventos com `status_novo = 'pendente_correcao'` no historico
   - Tempo por etapa: agrupar transicoes de status e calcular duracao entre cada par
   - Top solicitantes: agrupar por `user_id` e buscar nomes do perfil
   - Top fornecedores: agrupar por `fornecedor_id` e buscar `razao_social`

### Arquivo: `src/pages/DashboardEficiencia.tsx` (expandir)

**Novas secoes visuais:**
- Secao de comparativo por empreendimento (horizontal bar chart)
- Card de taxa de retrabalho com percentual e tendencia
- Grafico de tempo por etapa (stacked bar)
- Tabelas de ranking (top solicitantes e fornecedores)
- Ajustar tabela de drill-down para mostrar "Tempo Decorrido" em dias uteis

### Funcao utilitaria: calculo de dias uteis

```text
calcularDiasUteis(inicio, fim, feriados[]):
  para cada dia entre inicio e fim:
    se nao e sabado, domingo, nem feriado:
      incrementar contador
  retornar contador
```

Esta funcao sera usada tanto no hook de eficiencia quanto pode ser reaproveitada no SLA.

### Resumo de Arquivos

| Arquivo | Acao |
|---|---|
| `src/hooks/useEficienciaDashboard.ts` | Reescrever: nova fonte de dados, dias uteis, novos indicadores |
| `src/pages/DashboardEficiencia.tsx` | Expandir: novos graficos e secoes |
| `src/lib/business-days.ts` (novo) | Funcao utilitaria para calculo de dias uteis |
