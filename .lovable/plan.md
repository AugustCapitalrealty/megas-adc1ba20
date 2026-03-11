

## Duas Melhorias

### 1. Aumentar o modal de Anexos

O modal atual usa `max-w-lg` (~512px), causando a barra de rolagem horizontal visível na imagem. A correção é simples:

| Arquivo | Mudança |
|---------|---------|
| `src/components/solicitante/SolicitanteModals.tsx` (linha 994) | `max-w-lg` → `max-w-2xl` |

Isso dará ~672px de largura, eliminando a barra horizontal e mostrando os nomes dos arquivos por completo.

---

### 2. SLA em Fluxo de Correção com Fluig

Analisei a função `calcular_sla_solicitacao` atual. Eis o comportamento **atual**:

```text
Fluxo normal:
  Criação              → SLA inicia
  Fluig registrado     → SLA para ✓

Fluxo com correção (já tem Fluig):
  Vai pra correção     → SLA para, acumula tempo
  Solicitante responde → SLA ZERA e reinicia do zero
  Backoffice assume    → SLA conta (já estava contando)
  Backoffice atualiza Fluig (atualizacao_fluig) → SLA para ✓
  Volta pra aprovação (em_processamento)        → SLA para ✓
```

**Ou seja**: quando uma solicitação com Fluig vai pra correção e volta, o SLA **zera** (começa do zero) e conta até o backoffice atualizar o Fluig ou marcar como em aprovação. O tempo do ciclo anterior é descartado.

**Isso parece correto** — o backoffice tem um novo prazo de 3 dias para processar a correção no Fluig. A meta do SLA não é afetada pelo ciclo anterior.

**Pergunta**: esse comportamento está correto para vocês? Ou o SLA deveria **acumular** (somar o tempo do ciclo anterior + novo ciclo)? Atualmente ele zera propositalmente.

Se o comportamento está correto, a única mudança necessária é o tamanho do modal de anexos.

