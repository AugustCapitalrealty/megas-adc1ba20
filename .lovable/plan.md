## Objetivo

Adicionar um **detalhamento de auditoria** dentro da "Fatura Cliente" (aba Faturas → cartão por cliente) explicando passo-a-passo como cada valor de **CONSUMO (Ponta / Fora Ponta / Bandeira)** foi calculado. Esse bloco fica visível **somente no admin** (escondido em `print:hidden`) — quando a fatura for entregue ao cliente final (PDF/impressão), ele não aparece.

Motivo: o usuário desconfia que a tarifa exibida (ex.: Ponta `R$ 2,210998`) pode estar inconsistente porque ela é **derivada** (`R$ exibido ÷ kWh exibido`) e embute perdas — não é a tarifa pura da Copel. Mostrar a decomposição permite validar rapidamente.

## O que aparece no bloco

Card colapsável (`<details>`), título "🔍 Memória do cálculo de consumo (visível só no admin)", colocado **logo abaixo da tabela DEMANDA + CONSUMO** com classe `print:hidden`. Para cada linha de consumo:

**Ponta**
```text
Consumo medido (Σ módulos)  : 500,00 kWh
(+) Perdas rateadas         :  10,81 kWh
(=) Consumo exibido         : 510,81 kWh

Tarifa TE Ponta (Copel)     : R$ 1,xxxxxx
(+) Tarifa TUSD Ponta       : R$ 0,xxxxxx
(=) Tarifa base             : R$ 2,xxxxxx

R$ consumo base (Σ rs_ponta)         : R$ 1.xxx,xx
(+) R$ perdas (te+tusd ponta)        : R$    xx,xx
(=) R$ exibido                       : R$ 1.129,39

Tarifa efetiva exibida = R$ exibido / kWh exibido = R$ 2,210998
```

Mesma estrutura para **Fora Ponta**.

**Bandeira**: apenas `Σ bandeira_total` por módulo (já vem cru, sem derivação) — útil para confirmar de onde vêm os R$ 0,00.

**Aviso final** dentro do bloco: "A tarifa exibida na fatura do cliente é *derivada* (R$/kWh com perdas embutidas). Diferenças mínimas vs. a tarifa Copel pura são esperadas — vêm do rateio de perdas técnicas."

## Onde editar

`src/components/admin/energia/FaturasTab.tsx` — função `FaturaClienteCard` (linhas ~440–570). Todas as variáveis necessárias (`consumoPonta`, `perdasPontaKwh`, `rsPonta`, `rsPerdasPonta`, `tarifaPontaExibida`, `tarifas.te_ponta`, `tarifas.tusd_ponta`, etc.) **já existem no escopo**. É só renderizar.

## Detalhes técnicos

- Usar `<details className="print:hidden ...">` com `<summary>` estilizado (sem JS extra).
- Layout: tabela 2 colunas (label/valor) com `tabular-nums`, agrupada por linha de consumo.
- Não altera nenhum cálculo nem persistência — puramente visual/diagnóstico.
- Não toca em `FaturaCopelTab`, engine `energia-rateio.ts` nem banco.

## Fora de escopo

- Não muda a fatura impressa do cliente.
- Não muda fórmulas.
- Não adiciona nova aba/rota.