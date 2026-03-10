

## Corrigir SLA: `atualizacao_fluig` e `em_processamento` não param o relógio

### Problema Raiz

Na função `calcular_sla_solicitacao`, o filtro para parar o SLA quando o Fluig é registrado usa:
```sql
IF rec.acao LIKE 'numero_fluig%' THEN ...
```

Isso captura `numero_fluig_adicionado` e `numero_fluig_alterado`, mas **não captura** `atualizacao_fluig` — que é a ação usada quando o backoffice atualiza o número Fluig num segundo ciclo (como no protocolo 2026000195).

Além disso, a transição para `em_processamento` (Em Aprovação) não está sendo tratada como "fim" do SLA.

### Caso Concreto: 2026000195

```text
09/03 12:01 - Solicitante responde     → SLA reinicia do zero ✓
10/03 12:26 - Backoffice assume        → SLA conta ✓
10/03 16:22 - atualizacao_fluig        → SLA DEVERIA PARAR mas continua ✗
```

O SLA mostra 1.5 dias e continua subindo, quando deveria ter parado em ~0.4 dias.

### Correção

**Migration SQL** — Atualizar 2 funções:

#### `calcular_sla_solicitacao`
- Ampliar filtro de Fluig: `rec.acao LIKE 'numero_fluig%' OR rec.acao = 'atualizacao_fluig'`
- Adicionar `em_processamento` como status que para a contagem (backup)

#### `get_sla_timeline`
- Marcar `atualizacao_fluig` como `tipo_evento := 'fim'`
- Marcar transição para `em_processamento` como `tipo_evento := 'fim'`

### Impacto
- Corrige o cálculo para todas as solicitações que passaram por segundo ciclo de Fluig
- O primeiro ciclo (que usa `numero_fluig_adicionado`) permanece inalterado

