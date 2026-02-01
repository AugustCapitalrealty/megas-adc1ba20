

## Plano de Correção: Fluxo Jurídico AC vs OC

Este plano corrige 3 problemas identificados na implementação do fluxo jurídico:

---

## Problemas Identificados

### 1. Step de Natureza do Serviço não aparece para valores < R$10k
**Causa**: A lógica atual exige `valorNumerico >= 10000` OU checkboxes já marcados para exibir o step. Isso cria um ciclo: o usuário não pode marcar os checkboxes sem ver o step.

**Impacto**: Serviços com risco (altura, fossa, obra civil) com valor < R$10k não ativam o fluxo jurídico.

### 2. AC com "Material de Consumo" sendo tratado como isento de anexos
**Causa**: A lógica usa `NATUREZAS_ISENTAS_ANEXOS` (que inclui `material_consumo`) para ambos OC e AC.

**Regra correta**: Isenção de anexos é APENAS para OC. AC NUNCA é isento.

### 3. Campo de escopo detalhado não reabre quando backoffice solicita ajuste de minuta
**Causa**: O modal de edição em MinhasSolicitacoes não inclui o campo `escopo_detalhado_minuta`.

---

## Solução Proposta

### Correção 1: Exibir Step Natureza para TODO AC (tipo servicos)

Alterar a lógica em `NovaSolicitacao.tsx`:

**Antes:**
```typescript
const showNaturezaServicoStep = isAC && (
  valorNumerico >= 10000 || 
  naturezaObraCivil || naturezaAlturaRisco || naturezaFossaFiltro || naturezaPrecoVariavel
);
```

**Depois:**
```typescript
// Step natureza_servico: exibir para TODO AC (servicos), pois gatilhos de risco 
// se aplicam independente do valor
const showNaturezaServicoStep = isAC;
```

Isso garante que:
- Qualquer AC (tipo servicos) verá os checkboxes de risco
- Mesmo com valor < R$10k, se marcar risco, ativa fluxo jurídico
- A opção "Nenhuma das opções acima" permite seguir fluxo simplificado

---

### Correção 2: Separar Isenção de Anexos para OC vs AC

A regra de negócio é clara:
- **OC**: Isento de fluxo jurídico E pode ser isento de alguns anexos conforme natureza
- **AC**: NUNCA isento de anexos, independente da natureza orçamentária

Alterar a função `getRequiredAttachments()` em `NovaSolicitacao.tsx`:

**Antes:**
```typescript
} else if (isAC) {
  if (!isNaturezaIsenta) {
    // ... anexos obrigatórios
  }
}
```

**Depois:**
```typescript
} else if (isAC) {
  // AC NUNCA é isento de anexos - remover verificação de isNaturezaIsenta
  if (emergencial) {
    // ... anexos emergenciais
  } else {
    // ... anexos padrão AC
  }
}
```

Também remover a isenção de 3 CNPJs para "naturezas isentas":

**Antes:**
```typescript
const requires3CNPJs = isAC && !emergencial && !isNaturezaIsenta;
```

**Depois:**
```typescript
const requires3CNPJs = isAC && !emergencial;
```

---

### Correção 3: Adicionar Campo de Escopo Detalhado ao Modal de Edição

Quando o solicitante precisa corrigir uma solicitação que requer escopo detalhado (status `aguardando_informacoes` ou `pendente_correcao`), o campo deve aparecer no modal.

Adicionar ao modal de edição em `MinhasSolicitacoes.tsx`:

1. Novo estado para o campo:
```typescript
const [editEscopoDetalhado, setEditEscopoDetalhado] = useState('');
```

2. Carregar valor atual ao abrir modal:
```typescript
setEditEscopoDetalhado((sol as any).escopo_detalhado_minuta || '');
```

3. Adicionar campo no modal quando aplicável:
```typescript
{editingSolicitacao?.instrumento_juridico && 
 editingSolicitacao.instrumento_juridico !== 'oc' && (
  <div className="space-y-2">
    <Label>Escopo Detalhado para Minuta</Label>
    <Textarea
      value={editEscopoDetalhado}
      onChange={(e) => setEditEscopoDetalhado(e.target.value)}
      placeholder="Descreva etapas, prazos, materiais..."
      rows={5}
    />
    <span className="text-xs text-muted-foreground">
      {editEscopoDetalhado.length}/100 caracteres mínimos
    </span>
  </div>
)}
```

4. Salvar na atualização:
```typescript
updateData.escopo_detalhado_minuta = editEscopoDetalhado.trim() || null;
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/NovaSolicitacao.tsx` | Lógica showNaturezaServicoStep, getRequiredAttachments, requires3CNPJs |
| `src/pages/MinhasSolicitacoes.tsx` | Campo escopo detalhado no modal de edição |

---

## Resumo das Mudanças

```text
┌─────────────────────────────────────────────────────────────────┐
│  ANTES (Bugado)                                                 │
│                                                                 │
│  ● Step Natureza só aparece se valor >= R$10k                   │
│    → Impossível marcar riscos para valores menores              │
│                                                                 │
│  ● AC "Material Consumo" isento de anexos                       │
│    → Violava regra: AC NUNCA isento                             │
│                                                                 │
│  ● Escopo não reabre para correção                              │
│    → Solicitante não conseguia ajustar minuta                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  DEPOIS (Corrigido)                                             │
│                                                                 │
│  ● Step Natureza aparece para TODO tipo AC (servicos)           │
│    → Usuário sempre pode indicar riscos                         │
│    → Opção "Nenhuma das opções" para fluxo simplificado         │
│                                                                 │
│  ● AC sempre exige anexos (independente de natureza)            │
│    → Apenas OC pode ser isento conforme natureza                │
│                                                                 │
│  ● Modal de correção inclui campo de escopo                     │
│    → Solicitante pode ajustar minuta quando pedido              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Impacto

**Para o Solicitante:**
- Ao criar solicitação AC, sempre verá os checkboxes de natureza do serviço
- Pode indicar riscos mesmo com valor baixo (< R$10k)
- AC com "Material de Consumo" agora exige anexos corretamente
- Pode corrigir escopo detalhado quando backoffice solicita ajuste

**Para o Backoffice:**
- Receberá solicitações com classificação jurídica mais precisa
- Menos retrabalho por classificações incorretas
- Ciclo de ajuste de minuta funcional

