## Objetivo

Reorganizar a tela **Faturas por Cliente** (`src/components/admin/energia/FaturasTab.tsx`) para ficar direta: três números no topo (Copel, Energy, Diferença), multas logo abaixo, e a Área Comum visível na lista de clientes.

## 1. Topo enxuto — 3 blocos

Substituir os 4 KPIs atuais + os blocos "Passo 1 / Passo 2 / Conta final" por uma faixa única:

```text
┌ FATURA COPEL ──┐   ┌ FATURA ENERGY ─┐   ┌ DIFERENÇA ─────┐
│ R$ 316.407,05  │ → │ R$ 316.801,68  │ = │ R$ 394,63      │
│ valor da conta │   │ 21 clientes    │   │ a maior        │
└────────────────┘   └────────────────┘   └────────────────┘
```

- **Fatura Copel**: `copel_valor_total`.
- **Fatura Energy**: soma das faturas dos clientes (`totalGeral`), com o nº de clientes como subtítulo.
- **Diferença**: `Energy − Copel`, colorida (verde < R$ 1, âmbar < R$ 50, vermelho acima).
- Logo abaixo da Diferença, uma linha discreta: `bruta 394,63 − multa 6.296,57 − créd/déb 2,87 = residual −5.904,81`, com um "ver detalhe" que abre o passo a passo atual (mantido, mas fechado por padrão em vez de dominar a tela).
- Os toggles (modo de perdas, área comum) e o Exportar CSV viram uma barra fina acima dos três blocos.

## 2. Abaixo da Fatura Energy: multas e clientes

Ordem vertical passa a ser:

1. Faixa Copel · Energy · Diferença
2. **Multas de ultrapassagem** — tabela já existente, agora sempre visível (não mais aninhada dentro do bloco de diferenças), com total de kW e R$; se não houver multa, uma linha curta "Nenhuma ultrapassagem nesta competência".
3. **Clientes** — sidebar + fatura detalhada, como hoje.

## 3. Área Comum na lista de clientes

Hoje, com "Ratear por m²" ligado, `redistribuirAreaComumPorArea` remove o bucket `AREA_COMUM` e ele desaparece da lista.

Mudança:

- Calcular e guardar o bucket da Área Comum **antes** da redistribuição.
- Exibi-lo sempre na lista de clientes, no fim, com selo **"rateada por m²"** quando o modo de rateio estiver ativo (ou sem selo, como cliente normal, no modo "Separada").
- No modo rateado, a linha é informativa: mostra o valor bruto da Área Comum e **não** entra no somatório "Fatura Energy" (evita contagem dupla) — indicado por um texto curto "já distribuída nos clientes acima".
- Ao selecioná-la, abre a fatura detalhada normal da Área Comum (consumo, perdas, impostos, crédito fotovoltaico).

## Detalhes técnicos

- Alterações concentradas em `FaturasTab.tsx` (apresentação): novo layout do header, extração do bucket `AREA_COMUM` do resultado de `agruparPorCliente` antes de `redistribuirAreaComumPorArea`, e inclusão dele em `faturasFiltradas`/sidebar com flag `informativa`.
- `totalGeral`, `totalUltrapassagem`, `totalCredito` continuam somando apenas as faturas efetivas (exclui a Área Comum informativa).
- Nenhuma mudança em `src/lib/energia-rateio.ts` nem no banco.
