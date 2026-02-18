
# Melhorias Profissionais nos Dashboards

## 1. Tooltips de Explicacao nos KPIs

Cada indicador (KPI card) recebera um icone de informacao (circled "i") no canto superior. Ao passar o mouse, aparece um tooltip explicando como o calculo funciona.

### Exemplos de textos:

| KPI | Tooltip |
|---|---|
| Lead Time Medio | "Media de dias uteis entre a criacao da solicitacao e o upload do documento de OC/AC pelo backoffice. Exclui fins de semana e feriados." |
| Resolucao Same-Day | "Percentual de solicitacoes onde a OC foi emitida no mesmo dia calendario da criacao." |
| Backlog Critico | "Solicitacoes abertas ha mais de 15 dias uteis sem documento de OC emitido. Exclui concluidas, rejeitadas e canceladas." |
| Vazao | "Total de OCs/ACs emitidas (documentos uploadados) no periodo filtrado." |
| Taxa de Retrabalho | "Percentual de solicitacoes que foram devolvidas ao solicitante para correcao antes da emissao da OC." |

Tambem sera aplicado no Dashboard SLA (Total, No Prazo, Atencao, Estourado, Tempo Medio).

---

## 2. Links Diretos nas Tabelas de Drill-down

Atualmente, o protocolo na tabela de detalhamento e apenas texto. A melhoria transforma o protocolo em um link clicavel que navega diretamente para a solicitacao correspondente.

- **Dashboard Eficiencia**: Coluna "Protocolo" vira link que navega para `/minhas-solicitacoes?search=PROTOCOLO`
- **Dashboard SLA**: Coluna "Protocolo" ja tem click na row, mas adicionaremos um botao explicito "Abrir" ou icone de link externo para tornar mais obvio

---

## 3. Feriados de 16 e 17 de Fevereiro

Inserir na tabela `feriados`:
- `2026-02-16` - Carnaval (Ponto Facultativo)
- `2026-02-17` - Carnaval (Ponto Facultativo)

Isso afeta automaticamente todos os calculos de dias uteis nos dashboards de SLA e Eficiencia.

---

## Secao Tecnica

### Arquivos modificados

| Arquivo | Acao |
|---|---|
| `src/pages/DashboardEficiencia.tsx` | Adicionar icones Info com Tooltip em cada KPI card e cards de indicadores; protocolo clicavel na tabela |
| `src/pages/DashboardSLA.tsx` | Adicionar tooltips nos 5 stat cards; protocolo clicavel na tabela |
| Migration SQL | INSERT dos 2 feriados de fevereiro 2026 |

### Implementacao dos Tooltips

Usaremos o componente `Tooltip` ja existente (`@/components/ui/tooltip`). Cada KPI card recebera:

```text
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>
      <Info className="h-3.5 w-3.5 text-muted-foreground" />
    </TooltipTrigger>
    <TooltipContent>
      <p className="max-w-[250px] text-xs">Texto explicativo...</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Implementacao do Link Direto

Na tabela de drill-down do Dashboard Eficiencia, o protocolo sera envolvido em um botao que navega:

```text
onClick={() => navigate(`/minhas-solicitacoes?search=${entry.protocolo}`)}
```

No Dashboard SLA, sera adicionado um icone de link externo na celula do protocolo com a mesma navegacao.

### Migration SQL

```sql
INSERT INTO feriados (data, descricao) VALUES
  ('2026-02-16', 'Carnaval (Ponto Facultativo)'),
  ('2026-02-17', 'Carnaval (Ponto Facultativo)');
```
